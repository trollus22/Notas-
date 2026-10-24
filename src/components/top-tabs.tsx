import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';

import { WorkspaceAvatar } from './workspace-menu';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<string, { label: string; active: IconName; inactive: IconName }> = {
  index: { label: 'Inicio', active: 'home', inactive: 'home-outline' },
  chats: { label: 'Chats', active: 'chatbubble', inactive: 'chatbubble-outline' },
  meetings: { label: 'Reuniones', active: 'calendar-clear', inactive: 'calendar-clear-outline' },
  inbox: { label: 'Bandeja de entrada', active: 'file-tray', inactive: 'file-tray-outline' },
};

/** Workspace avatar plus pill-shaped tabs; the selected tab shows its name. */
export function TopTabs({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: colors.sidebar }]}>
      <WorkspaceAvatar />
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            style={[
              styles.tab,
              focused ? styles.tabSelected : styles.tabIdle,
              { backgroundColor: focused ? colors.tabSelected : colors.tabIdle },
            ]}>
            <Ionicons name={focused ? tab.active : tab.inactive} size={focused ? 19 : 20} color={focused ? colors.text : colors.textSecondary} />
            {focused ? (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.label, { color: colors.text }]}>
                {tab.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  tab: { height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabIdle: { width: 52 },
  tabSelected: { flexShrink: 1, gap: 8, paddingHorizontal: 22, maxWidth: 150 },
  label: { fontSize: 17, fontWeight: '500', flexShrink: 1 },
});
