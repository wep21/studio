// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useTheme as useFluentUITheme } from "@fluentui/react";
import {
  Close as CloseIcon,
  Error as ErrorIcon,
  Remove as RemoveIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { IconButton, Theme, Tooltip, Typography, useTheme } from "@mui/material";
import { createStyles, makeStyles } from "@mui/styles";
import { useCallback, useMemo, useState } from "react";

import MessagePathInput from "@foxglove/studio-base/components/MessagePathSyntax/MessagePathInput";
import { getLineColor } from "@foxglove/studio-base/util/plotColors";

import PathSettingsModal from "./PathSettingsModal";
import { PlotPath, isReferenceLinePlotPathType } from "./internalTypes";
import { plotableRosTypes, PlotXAxisVal, PathValue } from "./types";

type PlotLegendRowProps = {
  index: number;
  xAxisVal: PlotXAxisVal;
  path: PlotPath;
  value?: PathValue;
  hoverValue?: PathValue;
  hasMismatchedDataLength: boolean;

  onChange: (index: number, newValue: PlotPath) => void;
  onRemove: (index: number) => void;
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "contents",

      "&:hover, &:focus-within": {
        "& .MuiIconButton-root": {
          backgroundColor: theme.palette.action.hover,
        },
        "& > *:last-child": {
          opacity: 1,
        },
        "& > *": {
          backgroundColor: theme.palette.action.hover,
        },
      },
    },
    listIcon: {
      padding: theme.spacing(0.25),
      position: "sticky",
      left: 0,
      // creates an opaque background for the sticky element
      backgroundImage: `linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper})`,
      backgroundBlendMode: "overlay",
    },
    legendIconButton: {
      padding: `${theme.spacing(0.125)} !important`,
      marginLeft: theme.spacing(0.25),
    },
    inputWrapper: {
      display: "flex",
      alignItems: "center",
      padding: theme.spacing(0.25),
    },
    plotValue: {
      display: "flex",
      alignItems: "center",
      justifyContent: "right",
      padding: theme.spacing(0.25),
    },
    actionButton: {
      padding: `${theme.spacing(0.25)} !important`,
      color: theme.palette.text.secondary,

      "&:hover": {
        color: theme.palette.text.primary,
      },
    },
    actions: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing(0.25),
      gap: theme.spacing(0.25),
      position: "sticky",
      right: 0,
      opacity: 0,
      // creates an opaque background for the sticky element
      backgroundImage: `linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper})`,
      backgroundBlendMode: "overlay",

      "&:hover": {
        opacity: 1,
      },
    },
  }),
);

export default function PlotLegendRow(props: PlotLegendRowProps): JSX.Element {
  const { index, xAxisVal, path, value, hoverValue, hasMismatchedDataLength, onChange, onRemove } =
    props;

  const fluentUITheme = useFluentUITheme();
  const theme = useTheme();

  const legendIconColor = path.enabled
    ? getLineColor(path.color, index)
    : theme.palette.text.secondary;

  const classes = useStyles();

  const isReferenceLinePlotPath = isReferenceLinePlotPathType(path);

  const onInputChange = useCallback(
    (inputValue: string) => {
      onChange(index, { ...path, value: inputValue.trim() });
    },
    [index, onChange, path],
  );

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const valueDisplay = useMemo(() => {
    if (hoverValue != undefined) {
      return { value: hoverValue, color: fluentUITheme.palette.yellowDark };
    }

    if (value != undefined) {
      return { value, color: "inherit" };
    }

    return undefined;
  }, [fluentUITheme, hoverValue, value]);

  return (
    <div className={classes.root}>
      <div style={{ position: "absolute" }}>
        {settingsModalOpen && (
          <PathSettingsModal
            xAxisVal={xAxisVal}
            path={path}
            index={index}
            onChange={onChange}
            onDismiss={() => setSettingsModalOpen(false)}
          />
        )}
      </div>
      <div className={classes.listIcon}>
        <IconButton
          className={classes.legendIconButton}
          centerRipple={false}
          size="small"
          title="Toggle visibility"
          onClick={() => {
            onChange(index, { ...path, enabled: !path.enabled });
          }}
        >
          <RemoveIcon style={{ color: legendIconColor }} color="inherit" />
        </IconButton>
      </div>
      <div className={classes.inputWrapper}>
        <MessagePathInput
          supportsMathModifiers
          path={path.value}
          onChange={onInputChange}
          validTypes={plotableRosTypes}
          placeholder="Enter a topic name or a number"
          autoSize
          disableAutocomplete={isReferenceLinePlotPath}
          inputStyle={{ textDecoration: !path.enabled ? "line-through" : undefined }}
        />
        {hasMismatchedDataLength && (
          <Tooltip
            placement="top"
            title="Mismatch in the number of elements in x-axis and y-axis messages"
          >
            <ErrorIcon fontSize="small" color="error" />
          </Tooltip>
        )}
      </div>
      {valueDisplay != undefined && (
        <div className={classes.plotValue} style={{ color: valueDisplay.color }}>
          <Typography component="div" variant="body2" align="right" color="inherit">
            {valueDisplay.value}
          </Typography>
        </div>
      )}
      {value == undefined && <div></div>}
      <div className={classes.actions}>
        <IconButton
          className={classes.actionButton}
          size="small"
          title="Edit settings"
          onClick={() => setSettingsModalOpen(true)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <IconButton
          className={classes.actionButton}
          size="small"
          title={`Remove ${path.value}`}
          onClick={() => {
            onRemove(index);
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
}
