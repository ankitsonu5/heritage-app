import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PortalProvider } from './components/Portal';
import RootNavigator from './navigation/RootNavigator';
import { SessionProvider } from './store/session';
import { C } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Rural connectivity is flaky; a couple of retries beats a red error card.
      retry: 2,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
  },
});

export default function HeritageApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SafeAreaProvider>
          <StatusBar backgroundColor={C.maroon} barStyle="light-content" />
          {/* Overlays render inside the app, not at document.body — see Portal.tsx. */}
          <PortalProvider>
            <RootNavigator />
          </PortalProvider>
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
