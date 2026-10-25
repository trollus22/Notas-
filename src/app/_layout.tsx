import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { HomeSidebar } from '@/components/home-sidebar';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/hooks/use-colors';
import { useIsTablet } from '@/hooks/use-is-tablet';
import { WorkspaceProvider } from '@/store/workspace-context';

/** Width of the fixed sidebar on iPad. */
const SIDEBAR_WIDTH = 320;

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, borderRightWidth: StyleSheet.hairlineWidth },
  detail: { flex: 1 },
});

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

  const tablet = useIsTablet();

  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="page/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="search" options={{ animation: 'fade' }} />
      <Stack.Screen name="recents" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="trash" />
    </Stack>
  );

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {tablet ? (
        <View style={styles.split}>
          <View style={[styles.sidebar, { borderRightColor: palette.border }]}>
            <HomeSidebar fixed />
          </View>
          <View style={styles.detail}>{stack}</View>
        </View>
      ) : (
        stack
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <WorkspaceProvider onReady={hideSplash}>
      <ThemedStack />
    </WorkspaceProvider>
  );
}
