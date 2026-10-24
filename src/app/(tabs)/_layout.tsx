import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { FloatingBar } from '@/components/floating-bar';
import { TopTabs } from '@/components/top-tabs';
import { useColors } from '@/hooks/use-colors';

export default function TabsLayout() {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.sidebar }]}>
      <Tabs
        tabBar={(props) => <TopTabs {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarPosition: 'top',
          sceneStyle: { backgroundColor: colors.sidebar },
        }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="chats" />
        <Tabs.Screen name="meetings" />
        <Tabs.Screen name="inbox" />
      </Tabs>
      <FloatingBar mode="search" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
