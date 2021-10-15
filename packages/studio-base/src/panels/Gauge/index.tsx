// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Stack, getId } from "@fluentui/react";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import MessagePathInput from "@foxglove/studio-base/components/MessagePathSyntax/MessagePathInput";
import { useLatestMessageDataItem } from "@foxglove/studio-base/components/MessagePathSyntax/useLatestMessageDataItem";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

type GaugeConfig = {
  path: string;
};

type Props = {
  config: GaugeConfig;
  saveConfig: SaveConfig<GaugeConfig>;
};

const GaugeBackground = styled.div`
  width: 100%;
  height: 100%;
  background: conic-gradient(from -120deg, #f00, #ff0, #0c0 240deg);
  clip-path: path("M1,5 a 1 1 0 0 1 2,0 h-0.5 a 0.5 0.5 0 0 0 -1,0 Z");
`;

function Gauge(props: Props) {
  const {
    config: { path = "" },
    saveConfig,
  } = props;
  useLatestMessageDataItem(path);
  const clipPathId = useMemo(() => getId("gauge-clip-path"), []);

  const validTypes = useMemo(() => ["primitive"], []);
  const onPathChange = useCallback(
    (newPath: string) => saveConfig({ path: newPath }),
    [saveConfig],
  );
  const cx = 1;
  const cy = 1;
  // const r = 0.8;
  // const a = Math.PI / 8;
  const [a, setA] = useState(-Math.PI / 8);
  const [r, setR] = useState(0.8);
  const height = Math.max(cy - Math.sin(a), cy - r * Math.sin(a));
  return (
    <Stack verticalFill>
      <PanelToolbar>
        <MessagePathInput validTypes={validTypes} path={path} onChange={onPathChange} />
      </PanelToolbar>
      <Stack.Item
        grow
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <input
          type="range"
          min="-3.14"
          max="3.14"
          step="0.01"
          value={a}
          onChange={(e) => setA(+e.currentTarget.value)}
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={r}
          onChange={(e) => setR(+e.currentTarget.value)}
        />
        <div
          style={{
            background: "conic-gradient(from -120deg, #f00, #ff0, #0c0 240deg)",
            clipPath: `url(#${clipPathId})`,
            width: "100%",
            height: "100%",
            aspectRatio: `2 / ${height}`,
          }}
        ></div>
        <svg viewBox={`0 0 1 ${height}`}>
          <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
            <g transform="scale(0.5 0.5)">
              <path
                d={[
                  `M ${cx - Math.cos(a)},${cy - Math.sin(a)}`,
                  //TODO: change width to 1 instead of 2
                  `A 0.5,0.5 0 ${a < 0 ? 1 : 0} 1 ${cx + Math.cos(a)},${cy - Math.sin(a)}`,
                  `L ${cx + r * Math.cos(a)},${cy - r * Math.sin(a)}`,
                  `A ${r},${r} 0 ${a < 0 ? 1 : 0} 0 ${cx - r * Math.cos(a)},${
                    cy - r * Math.sin(a)
                  }`,
                  // `h-0.5 A 0.5,0.5 0 0 0 0.5,1`
                  `Z`,
                ].join(" ")}
                fill="white"
              />
            </g>
          </clipPath>
          {/* <foreignObject width="100%" height="100%">
            <div
              style={{
                background: "conic-gradient(from -120deg, #f00, #ff0, #0c0 240deg)",
                clipPath: `url(#${clipPathId})`,
                // height: "100%",
              }}
            ></div>
          </foreignObject> */}
        </svg>
        {/* <svg viewBox="0 0 4 4" width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
              <path d="M0,1 a 0.5 0.5 0 0 1 1,0 h-0.25 a 0.25 0.25 0 0 0 -0.5,0 Z" />
            </clipPath>
          </defs>
        </svg>
        <div
          style={{
            background: "conic-gradient(from -120deg, #f00, #ff0, #0c0 240deg)",
            clipPath: `url(#${clipPathId})`,
            height: "100%",
          }}
        ></div> */}
      </Stack.Item>
    </Stack>
  );
}

Gauge.panelType = "gauge";
Gauge.defaultConfig = {};
Gauge.supportsStrictMode = false;

export default Panel(Gauge);
