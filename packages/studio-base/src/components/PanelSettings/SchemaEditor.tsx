// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Stack } from "@mui/material";

import { PanelConfigSchema, SaveConfig } from "@foxglove/studio-base/types/panels";

import SchemaEntryEditor from "./SchemaEntryEditor";

export default function SchemaEditor({
  configSchema,
  config,
  saveConfig,
}: {
  configSchema: PanelConfigSchema<Record<string, unknown>>;
  config: Record<string, unknown>;
  saveConfig: SaveConfig<Record<string, unknown>>;
}): JSX.Element {
  return (
    <Stack spacing={2}>
      {configSchema.map((entry) => (
        <SchemaEntryEditor config={config} saveConfig={saveConfig} key={entry.key} entry={entry} />
      ))}
    </Stack>
  );
}
