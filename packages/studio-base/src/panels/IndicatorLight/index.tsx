// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Dialog, DialogFooter, PrimaryButton, Stack, useTheme } from "@fluentui/react";
import { useMemo, useState } from "react";

import HoverableIconButton from "@foxglove/studio-base/components/HoverableIconButton";
import { useLatestMessageDataItem } from "@foxglove/studio-base/components/MessagePathSyntax/useLatestMessageDataItem";
import Panel from "@foxglove/studio-base/components/Panel";
import { SaveConfig } from "@foxglove/studio-base/types/panels";
import { assertNever } from "@foxglove/studio-base/util/assertNever";
import { fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

import Settings from "./Settings";
import { Config, Rule } from "./types";

type Props = {
  config: Config;
  saveConfig: SaveConfig<Config>;
};

function getMatchingRule(
  rawValue:
    | undefined
    | boolean
    | bigint
    | number
    | string
    | { data?: boolean | bigint | number | string },
  rules: readonly Rule[],
): Rule | undefined {
  const value = typeof rawValue === "object" ? rawValue.data : rawValue;
  if (value == undefined) {
    return undefined;
  }
  for (const rule of rules) {
    let rhs: boolean | number | string | bigint;
    try {
      if (typeof value === "boolean" || typeof value === "number") {
        rhs = JSON.parse(rule.rawValue);
        if (typeof rhs !== "boolean" && typeof rhs !== "number") {
          continue;
        }
      } else if (typeof value === "string") {
        rhs = rule.rawValue;
      } else if (typeof value === "bigint") {
        rhs = BigInt(rule.rawValue);
      } else {
        assertNever(value, "Unsupported rule value");
      }
    } catch (error) {
      continue;
    }

    if (rule.operator === "=" && value === rhs) {
      return rule;
    } else if (rule.operator === "<" && value < rhs) {
      return rule;
    } else if (rule.operator === "<=" && value <= rhs) {
      return rule;
    } else if (rule.operator === ">" && value > rhs) {
      return rule;
    } else if (rule.operator === ">=" && value >= rhs) {
      return rule;
    }
  }
  return undefined;
}

function IndicatorLight(props: Props) {
  const {
    config,
    config: { path, rules, fallbackColor, fallbackLabel },
    saveConfig,
  } = props;
  const [showSettings, setShowSettings] = useState(false);
  const theme = useTheme();
  const queriedData = useLatestMessageDataItem(path)?.queriedData[0]?.value;

  const rawValue =
    typeof queriedData === "boolean" ||
    typeof queriedData === "bigint" ||
    typeof queriedData === "string" ||
    typeof queriedData === "number"
      ? queriedData
      : undefined;
  const matchingRule = useMemo(() => getMatchingRule(rawValue, rules), [rawValue, rules]);
  return (
    <Stack verticalFill>
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
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: theme.spacing.m }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: matchingRule?.color ?? fallbackColor,
              borderRadius: "50%",
              backgroundImage: [
                `radial-gradient(transparent, transparent 55%, rgba(255,255,255,0.4) 80%, rgba(255,255,255,0.4))`,
                `radial-gradient(circle at 38% 35%, rgba(255,255,255,0.8), transparent 30%, transparent)`,
                `radial-gradient(circle at 46% 44%, transparent, transparent 61%, rgba(0,0,0,0.7) 74%, rgba(0,0,0,0.7))`,
              ].join(","),
              position: "relative",
            }}
          />
          <div
            style={{
              fontFamily: fonts.MONOSPACE,
              color: matchingRule?.color ?? fallbackColor,
              fontSize: theme.fonts.xxLarge.fontSize,
            }}
          >
            {matchingRule?.label ?? fallbackLabel}
          </div>
        </Stack>
      </Stack.Item>
      <Stack styles={{ root: { position: "absolute", top: 0, left: 0, margin: theme.spacing.s1 } }}>
        <HoverableIconButton
          onClick={() => setShowSettings(true)}
          iconProps={{
            iconName: "Settings",
            iconNameActive: "SettingsFilled",
          }}
          styles={{
            root: {
              backgroundColor: theme.semanticColors.buttonBackgroundHovered,
              "&:hover": { backgroundColor: theme.semanticColors.buttonBackgroundPressed },
            },
            icon: { height: 20 },
          }}
        >
          Panel settings
        </HoverableIconButton>
      </Stack>
      <Dialog
        dialogContentProps={{ title: "Indicator Light panel settings", showCloseButton: true }}
        hidden={!showSettings}
        onDismiss={() => setShowSettings(false)}
        maxWidth={550}
        minWidth={550}
      >
        <Settings config={config} onConfigChange={saveConfig} />
        <DialogFooter>
          <PrimaryButton onClick={() => setShowSettings(false)}>Done</PrimaryButton>
        </DialogFooter>
      </Dialog>
    </Stack>
  );
}

const defaultConfig: Config = {
  path: "",
  rules: [{ operator: "=", rawValue: "true", color: "#68e24a", label: "True" }],
  fallbackColor: "#a0a0a0",
  fallbackLabel: "False",
};

export default Panel(Object.assign(IndicatorLight, { panelType: "IndicatorLight", defaultConfig }));
