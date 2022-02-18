// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo } from "react";
import { useMedia } from "react-use";

import {
  App,
  ErrorBoundary,
  MultiProvider,
  IDataSourceFactory,
  ThemeProvider,
  StudioToastProvider,
  CssBaseline,
  GlobalCss,
  AppSetting,
  useAppConfigurationValue,
  AppConfigurationContext,
} from "@foxglove/studio-base";

import MemoryExtensionLoaderProvider from "./providers/MemoryExtensionLoaderProvider";
import MemoryLayoutStorageProvider from "./providers/MemoryLayoutStorageProvider";
import MemoryUserProfileProvider from "./providers/MemoryUserProfileProvider";
import McapLocalBenchmarkDataSourceFactory from "./services/McapLocalBenchmarkDataSourceFactory";
import MemoryAppConfiguration from "./services/MemoryAppConfiguration";

// useAppConfiguration requires the AppConfigurationContext which is setup in Root
// AppWrapper is used to make a functional component so we can use the context
function AppWrapper() {
  const dataSources: IDataSourceFactory[] = useMemo(() => {
    return [new McapLocalBenchmarkDataSourceFactory()];
  }, []);

  return <App availableSources={dataSources} deepLinks={[window.location.href]} />;
}

function ColorSchemeThemeProvider({ children }: React.PropsWithChildren<unknown>): JSX.Element {
  const [colorScheme = "dark"] = useAppConfigurationValue<string>(AppSetting.COLOR_SCHEME);
  const systemSetting = useMedia("(prefers-color-scheme: dark)");
  const isDark = colorScheme === "dark" || (colorScheme === "system" && systemSetting);
  return <ThemeProvider isDark={isDark}>{children}</ThemeProvider>;
}

const appConfig = new MemoryAppConfiguration();

export function Root(): JSX.Element {
  const providers = [
    /* eslint-disable react/jsx-key */
    <StudioToastProvider />,
    <MemoryLayoutStorageProvider />,
    <MemoryExtensionLoaderProvider />,
    <MemoryUserProfileProvider />,
    /* eslint-enable react/jsx-key */
  ];

  return (
    <AppConfigurationContext.Provider value={appConfig}>
      <ColorSchemeThemeProvider>
        <GlobalCss />
        <CssBaseline>
          <ErrorBoundary>
            <MultiProvider providers={providers}>
              <AppWrapper />
            </MultiProvider>
          </ErrorBoundary>
        </CssBaseline>
      </ColorSchemeThemeProvider>
    </AppConfigurationContext.Provider>
  );
}
