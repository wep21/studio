// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { simplify } from "intervals-fn";
import { v4 as uuidv4 } from "uuid";

import { filterMap } from "@foxglove/den/collection";
import Log from "@foxglove/log";
import {
  Time,
  add,
  compare,
  clampTime,
  fromMillis,
  fromNanoSec,
  toNanoSec,
  subtract as subtractTimes,
} from "@foxglove/rostime";
import { MessageEvent, ParameterValue } from "@foxglove/studio";
import NoopMetricsCollector from "@foxglove/studio-base/players/NoopMetricsCollector";
import PlayerProblemManager from "@foxglove/studio-base/players/PlayerProblemManager";
import {
  AdvertiseOptions,
  Player,
  PlayerMetricsCollectorInterface,
  PlayerState,
  Progress,
  PublishPayload,
  SubscribePayload,
  Topic,
  PlayerPresence,
  PlayerCapabilities,
  MessageBlock,
} from "@foxglove/studio-base/players/types";
import { RosDatatypes } from "@foxglove/studio-base/types/RosDatatypes";
import delay from "@foxglove/studio-base/util/delay";
import { SEEK_ON_START_NS, TimestampMethod } from "@foxglove/studio-base/util/time";

import { IIterableSource, IteratorResult } from "./IIterableSource";

const log = Log.getLogger(__filename);

// Number of bytes that we aim to keep in the cache.
// Setting this to higher than 1.5GB caused the renderer process to crash on linux.
// See: https://github.com/foxglove/studio/pull/1733
const DEFAULT_CACHE_SIZE_BYTES = 1.0e9;

// Amount to wait until panels have had the chance to subscribe to topics before
// we start playback
const SEEK_START_DELAY_MS = 100;

// Messages are laid out in blocks with a fixed number of milliseconds.
const MIN_MEM_CACHE_BLOCK_SIZE_NS = 0.1e9;

// Original comment from webviz:
// Preloading algorithms slow when there are too many blocks.
// Adaptive block sizing is simpler than using a tree structure for immutable updates but
// less flexible, so we may want to move away from a single-level block structure in the future.
const MAX_BLOCKS = 400;

type IterablePlayerOptions = {
  metricsCollector?: PlayerMetricsCollectorInterface;

  source: IIterableSource;

  // Optional player name
  name?: string;

  // Optional set of key/values to store with url handling
  urlParams?: Record<string, string>;

  isSampleDataSource?: boolean;

  // Set to _false_ to disable preloading. (default: true)
  enablePreload?: boolean;
};

type IterablePlayerState =
  | "preinit"
  | "initialize"
  | "start-delay"
  | "start-play"
  | "idle"
  | "seek-backfill"
  | "play";

/**
 * IterablePlayer implements the Player interface for IIterableSource instances.
 */
export class IterablePlayer implements Player {
  private _urlParams?: Record<string, string>;
  private _name?: string;
  private _filePath?: string;
  private _nextState?: IterablePlayerState;
  private _state: IterablePlayerState = "preinit";
  private _runningState: boolean = false;

  private _isPlaying: boolean = false;
  private _listener?: (playerState: PlayerState) => Promise<void>;
  private _speed: number = 1.0;
  private _start: Time = { sec: 0, nsec: 0 };
  private _end: Time = { sec: 0, nsec: 0 };
  private _enablePreload = true;

  // next read start time indicates where to start reading for the next tick
  // after a tick read, it is set to 1nsec past the end of the read operation (preparing for the next tick)
  private _lastTickMillis?: number;
  // This is the "lastSeekTime" emitted in the playerState. This indicates the emit is due to a seek.
  private _lastSeekEmitTime: number = Date.now();

  private _providerTopics: Topic[] = [];
  private _providerDatatypes: RosDatatypes = new Map();

  private _capabilities: string[] = [
    PlayerCapabilities.setSpeed,
    PlayerCapabilities.playbackControl,
  ];
  private _metricsCollector: PlayerMetricsCollectorInterface;
  private _subscriptions: SubscribePayload[] = [];

  private _progress: Progress = {};
  private _id: string = uuidv4();
  private _messages: MessageEvent<unknown>[] = [];
  private _receivedBytes: number = 0;
  private _messageOrder: TimestampMethod = "receiveTime";
  private _hasError = false;
  private _lastRangeMillis?: number;
  private _closed: boolean = false;
  private _lastMessage?: MessageEvent<unknown>;
  private _publishedTopics = new Map<string, Set<string>>();
  private _seekTarget?: Time;

  // To keep reference equality for downstream user memoization cache the currentTime provided in the last activeData update
  // See additional comments below where _currentTime is set
  private _currentTime?: Time;

  private _problemManager = new PlayerProblemManager();

  // Blocks is a sparse array of MessageBlock.
  private _blocks: (MessageBlock | undefined)[] = [];
  private _blockDurationNanos: number = 0;

  private _iterableSource: IIterableSource;
  private _forwardIterator?: AsyncIterator<Readonly<IteratorResult>>;

  constructor(options: IterablePlayerOptions) {
    const { metricsCollector, urlParams, source, name, enablePreload } = options;

    this._iterableSource = source;
    this._name = name;
    this._urlParams = urlParams;
    this._metricsCollector = metricsCollector ?? new NoopMetricsCollector();
    this._metricsCollector.playerConstructed();
    this._enablePreload = enablePreload ?? true;
  }

  private _setError(message: string, error?: Error): void {
    this._hasError = true;
    this._problemManager.addProblem("global-error", {
      severity: "error",
      message,
      error,
    });
    this._isPlaying = false;
  }

  setListener(listener: (playerState: PlayerState) => Promise<void>): void {
    if (this._listener) {
      throw new Error("Cannot setListener again");
    }
    this._listener = listener;
    this._setState("initialize");
  }

  private async _stateInitialize(): Promise<void> {
    // emit state indicating start of initialization
    await this._emitState();

    try {
      const { start, end, topics, problems, publishersByTopic, datatypes, blockDurationNanos } =
        await this._iterableSource.initialize();

      this._start = this._currentTime = start;
      this._end = end;
      this._publishedTopics = publishersByTopic;
      this._providerDatatypes = datatypes;

      // Studio does not like duplicate topics or topics with different datatypes
      // Check for duplicates or for miss-matched datatypes
      const uniqueTopics = new Map<string, Topic>();
      for (const topic of topics) {
        const existingTopic = uniqueTopics.get(topic.name);
        if (existingTopic) {
          problems.push({
            severity: "warn",
            message: `Duplicate topic: ${topic.name}`,
          });
          continue;
        }

        uniqueTopics.set(topic.name, topic);
      }

      this._providerTopics = Array.from(uniqueTopics.values());

      let idx = 0;
      for (const problem of problems) {
        this._problemManager.addProblem(`init-problem-${idx}`, problem);
        idx += 1;
      }

      // --- setup blocks
      const totalNs = Number(toNanoSec(subtractTimes(this._end, this._start))) + 1; // +1 since times are inclusive.
      if (totalNs > Number.MAX_SAFE_INTEGER * 0.9) {
        throw new Error("Time range is too long to be supported");
      }

      this._blockDurationNanos = Math.ceil(
        Math.max(MIN_MEM_CACHE_BLOCK_SIZE_NS, totalNs / MAX_BLOCKS),
      );

      if (blockDurationNanos != undefined) {
        this._blockDurationNanos = blockDurationNanos;
      }

      const blockCount = Math.ceil(totalNs / this._blockDurationNanos);

      log.debug(`Block count: ${blockCount}`);

      this._blocks = Array.from({ length: blockCount });
    } catch (error) {
      this._setError(`Error initializing: ${error.message}`, error);
    }

    await this._emitState();
    if (!this._hasError) {
      this._setState("start-delay");
    }
  }

  // Wait a bit until panels have had the chance to subscribe to topics before we start
  // playback.
  private async _stateStartDelay() {
    await new Promise((resolve) => setTimeout(resolve, SEEK_START_DELAY_MS));
    if (this._closed || this._nextState) {
      return;
    }

    this._setState("start-play");
  }

  private async _stateStartPlay() {
    const topics = new Set(this._subscriptions.map((subscription) => subscription.topic));

    this._forwardIterator = this._iterableSource.messageIterator({
      topics: Array.from(topics),
    });

    const stopTime = clampTime(
      add(this._start, fromNanoSec(SEEK_ON_START_NS)),
      this._start,
      this._end,
    );

    this._lastMessage = undefined;
    this._messages = [];

    const messageEvents: MessageEvent<unknown>[] = [];
    for (;;) {
      const result = await this._forwardIterator.next();
      if (result.done === true) {
        break;
      }
      const iterResult = result.value;
      // Bail if a new state is requested while we are loading messages
      // This usually happens when seeking before the initial load is complete
      if (this._nextState) {
        log.info("Exit startPlay for new state");
        return;
      }

      if (iterResult.problem) {
        this._problemManager.addProblem(`connid-${iterResult.connectionId}`, iterResult.problem);
        continue;
      }

      if (compare(iterResult.msgEvent.receiveTime, stopTime) > 0) {
        this._lastMessage = iterResult.msgEvent;
        break;
      }

      messageEvents.push(iterResult.msgEvent);
    }

    this._currentTime = stopTime;
    this._messages = messageEvents;
    await this._emitState();
    if (this._nextState) {
      return;
    }
    this._setState("idle");
  }

  private async _stateSeekBackfill() {
    const targetTime = this._seekTarget;
    if (!targetTime) {
      return;
    }

    this._lastMessage = undefined;
    this._seekTarget = undefined;

    const topics = Array.from(
      new Set(this._subscriptions.map((subscription) => subscription.topic)),
    );

    const messages = await this._iterableSource.getBackfillMessages({ topics, time: targetTime });

    // Our backfill loaded the messages inclusive of the seek time, thus the next messages
    // we read should be _after_ the seek time.
    const forwardPosition = add(targetTime, { sec: 0, nsec: 1 });
    await this._forwardIterator?.return?.();
    this._forwardIterator = this._iterableSource.messageIterator({
      topics: Array.from(topics),
      start: forwardPosition,
    });

    this._messages = messages;
    this._currentTime = targetTime;
    this._lastSeekEmitTime = Date.now();
    await this._emitState();
    if (this._nextState) {
      return;
    }
    this._setState(this._isPlaying ? "play" : "idle");
  }

  private _setState(newState: IterablePlayerState) {
    log.debug(`Set next state: ${newState}`);
    this._nextState = newState;
    void this._runState();
  }

  private async _runState() {
    if (this._runningState) {
      return;
    }

    this._runningState = true;
    try {
      while (this._nextState) {
        const state = (this._state = this._nextState);
        this._nextState = undefined;

        log.debug(`Start state: ${state}`);

        switch (state) {
          case "preinit":
            await this._emitState();
            break;
          case "initialize":
            await this._stateInitialize();
            break;
          case "start-delay":
            await this._stateStartDelay();
            break;
          case "start-play":
            await this._stateStartPlay();
            break;
          case "idle":
            await this._stateIdle();
            break;
          case "seek-backfill":
            await this._stateSeekBackfill();
            break;
          case "play": {
            await this._statePlay();
            break;
          }
        }

        log.debug(`Done state ${state}`);
      }
    } catch (err) {
      log.error(err);
      this._setError((err as Error).message, err);
      await this._emitState();
    } finally {
      this._runningState = false;
    }
  }

  private async _emitState() {
    if (!this._listener) {
      return undefined;
    }

    if (this._hasError) {
      return await this._listener({
        name: this._name,
        filePath: this._filePath,
        presence: PlayerPresence.ERROR,
        progress: {},
        capabilities: this._capabilities,
        playerId: this._id,
        activeData: undefined,
        problems: this._problemManager.problems(),
      });
    }

    const messages = this._messages;
    this._messages = [];

    const currentTime = this._currentTime ?? this._start;
    const isInitalizing =
      this._state === "preinit" || this._state === "initialize" || this._state === "start-delay";

    const data: PlayerState = {
      name: this._name,
      filePath: this._filePath,
      presence: isInitalizing ? PlayerPresence.INITIALIZING : PlayerPresence.PRESENT,
      progress: this._progress,
      capabilities: this._capabilities,
      playerId: this._id,
      problems: this._problemManager.problems(),
      activeData: {
        messages,
        totalBytesReceived: this._receivedBytes,
        messageOrder: this._messageOrder,
        currentTime,
        startTime: this._start,
        endTime: this._end,
        isPlaying: this._isPlaying,
        speed: this._speed,
        lastSeekTime: this._lastSeekEmitTime,
        topics: this._providerTopics,
        datatypes: this._providerDatatypes,
        publishedTopics: this._publishedTopics,
      },
      urlState: this._urlParams,
    };

    return await this._listener(data);
  }

  private async _tick(): Promise<void> {
    if (!this._isPlaying) {
      return;
    }

    if (!this._forwardIterator) {
      throw new Error("Tried to play with no forward iterator");
    }

    // compute how long of a time range we want to read by taking into account
    // the time since our last read and how fast we're currently playing back
    const tickTime = performance.now();
    const durationMillis =
      this._lastTickMillis != undefined && this._lastTickMillis !== 0
        ? tickTime - this._lastTickMillis
        : 20;
    this._lastTickMillis = tickTime;

    // Read at most 300ms worth of messages, otherwise things can get out of control if rendering
    // is very slow. Also, smooth over the range that we request, so that a single slow frame won't
    // cause the next frame to also be unnecessarily slow by increasing the frame size.
    let rangeMillis = Math.min(durationMillis * this._speed, 300);
    if (this._lastRangeMillis != undefined) {
      rangeMillis = this._lastRangeMillis * 0.9 + rangeMillis * 0.1;
    }
    this._lastRangeMillis = rangeMillis;

    if (!this._currentTime) {
      throw new Error("Invariant: Tried to play with no current time.");
    }

    // The end time is our current time plus the range we want to read
    const end: Time = clampTime(
      add(this._currentTime, fromMillis(rangeMillis)),
      this._start,
      this._end,
    );

    const msgEvents: MessageEvent<unknown>[] = [];
    if (this._lastMessage) {
      // If the last message we saw is still ahead of the tick time, we don't emit anything
      if (compare(this._lastMessage.receiveTime, end) > 0) {
        this._currentTime = end;
        this._messages = msgEvents;
        await this._emitState();
        return;
      }

      msgEvents.push(this._lastMessage);
      this._lastMessage = undefined;
    }

    for (;;) {
      const result = await this._forwardIterator.next();
      if (result.done === true) {
        break;
      }
      const iterResult = result.value;
      if (iterResult.problem) {
        this._problemManager.addProblem(`connid-${iterResult.connectionId}`, iterResult.problem);
      }

      // State change request during playback
      // eslint disable because typescript doesn't realize isPlaying could change under us
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this._nextState || !this._isPlaying) {
        if (iterResult.msgEvent) {
          this._lastMessage = iterResult.msgEvent;
        }
        return;
      }

      if (iterResult.problem) {
        continue;
      }

      // The message is past the end time, we need to save it for next tick
      if (compare(iterResult.msgEvent.receiveTime, end) > 0) {
        this._lastMessage = iterResult.msgEvent;
        break;
      }

      msgEvents.push(iterResult.msgEvent);
    }

    this._currentTime = end;
    this._messages = msgEvents;
    await this._emitState();
  }

  private async _stateIdle() {
    await this._emitState();
    if (this._currentTime) {
      const start = performance.now();
      await this.loadBlocks(this._currentTime);
      log.info(`Block load took: ${performance.now() - start} ms`);
    }
  }

  private async _statePlay() {
    if (!this._currentTime) {
      throw new Error("Invariant: currentTime not set before statePlay");
    }
    const subscriptions = this._subscriptions;

    const blockLoading = this.loadBlocks(this._currentTime, { emit: false });
    try {
      while (this._isPlaying && !this._hasError && !this._nextState) {
        const start = Date.now();
        await this._tick();

        // If subscriptions changed, update to the new subscriptions
        if (this._subscriptions !== subscriptions) {
          // Discard any last message event since the new iterator will repeat it
          this._lastMessage = undefined;

          const topics = new Set(this._subscriptions.map((sub) => sub.topic));
          await this._forwardIterator?.return?.();
          this._forwardIterator = this._iterableSource.messageIterator({
            topics: Array.from(topics),
            start: this._currentTime,
          });
        }

        // Eslint doesn't understand that this._nextState could change
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
        if (this._nextState) {
          return;
        }

        const time = Date.now() - start;
        // make sure we've slept at least 16 millis or so (aprox 1 frame)
        // to give the UI some time to breathe and not burn in a tight loop
        if (time < 16) {
          await delay(16 - time);
        }
      }
    } catch (err) {
      this._setError((err as Error).message, err);
      await this._emitState();
    } finally {
      await blockLoading;
    }
  }

  private async loadBlocks(time: Time, opt?: { emit: boolean }) {
    if (!this._enablePreload) {
      return;
    }

    // During playback, we let the statePlay method emit state
    // When idle, we can emit state
    const shouldEmit = opt?.emit ?? true;

    let nextEmit = 0;

    log.info("Start block load", time);

    const topics = this._subscriptions
      .filter((sub) => sub.preloadType !== "partial")
      .map((sub) => sub.topic);

    const timeNanos = Number(toNanoSec(subtractTimes(time, this._start)));

    const startBlockId = Math.floor(timeNanos / this._blockDurationNanos);

    // Block caching works on the assumption that we are more likely to want the blocks in proximity
    // to the _time_. This includes blocks ahead and behind the time.
    //
    // We build a _loadQueue_ which is an array of block ids to load. The load queue is
    // organized such that we populate blocks outward from the requested load time. Blocks closest
    // to the load time are loaded and blocks furthest from the load time are eligible for eviction.
    //
    // To build the load queue, two arrays are created. Pre and Post. Pre contains block ids before
    // the desired start block, and post ids after. For the load queue, we reverse pre and alternate
    // selecting ids from post and pre.
    //
    // Example set of block ids: 0, 1, 2, 3, 4, 5, 6, 7
    // Lets say id 2 is the startBlockId
    // Reversed Pre: 1, 0
    // Post: 3, 4, 5, 6, 7
    //
    // Load queue: 2, 3, 1, 4, 0, 5, 6, 7
    //
    // Block ID 2 is considered first for loading and block ID 7 is evictable
    const preIds = [];
    const postIds = [];
    for (let idx = 0; idx < this._blocks.length; ++idx) {
      if (idx < startBlockId) {
        preIds.push(idx);
      } else if (idx > startBlockId) {
        postIds.push(idx);
      }
    }

    preIds.reverse();

    const loadQueue: number[] = [startBlockId];
    while (preIds.length > 0 || postIds.length > 0) {
      const postId = postIds.shift();
      if (postId != undefined) {
        loadQueue.push(postId);
      }
      const preId = preIds.shift();
      if (preId != undefined) {
        loadQueue.push(preId);
      }
    }

    let totalBlockSizeBytes = this._blocks.reduce((prev, block) => {
      if (!block) {
        return prev;
      }

      return prev + block.sizeInBytes;
    }, 0);

    while (loadQueue.length > 0) {
      const idx = loadQueue.shift();
      if (idx == undefined) {
        break;
      }

      const existingBlock = this._blocks[idx];
      const blockTopics = existingBlock ? Object.keys(existingBlock.messagesByTopic) : [];

      const topicsToFetch = new Set(topics);
      for (const topic of blockTopics) {
        topicsToFetch.delete(topic);
      }

      // This block has all the topics
      if (topicsToFetch.size === 0) {
        continue;
      }

      const blockStartTime = add(this._start, fromNanoSec(BigInt(idx * this._blockDurationNanos)));
      const nextBlockStartTime = add(blockStartTime, fromNanoSec(BigInt(this._blockDurationNanos)));

      const iterator = this._iterableSource.messageIterator({
        topics: Array.from(topicsToFetch),
        start: blockStartTime,
      });

      const messagesByTopic: Record<string, MessageEvent<unknown>[]> = {};
      // Set all topic arrays to empty to indicate we've read this topic
      for (const topic of topicsToFetch) {
        messagesByTopic[topic] = [];
      }

      let sizeInBytes = 0;
      for (;;) {
        const result = await iterator.next();
        if (result.done === true) {
          break;
        }
        const iterResult = result.value; // State change requested, bail
        if (this._nextState) {
          return;
        }

        if (iterResult.problem) {
          this._problemManager.addProblem(`connid-${iterResult.connectionId}`, iterResult.problem);
          continue;
        }

        if (compare(iterResult.msgEvent.receiveTime, nextBlockStartTime) >= 0) {
          break;
        }

        const msgTopic = iterResult.msgEvent.topic;
        const events = messagesByTopic[msgTopic];
        if (!events) {
          this._problemManager.addProblem(`exexpected-topic-${msgTopic}`, {
            severity: "error",
            message: `Received a messaged on an unexpected topic: ${msgTopic}.`,
          });
          continue;
        }
        this._problemManager.removeProblem(`exexpected-topic-${msgTopic}`);

        const messageSizeInBytes = iterResult.msgEvent.sizeInBytes;
        sizeInBytes += messageSizeInBytes;

        // Adding this message will exceed the cache size
        // Evict blocks until we have enough size for the message
        while (
          loadQueue.length > 0 &&
          totalBlockSizeBytes + messageSizeInBytes > DEFAULT_CACHE_SIZE_BYTES
        ) {
          const lastBlockIdx = loadQueue.pop();
          if (lastBlockIdx != undefined) {
            const lastBlock = this._blocks[lastBlockIdx];
            this._blocks[lastBlockIdx] = undefined;
            if (lastBlock) {
              totalBlockSizeBytes -= lastBlock.sizeInBytes;
              totalBlockSizeBytes = Math.max(0, totalBlockSizeBytes);
            }
          }
        }

        totalBlockSizeBytes += messageSizeInBytes;
        events.push(iterResult.msgEvent);
      }

      await iterator.return?.();
      const block = {
        messagesByTopic: {
          ...existingBlock?.messagesByTopic,
          ...messagesByTopic,
        },
        sizeInBytes: sizeInBytes + (existingBlock?.sizeInBytes ?? 0),
      };

      this._blocks[idx] = block;

      const fullyLoadedFractionRanges = simplify(
        filterMap(this._blocks, (thisBlock, blockIndex) => {
          if (!thisBlock) {
            return;
          }

          for (const topic of topics) {
            if (!thisBlock.messagesByTopic[topic]) {
              return;
            }
          }

          return {
            start: blockIndex,
            end: blockIndex + 1,
          };
        }),
      );

      this._progress = {
        fullyLoadedFractionRanges: fullyLoadedFractionRanges.map((range) => ({
          // Convert block ranges into fractions.
          start: range.start / this._blocks.length,
          end: range.end / this._blocks.length,
        })),
        messageCache: {
          blocks: this._blocks.slice(),
          startTime: this._start,
        },
      };

      // State change requested, bail
      if (this._nextState) {
        return;
      }

      // We throttle emitting the state since we could be loading blocks
      // faster than 60fps and it is actually slower to try rendering with each
      // new block compared to spacing out the rendering.
      if (shouldEmit && Date.now() >= nextEmit) {
        await this._emitState();
        nextEmit = Date.now() + 100;
      }
    }

    if (shouldEmit) {
      await this._emitState();
    }
  }

  startPlayback(): void {
    if (this._isPlaying) {
      return;
    }
    this._metricsCollector.play(this._speed);
    this._isPlaying = true;
    if (this._state === "idle") {
      this._setState("play");
    }
  }

  pausePlayback(): void {
    if (!this._isPlaying) {
      return;
    }
    this._metricsCollector.pause();
    // clear out last tick millis so we don't read a huge chunk when we unpause
    this._lastTickMillis = undefined;
    this._isPlaying = false;
    if (this._state === "play") {
      this._setState("idle");
    }
  }

  setPlaybackSpeed(speed: number): void {
    delete this._lastRangeMillis;
    this._speed = speed;
    this._metricsCollector.setSpeed(speed);

    if (this._state === "idle") {
      void this._emitState();
    }
  }

  seekPlayback(time: Time): void {
    // Seeking before initialization is complete is a no-op since we do not
    // yet know the time range of the source
    if (this._state === "preinit" || this._state === "initialize") {
      return;
    }

    this._metricsCollector.seek(time);
    this._seekTarget = time;
    this._setState("seek-backfill");
  }

  setSubscriptions(newSubscriptions: SubscribePayload[]): void {
    this._subscriptions = newSubscriptions;
    this._metricsCollector.setSubscriptions(newSubscriptions);

    // Once we are in an active state (i.e. done initializing), we use seeking to indicate
    // that subscriptions have changed so restart our loading
    if (this._state === "idle" || this._state === "seek-backfill" || this._state === "play") {
      if (!this._isPlaying && this._currentTime) {
        this.seekPlayback(this._currentTime);
      }
    }
  }

  requestBackfill(): void {
    // no-op
  }

  setPublishers(_publishers: AdvertiseOptions[]): void {
    // no-op
  }

  setParameter(_key: string, _value: ParameterValue): void {
    throw new Error("Parameter editing is not supported by this data source");
  }

  publish(_payload: PublishPayload): void {
    throw new Error("Publishing is not supported by this data source");
  }

  close(): void {
    this._isPlaying = false;
    this._closed = true;
    this._metricsCollector.close();
    this._forwardIterator?.return?.().catch((err) => log.error(err));
  }

  setGlobalVariables(): void {
    // no-op
  }
}
