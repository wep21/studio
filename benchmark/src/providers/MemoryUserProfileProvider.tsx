// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useCallback, useState } from "react";

import { useShallowMemo } from "@foxglove/hooks";
import { LayoutID } from "@foxglove/studio-base";
import {
  UserProfile,
  UserProfileStorageContext,
} from "@foxglove/studio-base/context/UserProfileStorageContext";

export default function MemoryUserProfileProvider({
  children,
}: PropsWithChildren<unknown>): JSX.Element {
  const [userProfile, setUserProfileActual] = useState<UserProfile>({
    currentLayoutId: "benchmark-raw-messages" as LayoutID,
  });
  const getUserProfile = useCallback(async (): Promise<UserProfile> => {
    return userProfile;
  }, [userProfile]);

  const setUserProfile = useCallback(async (profile: UserProfile): Promise<void> => {
    setUserProfileActual(profile);
  }, []);

  const storage = useShallowMemo({
    getUserProfile,
    setUserProfile,
  });
  return (
    <UserProfileStorageContext.Provider value={storage}>
      {children}
    </UserProfileStorageContext.Provider>
  );
}
