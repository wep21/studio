// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  DetailsList,
  IColumn,
  IDropdownOption,
  SelectionMode,
  Stack,
  Text,
  useTheme,
} from "@fluentui/react";
import { useCallback, useMemo } from "react";

import MessagePathInput from "@foxglove/studio-base/components/MessagePathSyntax/MessagePathInput";

import { Config, Operator } from "./types";

type SettingsProps = {
  config: Config;
  onConfigChange: (newConfig: Config) => void;
};

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

  const operatorOptions = useMemo<(IDropdownOption & { key: Operator })[]>(() => {
    return [
      { key: "=", text: "=" },
      { key: "<", text: "<" },
      { key: "<=", text: "≤" },
      { key: ">", text: ">" },
      { key: ">=", text: "≥" },
    ];
  }, []);

  const columns = useMemo((): IColumn[] => {
    return [
      { key: "operator", fieldName: "operator", name: "Operator", minWidth: 75 },
      { key: "value", fieldName: "rawValue", name: "Value", minWidth: 75 },
      { key: "color", fieldName: "color", name: "Color", minWidth: 75 },
      { key: "label", fieldName: "label", name: "Label", minWidth: 75 },
    ];
  }, []);

  return (
    <Stack verticalFill tokens={{ childrenGap: theme.spacing.m }}>
      <Stack.Item>
        <Text>Data</Text>
        <Stack
          tokens={{
            padding: `${theme.spacing.s1} 0`,
          }}
        >
          <MessagePathInput path={config.path} onChange={onChangePath} />
        </Stack>
      </Stack.Item>
      <Stack.Item>
        <DetailsList compact selectionMode={SelectionMode.none} items={rules} columns={columns} />
      </Stack.Item>
    </Stack>
  );
}
