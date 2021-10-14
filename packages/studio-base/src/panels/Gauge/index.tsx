// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ReactDOM from "react-dom";

import { PanelExtensionContext } from "@foxglove/studio";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelExtensionAdapter from "@foxglove/studio-base/components/PanelExtensionAdapter";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import GaugePanel from "./GaugePanel";

function initPanel(context: PanelExtensionContext) {
  ReactDOM.render(<GaugePanel context={context} />, context.panelElement);
}

type Props = {
  config: unknown;
  saveConfig: SaveConfig<unknown>;
};

function GaugePanelAdapter(props: Props) {
  return (
    <PanelExtensionAdapter
      config={props.config}
      saveConfig={props.saveConfig}
      initPanel={initPanel}
    />
  );
}

GaugePanelAdapter.panelType = "gauge";
GaugePanelAdapter.defaultConfig = {};
GaugePanelAdapter.supportsStrictMode = false;

export default Panel(GaugePanelAdapter);
