import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { goBack } from '@/lib/navigation';

/** Back chevron with a centred title, as on the settings screen. */
export function ScreenTitleBar({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Atrás" hitSlop={10} onPress={goBack} style={styles.back}>
        <Ionicons name="chevron-back" size={25} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 46, paddingHorizontal: 12 },
  back: { width: 40, height: 44, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
});
