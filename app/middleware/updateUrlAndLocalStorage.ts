// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { PANELS_ACTION_TYPES } from "@foxglove-studio/app/actions/panels";
import { getGlobalHooks } from "@foxglove-studio/app/loadWebviz";
import { Store } from "@foxglove-studio/app/reducers";
import { setPersistedStateInLocalStorage } from "@foxglove-studio/app/reducers/panels";
import { getShouldProcessPatch } from "@foxglove-studio/app/util/layout";

type Action = { type: string; payload: any };

let updateUrlTimer: ReturnType<typeof setTimeout> | undefined;

function maybeSetPersistedStateInLocalStorage(store: Store, skipSettingLocalStorage: boolean) {
  if (skipSettingLocalStorage) {
    return;
  }
  const state = store.getState();
  const persistedState = {
    ...state.persistedState,
  };
  setPersistedStateInLocalStorage(persistedState);
}

const {
  LOAD_LAYOUT,
  IMPORT_PANEL_LAYOUT,
  CHANGE_PANEL_LAYOUT,
  SAVE_PANEL_CONFIGS,
  SAVE_FULL_PANEL_CONFIG,
  CREATE_TAB_PANEL,
  OVERWRITE_GLOBAL_DATA,
  SET_GLOBAL_DATA,
  SET_USER_NODES,
  SET_LINKED_GLOBAL_VARIABLES,
  SET_PLAYBACK_CONFIG,
  CLOSE_PANEL,
  SPLIT_PANEL,
  SWAP_PANEL,
  MOVE_TAB,
  ADD_PANEL,
  DROP_PANEL,
  START_DRAG,
  END_DRAG,
} = PANELS_ACTION_TYPES;

const updateUrlActions = [
  LOAD_LAYOUT,
  IMPORT_PANEL_LAYOUT,
  CHANGE_PANEL_LAYOUT,
  SAVE_PANEL_CONFIGS,
  SAVE_FULL_PANEL_CONFIG,
  CREATE_TAB_PANEL,
  OVERWRITE_GLOBAL_DATA,
  SET_GLOBAL_DATA,
  SET_USER_NODES,
  SET_LINKED_GLOBAL_VARIABLES,
  SET_PLAYBACK_CONFIG,
  CLOSE_PANEL,
  SPLIT_PANEL,
  SWAP_PANEL,
  MOVE_TAB,
  ADD_PANEL,
  DROP_PANEL,
  START_DRAG,
  END_DRAG,
].map((item) => item.toString());

const updateUrlAndLocalStorageMiddlewareDebounced = (store: Store) => (
  next: (arg0: Action) => any,
) => (action: Action) => {
  const result = next(action); // eslint-disable-line callback-return
  // Any action that changes panels state should potentially trigger a URL update.
  const skipSettingLocalStorage = !!action.payload?.skipSettingLocalStorage;

  if (updateUrlActions.includes(action.type)) {
    if (updateUrlTimer) {
      clearTimeout(updateUrlTimer);
    }
    updateUrlTimer = setTimeout(async () => {
      const shouldProcessPatch = getShouldProcessPatch();
      if (!shouldProcessPatch) {
        maybeSetPersistedStateInLocalStorage(store, skipSettingLocalStorage);
        return result;
      }
      await getGlobalHooks().updateUrlToTrackLayoutChanges({
        store,
        skipPatch: action.type === LOAD_LAYOUT,
      });

      maybeSetPersistedStateInLocalStorage(store, skipSettingLocalStorage);
      return result;
    }, 500);
  }

  maybeSetPersistedStateInLocalStorage(store, skipSettingLocalStorage);
  return result;
};

export default updateUrlAndLocalStorageMiddlewareDebounced;
