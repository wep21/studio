// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import MockMessagePipelineProvider from "@foxglove/studio-base/components/MessagePipeline/MockMessagePipelineProvider";
import ModalHost from "@foxglove/studio-base/context/ModalHost";
import { PlayerPresence } from "@foxglove/studio-base/players/types";

import DataSourceSidebar from "./DataSourceSidebar";

export default {
  title: "components/DataSourceSidebar",
  component: DataSourceSidebar,
};

export const NoDataSources = (): JSX.Element => {
  return (
    <ModalHost>
      <MockMessagePipelineProvider presence={PlayerPresence.NOT_PRESENT}>
        <DataSourceSidebar onSelectDataSourceAction={() => {}} />
      </MockMessagePipelineProvider>
    </ModalHost>
  );
};

export const WithPlayerProblems = (): JSX.Element => {
  return (
    <ModalHost>
      <MockMessagePipelineProvider
        presence={PlayerPresence.ERROR}
        problems={[
          {
            severity: "error",
            message: "Some message",
            tip: "A tip that we might want to show the user",
            error: new Error("Original Error"),
          },
          {
            severity: "warn",
            message: "Some longer warning message about sadness",
          },
        ]}
      >
        <DataSourceSidebar onSelectDataSourceAction={() => {}} />
      </MockMessagePipelineProvider>
    </ModalHost>
  );
};
