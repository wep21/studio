// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { TextField } from "@mui/material";

type Props = {
  settings: { decayTime?: number };
  onFieldChange: (name: string, value: unknown) => unknown;
};

export default function CommonDecaySettings({ settings, onFieldChange }: Props): JSX.Element {
  const decayTime = settings.decayTime;
  const decayTimeValue = decayTime == undefined ? "" : decayTime;

  return (
    <TextField
      fullWidth
      variant="outlined"
      label="Decay Time (seconds)"
      type="number"
      placeholder="0"
      value={decayTimeValue}
      inputProps={{ min: 0, step: 0.1 }}
      InputProps={{ notched: false }}
      InputLabelProps={{
        sx: (theme) => ({
          position: "relative",
          transform: "translate(0) scale(0.875)",
          marginTop: theme.spacing(0.25),
        }),
      }}
      FormHelperTextProps={{ variant: "standard" }}
      size="small"
      onChange={(e) => {
        const isInputValid = !isNaN(parseFloat(e.target.value));
        onFieldChange("decayTime", isInputValid ? parseFloat(e.target.value) : undefined);
      }}
      helperText="When set to 0, only the latest received data will be displayed."
    />
  );
}
