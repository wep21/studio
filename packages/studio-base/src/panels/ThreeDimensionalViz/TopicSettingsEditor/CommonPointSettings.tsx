// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Circle, CircleOutlined, Square, SquareOutlined } from "@mui/icons-material";
import {
  FormControl,
  FormLabel,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Grid,
} from "@mui/material";

type Props = {
  defaultPointSize: number;
  defaultPointShape?: string;
  settings: {
    pointSize?: number;
    pointShape?: string;
  };
  onFieldChange: (name: string, value: unknown) => void;
};

export default function CommonPointSettings({
  defaultPointSize,
  defaultPointShape = "circle",
  settings,
  onFieldChange,
}: Props): JSX.Element {
  const pointSizeVal = settings.pointSize == undefined ? "" : settings.pointSize;

  const pointShape = settings.pointShape;
  const pointShapeVal = pointShape ?? defaultPointShape;

  return (
    <Grid container spacing={2} alignItems="baseline">
      <Grid item xs>
        <TextField
          variant="outlined"
          fullWidth
          data-test="point-size-input"
          label="Point size"
          size="small"
          onChange={(e) => {
            const isInputValid = !isNaN(parseFloat(e.target.value));
            onFieldChange("pointSize", isInputValid ? parseFloat(e.target.value) : undefined);
          }}
          type="number"
          placeholder={defaultPointSize.toString()}
          value={pointSizeVal}
          inputProps={{ min: 1, max: 50, step: 1 }}
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

      <Grid item xs={4}>
        <FormControl fullWidth>
          <FormLabel
            sx={(theme) => ({
              position: "relative",
              transform: "translate(0) scale(0.875)",
              transformOrigin: "top left",
              marginTop: theme.spacing(0.25),
            })}
          >
            Point shape
          </FormLabel>
          <ToggleButtonGroup
            exclusive
            value={pointShapeVal}
            onChange={(_event, newValue) => onFieldChange("pointShape", newValue)}
          >
            <ToggleButton title="Circle" value="circle">
              {pointShapeVal === "circle" ? <Circle /> : <CircleOutlined />}
            </ToggleButton>
            <ToggleButton title="Square" value="square">
              {pointShapeVal === "square" ? <Square /> : <SquareOutlined />}
            </ToggleButton>
          </ToggleButtonGroup>
        </FormControl>
      </Grid>
    </Grid>
  );
}
