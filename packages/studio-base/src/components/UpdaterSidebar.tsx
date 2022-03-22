// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Stack } from "@mui/material";

import { SidebarContent } from "@foxglove/studio-base/components/SidebarContent";

export default function UpdaterSidebar(_props: React.PropsWithChildren<unknown>): JSX.Element {
  return (
    <SidebarContent title="Update">
      <Stack spacing={3.75}>
        <div>
          <Stack spacing={1}>
            <div>Say something here</div>
          </Stack>
        </div>
      </Stack>
    </SidebarContent>
  );
}
