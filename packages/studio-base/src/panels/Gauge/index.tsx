// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Stack, getId } from "@fluentui/react";
import { useCallback, useMemo } from "react";

import MessagePathInput from "@foxglove/studio-base/components/MessagePathSyntax/MessagePathInput";
import { useLatestMessageDataItem } from "@foxglove/studio-base/components/MessagePathSyntax/useLatestMessageDataItem";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { PanelConfigSchema, SaveConfig } from "@foxglove/studio-base/types/panels";

type GaugeConfig = {
  path: string;
  minValue: number;
  maxValue: number;
};

type Props = {
  config: GaugeConfig;
  saveConfig: SaveConfig<GaugeConfig>;
};

const supportedDataTypes = [
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "float32",
  "float64",
];

function Gauge(props: Props) {
  const {
    config: { path, minValue, maxValue },
    saveConfig,
  } = props;
  const onPathChange = useCallback(
    (newPath: string) => saveConfig({ path: newPath }),
    [saveConfig],
  );
  const clipPathId = useMemo(() => getId("gauge-clip-path"), []);
  const queriedData = useLatestMessageDataItem(path)?.queriedData[0]?.value;

  const rawValue = typeof queriedData === "number" ? queriedData : NaN;
  const scaledValue =
    (Math.max(minValue, Math.min(rawValue, maxValue)) - minValue) / (maxValue - minValue);
  const outOfBounds = rawValue < minValue || rawValue > maxValue;

  const padding = 0.1;
  const centerX = 0.5 + padding;
  const centerY = 0.5 + padding;
  const gaugeAngle = -Math.PI / 8;
  const radius = 0.5;
  const innerRadius = 0.4;
  const width = 1 + 2 * padding;
  const height =
    Math.max(
      centerY - radius * Math.sin(gaugeAngle),
      centerY - innerRadius * Math.sin(gaugeAngle),
    ) + padding;
  const needleThickness = 8;
  const needleExtraLength = 0.05;
  return (
    <Stack verticalFill>
      <PanelToolbar>
        <MessagePathInput validTypes={supportedDataTypes} path={path} onChange={onPathChange} />
      </PanelToolbar>
      <Stack.Item
        grow
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          alignItems: "center",
          overflow: "hidden",
          padding: 8,
        }}
      >
        <div style={{ width: "100%", overflow: "hidden" }}>
          <div
            style={{
              position: "relative",
              maxWidth: "100%",
              maxHeight: "100%",
              aspectRatio: `${width} / ${height}`,
              margin: "0 auto",
              transform: "scale(1)", // Work around a Safari bug that stretches the drawing of the inner div's background
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: `conic-gradient(from ${-Math.PI / 2 + gaugeAngle}rad at 50% ${
                  50 / height
                }%, #f00, #ff0, #0c0 ${2 * (Math.PI / 2 - gaugeAngle)}rad, #f00)`,
                clipPath: `url(#${clipPathId})`,
                opacity: queriedData == undefined ? 0.5 : 1,
              }}
            />
            <div
              style={{
                backgroundColor: outOfBounds ? "orange" : "white",
                width: needleThickness,
                height: `${(100 * (radius + needleExtraLength)) / height}%`,
                border: "2px solid black",
                borderRadius: needleThickness / 2,
                position: "absolute",
                bottom: `${100 * (1 - centerY / height)}%`,
                left: "50%",
                transformOrigin: "bottom left",
                margin: "0 auto",
                transform: [
                  `scaleZ(1)`,
                  `rotate(${
                    -Math.PI / 2 + gaugeAngle + scaledValue * 2 * (Math.PI / 2 - gaugeAngle)
                  }rad)`,
                  `translateX(${-needleThickness / 2}px)`,
                  `translateY(${needleThickness / 2}px)`,
                ].join(" "),
                display: Number.isFinite(scaledValue) ? "block" : "none",
              }}
            />
          </div>
          <svg style={{ position: "absolute" }}>
            <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
              <path
                transform={`scale(${1 / width}, ${1 / height})`}
                d={[
                  `M ${centerX - radius * Math.cos(gaugeAngle)},${
                    centerY - radius * Math.sin(gaugeAngle)
                  }`,
                  `A 0.5,0.5 0 ${gaugeAngle < 0 ? 1 : 0} 1 ${
                    centerX + radius * Math.cos(gaugeAngle)
                  },${centerY - radius * Math.sin(gaugeAngle)}`,
                  `L ${centerX + innerRadius * Math.cos(gaugeAngle)},${
                    centerY - innerRadius * Math.sin(gaugeAngle)
                  }`,
                  `A ${innerRadius},${innerRadius} 0 ${gaugeAngle < 0 ? 1 : 0} 0 ${
                    centerX - innerRadius * Math.cos(gaugeAngle)
                  },${centerY - innerRadius * Math.sin(gaugeAngle)}`,
                  `Z`,
                ].join(" ")}
              />
            </clipPath>
          </svg>
        </div>
      </Stack.Item>
    </Stack>
  );
}

const defaultConfig: GaugeConfig = {
  path: "",
  minValue: 0,
  maxValue: 1,
};

const configSchema: PanelConfigSchema<GaugeConfig> = [
  { key: "minValue", type: "number", title: "Minimum value" },
  { key: "maxValue", type: "number", title: "Maximum value" },
];

export default Panel(Object.assign(Gauge, { panelType: "gauge", configSchema, defaultConfig }));
