// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { action } from "@storybook/addon-actions";
import { Story } from "@storybook/react";
import { PropsWithChildren } from "react";

import PlotLegendRow from "@foxglove/studio-base/panels/Plot/PlotLegendRow";
import PanelSetup from "@foxglove/studio-base/stories/PanelSetup";

export default {
  title: "panels/Plot/PlotLegendRow",
  component: PlotLegendRow,
};

function StoryWrapper(props: PropsWithChildren<unknown>) {
  return (
    <div style={{ height: 30 }}>
      <PanelSetup>{props.children}</PanelSetup>
    </div>
  );
}

export const Default: Story = () => {
  return (
    <StoryWrapper>
      <PlotLegendRow
        path={{ value: "foo.bar", enabled: false, timestampMethod: "receiveTime" }}
        index={0}
        xAxisVal="timestamp"
        hasMismatchedDataLength={false}
        onChange={action("onChange")}
        onRemove={action("onRemove")}
      />
    </StoryWrapper>
  );
};

export const HasMismatchedDataLength: Story = () => {
  return (
    <StoryWrapper>
      <PlotLegendRow
        path={{ value: "foo.bar", enabled: false, timestampMethod: "receiveTime" }}
        index={0}
        xAxisVal="timestamp"
        hasMismatchedDataLength={true}
        onChange={action("onChange")}
        onRemove={action("onRemove")}
      />
    </StoryWrapper>
  );
};

export const WithValue: Story = () => {
  return (
    <StoryWrapper>
      <PlotLegendRow
        path={{ value: "foo.bar", enabled: false, timestampMethod: "receiveTime" }}
        index={0}
        value={33.44423}
        xAxisVal="timestamp"
        hasMismatchedDataLength={false}
        onChange={action("onChange")}
        onRemove={action("onRemove")}
      />
    </StoryWrapper>
  );
};

export const WithHoveredValue: Story = () => {
  return (
    <StoryWrapper>
      <PlotLegendRow
        path={{ value: "foo.bar", enabled: false, timestampMethod: "receiveTime" }}
        index={0}
        value={33.44423}
        hoverValue={40.3242}
        xAxisVal="timestamp"
        hasMismatchedDataLength={false}
        onChange={action("onChange")}
        onRemove={action("onRemove")}
      />
    </StoryWrapper>
  );
};
