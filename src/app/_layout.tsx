import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { useScheme } from '@/hooks/use-colors';
import { TwentyGate } from '@/components/twenty/twenty-gate';
import { TwentySessionProvider } from '@/components/twenty/twenty-session-context';
import { WorkspaceProvider } from '@/store/workspace-context';

SplashScreen.preventAutoHideAsync();

const hideSplash = () => {
  void SplashScreen.hideAsync();
};

function ThemedStack() {
  const scheme = useScheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme];
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.border,
      primary: palette.accent,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="page/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="recents" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="trash" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <TwentySessionProvider>
      <WorkspaceProvider onReady={hideSplash}>
        <TwentyGate>
          <ThemedStack />
        </TwentyGate>
      </WorkspaceProvider>
    </TwentySessionProvider>
  );
}
