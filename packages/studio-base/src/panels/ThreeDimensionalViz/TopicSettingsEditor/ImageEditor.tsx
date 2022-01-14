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

import Flex from "@foxglove/studio-base/components/Flex";
import { CompressedImage, Image } from "@foxglove/studio-base/types/Messages";

import { SLabel } from "./common";
import { TopicSettingsEditorProps } from "./types";

export type ImageSettings = {
  cameraInfoTopic?: string;
  rectification?: boolean;
};

export default function ImageEditor(
  _props: TopicSettingsEditorProps<Image | CompressedImage, ImageSettings>,
): JSX.Element {
  // const { settings, onFieldChange } = props;

  return (
    <Flex col>
      <SLabel>Camera Info Topic</SLabel>
      {/* FIXME: topic picker filtered by datatype */}
      <SLabel>Rectification</SLabel>
      {/* FIXME: checkbox */}
    </Flex>
  );
}
