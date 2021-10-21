// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  DetailsList,
  Dropdown,
  IColumn,
  IconButton,
  SelectionMode,
  Stack,
  Text,
  TextField,
  useTheme,
} from "@fluentui/react";
import { ComponentProps, useCallback, useMemo } from "react";

import ColorPicker from "@foxglove/studio-base/components/ColorPicker";
import MessagePathInput from "@foxglove/studio-base/components/MessagePathSyntax/MessagePathInput";
import { colorObjToIColor, hexToColorObj } from "@foxglove/studio-base/util/colorUtils";

import { Config, Operator, Rule } from "./types";

const newRuleColor = "#68e24a";

type SettingsProps = {
  config: Config;
  onConfigChange: (newConfig: Config) => void;
};

type RuleOrEmpty = Omit<Rule, "operator"> & { operator?: Operator };

export default function Settings(props: SettingsProps): JSX.Element {
  const theme = useTheme();
  const {
    config,
    config: { rules },
    onConfigChange,
  } = props;

  const saveConfig = useCallback(
    (partial: Partial<Config>) => {
      const full = Object.assign({}, config, partial);
      onConfigChange(full);
    },
    [config, onConfigChange],
  );
  const onChangePath = useCallback(
    (newPath: string) => saveConfig({ path: newPath }),
    [saveConfig],
  );
  const onChangeFallbackColor: ComponentProps<typeof ColorPicker>["onChange"] = useCallback(
    (color) => {
      saveConfig({ fallbackColor: colorObjToIColor(color).str });
    },
    [saveConfig],
  );

  const columns = useMemo((): IColumn[] => {
    return [
      {
        key: "operator",
        fieldName: "operator",
        name: "Comparison",
        minWidth: 100,
        onRender: (item: Rule, index) => {
          return (
            <Dropdown
              selectedKey={
                // Null clears out the selection
                // eslint-disable-next-line no-restricted-syntax
                item.operator ?? null
              }
              options={[
                { key: "=", text: "=" },
                { key: "<", text: "<" },
                { key: "<=", text: "≤" },
                { key: ">", text: ">" },
                { key: ">=", text: "≥" },
              ]}
              onChange={(_event, option) => {
                if (option == undefined || index == undefined) {
                  return;
                }
                if (index >= rules.length) {
                  saveConfig({
                    rules: [
                      ...rules,
                      {
                        operator: option.key as Operator,
                        color: newRuleColor,
                        rawValue: "true",
                        label: "True",
                      },
                    ],
                  });
                } else {
                  saveConfig({
                    rules: [
                      ...rules.slice(0, index),
                      { ...rules[index]!, operator: option.key as Operator },
                      ...rules.slice(index + 1),
                    ],
                  });
                }
              }}
            />
          );
        },
      },
      {
        key: "value",
        name: "Compare with",
        minWidth: 120,
        onRender: (item: Rule, index) => {
          if (index == undefined || index >= rules.length) {
            return ReactNull;
          }
          return (
            <TextField
              value={item.rawValue}
              onChange={(_event, newValue) => {
                if (newValue == undefined) {
                  return;
                }
                saveConfig({
                  rules: [
                    ...rules.slice(0, index),
                    { ...rules[index]!, rawValue: newValue },
                    ...rules.slice(index + 1),
                  ],
                });
              }}
            />
          );
        },
      },
      {
        key: "color",
        name: "Color",
        minWidth: 75,
        onRender: (item: Rule, index) => {
          if (index == undefined || index >= rules.length) {
            return ReactNull;
          }
          return (
            <ColorPicker
              color={hexToColorObj(item.color)}
              onChange={(newColor) => {
                saveConfig({
                  rules: [
                    ...rules.slice(0, index),
                    { ...rules[index]!, color: colorObjToIColor(newColor).str },
                    ...rules.slice(index + 1),
                  ],
                });
              }}
            />
          );
        },
      },
      {
        key: "label",
        name: "Label",
        minWidth: 75,
        onRender: (item: Rule, index) => {
          if (index == undefined || index >= rules.length) {
            return ReactNull;
          }
          return (
            <TextField
              value={item.label}
              onChange={(_event, newValue) => {
                if (newValue == undefined) {
                  return;
                }
                saveConfig({
                  rules: [
                    ...rules.slice(0, index),
                    { ...rules[index]!, label: newValue },
                    ...rules.slice(index + 1),
                  ],
                });
              }}
            />
          );
        },
      },
      {
        key: "delete",
        name: "",
        minWidth: 75,
        onRender: (_item: Rule, index?: number) => {
          if (index == undefined || index >= rules.length) {
            return ReactNull;
          }
          return (
            <IconButton
              iconProps={{ iconName: "Cancel" }}
              ariaLabel="Delete rule"
              onClick={() => {
                saveConfig({ rules: [...rules.slice(0, index), ...rules.slice(index + 1)] });
              }}
            />
          );
        },
      },
    ];
  }, [rules, saveConfig]);

  const rulesWithEmpty = useMemo((): RuleOrEmpty[] => {
    return [...rules, { operator: undefined, rawValue: "", color: newRuleColor, label: "" }];
  }, [rules]);

  return (
    <Stack verticalFill tokens={{ childrenGap: theme.spacing.m }}>
      <Text variant="medium">Data</Text>
      <Stack
        tokens={{
          padding: `${theme.spacing.s1} 0`,
        }}
      >
        <MessagePathInput path={config.path} onChange={onChangePath} />
      </Stack>
      <Dropdown
        label="Style"
        selectedKey={config.style}
        options={[
          { key: "circle", text: "Circle" },
          { key: "full", text: "Full frame" },
        ]}
        onChange={(_event, option) => {
          if (option == undefined) {
            return;
          }
          saveConfig({ style: option.key as "circle" | "full" });
        }}
      />
      <Text>Rules</Text>
      <DetailsList
        compact
        selectionMode={SelectionMode.none}
        items={rulesWithEmpty}
        columns={columns}
      />
      <Text>Default color</Text>
      <ColorPicker color={hexToColorObj(config.fallbackColor)} onChange={onChangeFallbackColor} />
      <Text>Default label</Text>
      <TextField
        value={config.fallbackLabel}
        onChange={(_event, newValue) => {
          if (newValue == undefined) {
            return;
          }
          saveConfig({ fallbackLabel: newValue });
        }}
      />
    </Stack>
  );
}
