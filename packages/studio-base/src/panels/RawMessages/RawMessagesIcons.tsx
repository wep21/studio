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
  FilterAlt as FilterIcon,
  MoreHoriz as MoreHorizIcon,
  ScatterPlot as ScatterPlotIcon,
  ShowChart as LineChartIcon,
} from "@mui/icons-material";
import { IconButton, Theme } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { ReactElement, useCallback, useMemo } from "react";

import { openSiblingPlotPanel, plotableRosTypes } from "@foxglove/studio-base/panels/Plot";
import {
  openSiblingStateTransitionsPanel,
  transitionableRosTypes,
} from "@foxglove/studio-base/panels/StateTransitions";
import { OpenSiblingPanel } from "@foxglove/studio-base/types/panels";

import { ValueAction } from "./getValueActionForValue";

type Props = {
  valueAction: ValueAction;
  basePath: string;
  onTopicPathChange: (arg0: string) => void;
  openSiblingPanel: OpenSiblingPanel;
};

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.25),
  },
  icon: {
    fontSize: 12,
    padding: 0,
  },
}));

export default function RawMessagesIcons({
  valueAction,
  basePath,
  onTopicPathChange,
  openSiblingPanel,
}: Props): ReactElement {
  const classes = useStyles();
  const { singleSlicePath, multiSlicePath, primitiveType, filterPath } = valueAction;

  const openPlotPanel = useCallback(
    (pathSuffix: string) => () => {
      openSiblingPlotPanel(openSiblingPanel, `${basePath}${pathSuffix}`);
    },
    [basePath, openSiblingPanel],
  );
  const openStateTransitionsPanel = useCallback(
    (pathSuffix: string) => () => {
      openSiblingStateTransitionsPanel(openSiblingPanel, `${basePath}${pathSuffix}`);
    },
    [basePath, openSiblingPanel],
  );
  const onFilter = useCallback(
    () => onTopicPathChange(`${basePath}${filterPath}`),
    [basePath, filterPath, onTopicPathChange],
  );

  const buttons = useMemo(() => {
    const arr = [];

    if (filterPath.length > 0) {
      arr.push({
        key: "filter",
        title: "Filter on this value",
        onClick: onFilter,
        children: <FilterIcon fontSize="inherit" />,
      });
    }
    if (plotableRosTypes.includes(primitiveType)) {
      arr.push({
        key: "line-chart",
        title: "Line chart",
        onClick: () => openPlotPanel(singleSlicePath),
        children: <LineChartIcon fontSize="inherit" />,
      });

      if (multiSlicePath !== singleSlicePath) {
        buttons.push({
          key: "plot",
          title: "Scatter plot",
          onClick: () => openPlotPanel(multiSlicePath),
          children: <ScatterPlotIcon fontSize="inherit" />,
        });
      }
    }
    if (transitionableRosTypes.includes(primitiveType) && multiSlicePath === singleSlicePath) {
      arr.push({
        key: "state-transitions",
        title: "State transitions",
        onClick: () => openStateTransitionsPanel(singleSlicePath),
        children: <MoreHorizIcon fontSize="inherit" />,
      });
    }

    return arr;
  }, [
    filterPath,
    multiSlicePath,
    onFilter,
    openPlotPanel,
    openStateTransitionsPanel,
    primitiveType,
    singleSlicePath,
  ]);

  return (
    <div className={classes.root}>
      {buttons.map(({ key, ...buttonProps }) => (
        <IconButton
          key={key}
          className={classes.icon}
          color="inherit"
          size="small"
          {...buttonProps}
        />
      ))}
    </div>
  );
}
