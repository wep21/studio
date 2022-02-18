// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useMemo } from "react";

import { ExtensionInfo, ExtensionLoader, ExtensionLoaderContext } from "@foxglove/studio-base";

export default function MemoryExtensionLoaderProvider(
  props: PropsWithChildren<unknown>,
): JSX.Element {
  const registry = useMemo(() => {
    const extensions: ExtensionInfo[] = [];

    const loader: ExtensionLoader = {
      getExtensions: async () => extensions,
      loadExtension,
      downloadExtension,
      installExtension,
      uninstallExtension,
    };
    return loader;
  }, []);

  return (
    <ExtensionLoaderContext.Provider value={registry}>
      {props.children}
    </ExtensionLoaderContext.Provider>
  );
}

async function loadExtension(_id: string): Promise<string> {
  throw new Error(`not implemented`);
}

async function downloadExtension(_url: string): Promise<Uint8Array> {
  throw new Error("not implemented");
}

async function installExtension(_foxeFileData: Uint8Array): Promise<ExtensionInfo> {
  throw new Error("not implemented");
}

async function uninstallExtension(_id: string): Promise<boolean> {
  return false;
}
