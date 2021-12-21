// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import React from "react";

import { Color } from "@foxglove/regl-worldview";
import ColorPicker from "@foxglove/studio-base/components/ColorPicker";
import GradientPicker from "@foxglove/studio-base/components/GradientPicker";
import CommonPointSettings from "@foxglove/studio-base/panels/ThreeDimensionalViz/TopicSettingsEditor/CommonPointSettings";
import { TopicSettingsEditorProps } from "@foxglove/studio-base/panels/ThreeDimensionalViz/TopicSettingsEditor/types";
import { PointCloud2 } from "@foxglove/studio-base/types/Messages";

import CommonDecaySettings from "./CommonDecaySettings";
import { turboColorString } from "./turboColor";

type DirectColorMode =
  | {
      mode: "rgb";
      flatColor?: never;
      colorField?: never;
      minColor?: never;
      maxColor?: never;
      minValue?: never;
      maxValue?: never;
    }
  | {
      mode: "flat";
      flatColor: Color;
      colorField?: never;
      minColor?: never;
      maxColor?: never;
      minValue?: never;
      maxValue?: never;
    };

type MappedColorMode =
  | {
      mode: "gradient";
      flatColor?: never;
      colorField: string;
      minColor: Color;
      maxColor: Color;
      minValue?: number;
      maxValue?: number;
    }
  | {
      mode: "rainbow";
      flatColor?: never;
      colorField: string;
      minValue?: number;
      maxValue?: number;
      minColor?: never;
      maxColor?: never;
    }
  | {
      mode: "turbo";
      flatColor?: never;
      colorField: string;
      minValue?: number;
      maxValue?: number;
      minColor?: never;
      maxColor?: never;
    };

export type ColorMode = DirectColorMode | MappedColorMode;

export const DEFAULT_FLAT_COLOR = { r: 1, g: 1, b: 1, a: 1 };
export const DEFAULT_MIN_COLOR = { r: 0, g: 0, b: 1, a: 1 };
export const DEFAULT_MAX_COLOR = { r: 1, g: 0, b: 0, a: 1 };

export type PointCloudSettings = {
  pointSize?: number;
  pointShape?: string;
  decayTime?: number;
  colorMode?: ColorMode;
};

const DEFAULT_COLOR_FIELDS = ["intensity", "i"];

function isMappedColorMode(mode: ColorMode): mode is MappedColorMode {
  return mode?.mode === "gradient" || mode?.mode === "rainbow" || mode?.mode === "turbo";
}

const RainbowText = React.memo(function RainbowText({ children }: { children: string }) {
  return (
    <>
      {Array.from(children, (child, idx) => (
        // Rainbow gradient goes from magenta (300) to red (0)
        <span
          key={idx}
          style={{
            color: `hsl(${300 - 300 * (idx / (length - 1))}, 100%, 60%)`,
          }}
        >
          {child}
        </span>
      ))}
    </>
  );
});

const TurboText = React.memo(function TurboText({ children }: { children: string }) {
  return (
    <>
      {Array.from(children, (child, idx) => (
        <span
          key={idx}
          style={{
            color: turboColorString((idx + 1) / (children.length + 1)),
          }}
        >
          {child}
        </span>
      ))}
    </>
  );
});

export default function PointCloudSettingsEditor(
  props: TopicSettingsEditorProps<PointCloud2, PointCloudSettings>,
): React.ReactElement {
  const { message, settings = {}, onFieldChange, onSettingsChange } = props;

  const hasRGB = message?.fields?.some(({ name }) => name === "rgb") ?? false;
  const defaultColorField =
    message?.fields?.find(({ name }) => DEFAULT_COLOR_FIELDS.includes(name))?.name ??
    message?.fields?.find(({ name }) => name !== "rgb")?.name;
  const colorMode: ColorMode =
    settings.colorMode ??
    (hasRGB
      ? { mode: "rgb" }
      : defaultColorField
      ? { mode: "turbo", colorField: defaultColorField }
      : { mode: "flat", flatColor: DEFAULT_FLAT_COLOR });

  function onColorModeChange(newValueFn: (prevColorMode: ColorMode) => ColorMode | undefined) {
    onSettingsChange((oldSettings) => ({ ...oldSettings, colorMode: newValueFn(colorMode) }));
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <CommonPointSettings
          settings={settings}
          defaultPointSize={2}
          onFieldChange={onFieldChange}
        />
      </Grid>
      <Grid item xs={12}>
        <CommonDecaySettings settings={settings} onFieldChange={onFieldChange} />
      </Grid>

      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              select
              variant="outlined"
              fullWidth
              label="Color by"
              size="small"
              value={colorMode.mode === "flat" ? "flat" : "data"}
              InputProps={{ notched: false }}
              InputLabelProps={{
                sx: (theme) => ({
                  position: "relative",
                  transform: "translate(0) scale(0.875)",
                  marginTop: theme.spacing(0.25),
                }),
              }}
              FormHelperTextProps={{ variant: "standard" }}
              onChange={({ target: value }) =>
                onColorModeChange((prevColorMode) => {
                  if (value.value === "flat") {
                    return {
                      mode: "flat",
                      flatColor:
                        prevColorMode.mode === "gradient"
                          ? prevColorMode.minColor
                          : DEFAULT_FLAT_COLOR,
                    };
                  }
                  if (hasRGB) {
                    return { mode: "rgb" };
                  }
                  return defaultColorField
                    ? { mode: "turbo", colorField: defaultColorField }
                    : undefined;
                })
              }
            >
              <MenuItem value="flat">Flat</MenuItem>
              <MenuItem value="data">Point Data</MenuItem>
            </TextField>
          </Grid>
          {colorMode.mode === "flat" ? ( // For flat mode, pick a single color
            <Grid item xs={6}>
              <FormControl fullWidth>
                <FormLabel>Mapped Color</FormLabel>
                <ColorPicker
                  color={colorMode.flatColor}
                  onChange={(flatColor) => onColorModeChange(() => ({ mode: "flat", flatColor }))}
                />
              </FormControl>
            </Grid>
          ) : (
            <Grid item xs={6}>
              <TextField
                variant="outlined"
                label="Mapped field"
                fullWidth
                select
                size="small"
                InputProps={{ notched: false }}
                InputLabelProps={{
                  sx: (theme) => ({
                    position: "relative",
                    transform: "translate(0) scale(0.875)",
                    marginTop: theme.spacing(0.25),
                  }),
                }}
                FormHelperTextProps={{ variant: "standard" }}
                onChange={(event) =>
                  onColorModeChange((prevColorMode) => {
                    if (event.target.value === "rgb") {
                      return { mode: "rgb" };
                    }
                    if (isMappedColorMode(prevColorMode)) {
                      return { ...prevColorMode, colorField: event.target.value };
                    }
                    return { mode: "turbo", colorField: event.target.value };
                  })
                }
              >
                {(message?.fields ?? []).map(({ name }) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      </Grid>

      {isMappedColorMode(colorMode) && (
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                variant="outlined"
                label="Min value"
                fullWidth
                size="small"
                type="number"
                value={colorMode.minValue}
                onChange={({ target: { value } }) =>
                  onColorModeChange((prevColorMode) =>
                    isMappedColorMode(prevColorMode)
                      ? { ...prevColorMode, minValue: value === "" ? undefined : +value }
                      : prevColorMode,
                  )
                }
                inputProps={{ placeholder: "auto" }}
                InputProps={{ notched: false }}
                InputLabelProps={{
                  sx: (theme) => ({
                    position: "relative",
                    transform: "translate(0) scale(0.875)",
                    marginTop: theme.spacing(0.25),
                  }),
                }}
                FormHelperTextProps={{ variant: "standard" }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                variant="outlined"
                fullWidth
                label="Max value"
                size="small"
                type="number"
                value={colorMode.maxValue ?? ""}
                onChange={({ target: { value } }) =>
                  onColorModeChange((prevColorMode) =>
                    isMappedColorMode(prevColorMode)
                      ? { ...prevColorMode, maxValue: value === "" ? undefined : +value }
                      : prevColorMode,
                  )
                }
                inputProps={{ placeholder: "auto" }}
                InputProps={{ notched: false }}
                InputLabelProps={{
                  sx: (theme) => ({
                    position: "relative",
                    transform: "translate(0) scale(0.875)",
                    marginTop: theme.spacing(0.25),
                  }),
                }}
                FormHelperTextProps={{ variant: "standard" }}
              />
            </Grid>
          </Grid>
        </Grid>
      )}
      {isMappedColorMode(colorMode) && (
        <Grid item xs={12}>
          <FormControl>
            <FormLabel component="legend">Point Color Mode</FormLabel>
            <RadioGroup
              value={colorMode.mode}
              onChange={(_, value) =>
                onColorModeChange((prevColorMode) => {
                  if (isMappedColorMode(prevColorMode)) {
                    const { colorField, minValue, maxValue } = prevColorMode;
                    return value === "rainbow"
                      ? { mode: "rainbow", colorField, minValue, maxValue }
                      : value === "turbo"
                      ? { mode: "turbo", colorField, minValue, maxValue }
                      : {
                          mode: "gradient",
                          colorField,
                          minValue,
                          maxValue,
                          minColor: DEFAULT_MIN_COLOR,
                          maxColor: DEFAULT_MAX_COLOR,
                        };
                  }
                  return prevColorMode;
                })
              }
            >
              <FormControlLabel
                value="turbo"
                control={<Radio size="small" />}
                label={<TurboText>Turbo</TurboText>}
              />
              <FormControlLabel
                value="rainbow"
                control={<Radio size="small" />}
                label={<RainbowText>Rainbow</RainbowText>}
              />
              <FormControlLabel
                value="gradient"
                control={<Radio size="small" />}
                label="Gradient"
              />
            </RadioGroup>
          </FormControl>
        </Grid>
      )}
      {colorMode.mode === "gradient" && (
        <div style={{ margin: "8px" }}>
          <GradientPicker
            minColor={colorMode.minColor ?? DEFAULT_MIN_COLOR}
            maxColor={colorMode.maxColor ?? DEFAULT_MAX_COLOR}
            onChange={({ minColor, maxColor }) =>
              onColorModeChange((prevColorMode) =>
                prevColorMode.mode === "gradient"
                  ? { ...prevColorMode, minColor, maxColor }
                  : prevColorMode,
              )
            }
          />
        </div>
      )}
    </Grid>
  );
}

PointCloudSettingsEditor.canEditNamespaceOverrideColor = true;
