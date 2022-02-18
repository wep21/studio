// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useState } from "react";

import {
  Layout,
  LayoutStorageContext,
  LayoutID,
  ILayoutStorage,
  ISO8601Timestamp,
} from "@foxglove/studio-base";

export default function MemoryLayoutStorageProvider(
  props: PropsWithChildren<unknown>,
): JSX.Element {
  const [ctx] = useState<ILayoutStorage>(() => {
    const store = new Map<string, Map<string, Layout>>();

    return {
      async list(namespace: string): Promise<readonly Layout[]> {
        return Array.from(store.get(namespace)?.values() ?? []);
      },

      async get(namespace: string, id: LayoutID): Promise<Layout | undefined> {
        if (id === "benchmark-raw-messages") {
          return {
            id: "benchmark-raw-messages" as LayoutID,
            name: "raw messages",
            permission: "CREATOR_WRITE",
            baseline: {
              data: {
                configById: {
                  "RawMessages!os6rgs": {
                    topicPath: "/gps",
                  },
                },
                globalVariables: {},
                userNodes: {},
                linkedGlobalVariables: [],
                playbackConfig: { speed: 1.0, messageOrder: "receiveTime" },
                layout: "RawMessages!os6rgs",
              },
              savedAt: new Date().toISOString() as ISO8601Timestamp,
            },
            working: undefined,
            syncInfo: undefined,
          };
        } else if (id === "benchmark-3d-panel") {
          return {
            id: "benchmark-3d-panel" as LayoutID,
            name: "3d panel",
            permission: "CREATOR_WRITE",
            baseline: {
              data: {
                configById: {
                  "3D Panel!2duripi": {
                    autoSyncCameraState: false,
                    autoTextBackgroundColor: true,
                    cameraState: {
                      distance: 30.07301531859491,
                      perspective: true,
                      phi: 0.8206301608559966,
                      targetOffset: [3.518847932546147, 0.42976146327776205, 0],
                      thetaOffset: 0.913787862462246,
                      fovy: 0.7853981633974483,
                      near: 0.01,
                      far: 5000,
                    },
                    checkedKeys: [
                      "name:Topics",
                      "t:/LIDAR_TOP",
                      "t:/markers/annotations",
                      "t:/pose",
                    ],
                    clickToPublishPoseTopic: "/move_base_simple/goal",
                    clickToPublishPointTopic: "/clicked_point",
                    clickToPublishPoseEstimateTopic: "/initialpose",
                    clickToPublishPoseEstimateXDeviation: 0.5,
                    clickToPublishPoseEstimateYDeviation: 0.5,
                    clickToPublishPoseEstimateThetaDeviation: 0.2617993877991494,
                    customBackgroundColor: "#000000",
                    diffModeEnabled: true,
                    expandedKeys: ["name:Topics"],
                    followMode: "follow",
                    modifiedNamespaceTopics: [],
                    pinTopics: false,
                    settingsByKey: {
                      "t:/pose/mesh": {
                        overrideColor: {
                          r: 1,
                          g: 1,
                          b: 1,
                          a: 1,
                        },
                      },
                    },
                    useThemeBackgroundColor: true,
                  },
                },
                globalVariables: {},
                userNodes: {},
                linkedGlobalVariables: [],
                playbackConfig: { speed: 1.0, messageOrder: "receiveTime" },
                layout: "3D Panel!2duripi",
              },
              savedAt: new Date().toISOString() as ISO8601Timestamp,
            },
            working: undefined,
            syncInfo: undefined,
          };
        }
        return store.get(namespace)?.get(id);
      },

      async put(namespace: string, layout: Layout): Promise<Layout> {
        const namespaceStore = store.get(namespace);
        if (namespaceStore) {
          namespaceStore.set(layout.id, layout);
        } else {
          store.set(namespace, new Map([[layout.id, layout]]));
        }

        return layout;
      },

      async delete(namespace: string, id: LayoutID): Promise<void> {
        store.get(namespace)?.delete(id);
      },

      async importLayouts(_args: { fromNamespace: string; toNamespace: string }): Promise<void> {},

      async migrateUnnamespacedLayouts(_namespace: string) {},
    };
  });

  return (
    <LayoutStorageContext.Provider value={ctx}>{props.children}</LayoutStorageContext.Provider>
  );
}
