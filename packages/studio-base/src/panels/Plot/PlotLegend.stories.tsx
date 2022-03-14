// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Story } from "@storybook/react";
import { PropsWithChildren } from "react";

import PlotLegend from "@foxglove/studio-base/panels/Plot/PlotLegend";
import PanelSetup from "@foxglove/studio-base/stories/PanelSetup";

export default {
  title: "panels/Plot/PlotLegend",
  component: PlotLegend,
};

function StoryWrapper(props: PropsWithChildren<unknown>) {
  return (
    <div style={{ height: "100vh" }}>
      <PanelSetup>{props.children}</PanelSetup>
    </div>
  );
}

export const Default: Story = () => {
  return (
    <StoryWrapper>
      <PlotLegend
        paths={[
          { value: "foo.bar", enabled: false, timestampMethod: "receiveTime" },
          { value: "foo.baz", enabled: false, timestampMethod: "receiveTime" },
        ]}
        pathValues={{}}
        hoveredPathValues={{}}
        xAxisVal="timestamp"
        pathsWithMismatchedDataLengths={[]}
        legendDisplay={"floating"}
        showLegend={true}
        saveConfig={() => {}}
        sidebarDimension={240}
      />
    </StoryWrapper>
  );
};

export const WithValues: Story = () => {
  return (
    <StoryWrapper>
      <PlotLegend
        paths={[
          { value: "foo.bar", enabled: false, timestampMethod: "receiveTime" },
          { value: "foo.baz", enabled: false, timestampMethod: "receiveTime" },
        ]}
        pathValues={{
          "foo.bar": 12.3212,
        }}
        hoveredPathValues={{}}
        xAxisVal="timestamp"
        pathsWithMismatchedDataLengths={[]}
        legendDisplay={"floating"}
        showLegend={true}
        saveConfig={() => {}}
        sidebarDimension={240}
      />
    </StoryWrapper>
  );
};
