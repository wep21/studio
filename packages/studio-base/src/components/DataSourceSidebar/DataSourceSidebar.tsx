// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Add24Regular as AddIcon } from "@fluentui/react-icons";
import ErrorIcon from "@mui/icons-material/ErrorOutline";
import WarningIcon from "@mui/icons-material/WarningAmber";
import {
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useCallback, useContext } from "react";

import { AppSetting } from "@foxglove/studio-base/AppSetting";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import NotificationModal from "@foxglove/studio-base/components/NotificationModal";
import { SidebarContent } from "@foxglove/studio-base/components/SidebarContent";
import Stack from "@foxglove/studio-base/components/Stack";
import ModalContext from "@foxglove/studio-base/context/ModalContext";
import { useAppConfigurationValue } from "@foxglove/studio-base/hooks/useAppConfigurationValue";
import { PlayerProblem } from "@foxglove/studio-base/players/types";

import { DataSourceInfo } from "./DataSourceInfo";
import helpContent from "./help.md";

type Props = {
  onSelectDataSourceAction: () => void;
};

const selectPlayerProblems = (ctx: MessagePipelineContext) => ctx.playerState.problems;

const emptyArray: PlayerProblem[] = [];

export default function DataSourceSidebar(props: Props): JSX.Element {
  const { onSelectDataSourceAction } = props;
  const [enableOpenDialog] = useAppConfigurationValue(AppSetting.OPEN_DIALOG);
  const modalHost = useContext(ModalContext);

  const playerProblems = useMessagePipeline(selectPlayerProblems) ?? emptyArray;

  const showProblemModal = useCallback(
    (problem: PlayerProblem) => {
      const remove = modalHost.addModalElement(
        <NotificationModal
          notification={{
            message: problem.message,
            subText: problem.tip,
            details: problem.error,
            severity: problem.severity,
          }}
          onRequestClose={() => remove()}
        />,
      );
    },
    [modalHost],
  );

  return (
    <SidebarContent
      title="Data source"
      helpContent={helpContent}
      disablePadding
      trailingItems={[
        enableOpenDialog === true && (
          <IconButton
            key="add-connection"
            color="primary"
            title="New connection"
            onClick={onSelectDataSourceAction}
          >
            <AddIcon />
          </IconButton>
        ),
      ].filter(Boolean)}
    >
      <Stack padding={2}>
        <DataSourceInfo />
      </Stack>

      {playerProblems.length > 0 && (
        <>
          <Divider />
          <List disablePadding>
            {playerProblems.map((problem, idx) => (
              <ListItem disablePadding key={`${idx}`}>
                <ListItemButton onClick={() => showProblemModal(problem)}>
                  <ListItemIcon>
                    {problem.severity === "error" ? (
                      <ErrorIcon color="error" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={problem.message}
                    primaryTypographyProps={{
                      color: problem.severity === "error" ? "error" : "inherit",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </SidebarContent>
  );
}
