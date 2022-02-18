// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  IDataSourceFactory,
  DataSourceFactoryInitializeArgs,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { GlobalVariables } from "@foxglove/studio-base/hooks/useGlobalVariables";
import {
  AdvertiseOptions,
  Player,
  PlayerPresence,
  PlayerState,
  PublishPayload,
  SubscribePayload,
} from "@foxglove/studio-base/players/types";
import McapDataProvider from "@foxglove/studio-base/randomAccessDataProviders/McapDataProvider";

class BenchmarkPlayer implements Player {
  private mcapProvider: McapDataProvider;
  private name: string;
  private listener?: (state: PlayerState) => Promise<void>;
  private subscriptions: SubscribePayload[] = [];

  constructor(name: string, mcapProvider: McapDataProvider) {
    this.name = name;
    this.mcapProvider = mcapProvider;
  }

  setListener(listener: (state: PlayerState) => Promise<void>): void {
    this.listener = listener;
    void this.run();
  }
  close(): void {
    //throw new Error("Method not implemented.");
  }
  setSubscriptions(subscriptions: SubscribePayload[]): void {
    this.subscriptions = subscriptions;
  }
  setPublishers(_publishers: AdvertiseOptions[]): void {
    //throw new Error("Method not implemented.");
  }
  setParameter(_key: string, _value: unknown): void {
    throw new Error("Method not implemented.");
  }
  publish(_request: PublishPayload): void {
    throw new Error("Method not implemented.");
  }
  requestBackfill(): void {
    //throw new Error("Method not implemented.");
  }
  setGlobalVariables(_globalVariables: GlobalVariables): void {
    throw new Error("Method not implemented.");
  }

  private async run() {
    console.log("run");
    console.log(this.subscriptions);
    const listener = this.listener;
    if (!listener) {
      return;
    }

    await listener({
      presence: PlayerPresence.INITIALIZING,
      name: this.name + "\ninitializing provider",
      playerId: this.name,
      capabilities: [],
      progress: {},
    });

    // initialize
    const result = await this.mcapProvider.initialize({
      progressCallback: () => {},
      reportMetadataCallback: () => {},
    });

    await listener({
      presence: PlayerPresence.INITIALIZING,
      name: this.name + "\ngetting messages",
      playerId: this.name,
      capabilities: [],
      progress: {},
    });

    const start = result.start;
    const end = result.end;
    const topics = result.topics;
    const parsedMessageDefinitionsByTopic = {};

    let datatypes = new Map();
    if (result.messageDefinitions.type === "parsed") {
      datatypes = result.messageDefinitions.datatypes;
    }

    const subscriberTopics = this.subscriptions.map((sub) => sub.topic);

    // state is initializing, name should say we are loading the messages
    const { parsedMessages, problems } = await this.mcapProvider.getMessages(start, end, {
      parsedMessages: subscriberTopics,
    });
    if (problems) {
      throw new Error(problems.reduce((prev, prob) => `${prev}, ${prob.message}`, ""));
    }

    if (!parsedMessages) {
      throw new Error("no messages");
    }

    console.log(`emitting ${parsedMessages.length} messages`);

    performance.mark("message-emit-start");

    // we have messages - now we should emit them one by one
    for (const message of parsedMessages) {
      await listener({
        presence: PlayerPresence.PRESENT,
        name: this.name,
        playerId: this.name,
        capabilities: [],
        progress: {},
        activeData: {
          messages: [message],
          totalBytesReceived: 0,
          messageOrder: "receiveTime",
          startTime: start,
          endTime: end,
          currentTime: message.receiveTime,
          isPlaying: true,
          speed: 1,
          lastSeekTime: 1,
          topics,
          datatypes,
          parsedMessageDefinitionsByTopic,
        },
      });
    }

    performance.mark("message-emit-end");
    performance.measure("message-emit", "message-emit-start", "message-emit-end");
  }
}

class McapLocalBenchmarkDataSourceFactory implements IDataSourceFactory {
  id = "mcap-local-file";
  type: IDataSourceFactory["type"] = "file";
  displayName = "MCAP";
  iconName: IDataSourceFactory["iconName"] = "OpenFile";
  supportedFileTypes = [".mcap"];

  initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const file = args.file;
    if (!file) {
      return;
    }

    const mcapProvider = new McapDataProvider({ file });
    return new BenchmarkPlayer(file.name, mcapProvider);
  }
}

export default McapLocalBenchmarkDataSourceFactory;
