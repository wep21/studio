// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  AppConfiguration,
  ChangeHandler,
  AppConfigurationValue,
  AppSetting,
} from "@foxglove/studio-base";

export default class MemoryAppConfiguration implements AppConfiguration {
  private store = new Map<string, AppConfigurationValue>();

  changeListeners = new Map<string, Set<ChangeHandler>>();

  get(key: string): AppConfigurationValue {
    if (key === AppSetting.OPEN_DIALOG) {
      return true;
    }

    return this.store.get(key);
  }
  async set(key: string, value: AppConfigurationValue): Promise<void> {
    if (value == undefined) {
      this.store.delete(key);
    } else {
      this.store.set(key, value);
    }
    const listeners = this.changeListeners.get(key);
    if (listeners) {
      // Copy the list of listeners to protect against mutation during iteration
      [...listeners].forEach((listener) => listener(value));
    }
  }

  addChangeListener(key: string, cb: ChangeHandler): void {
    let listeners = this.changeListeners.get(key);
    if (!listeners) {
      listeners = new Set();
      this.changeListeners.set(key, listeners);
    }
    listeners.add(cb);
  }

  removeChangeListener(key: string, cb: ChangeHandler): void {
    const listeners = this.changeListeners.get(key);
    if (listeners) {
      listeners.delete(cb);
    }
  }
}
