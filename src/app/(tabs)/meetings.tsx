import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { notConnectedYet } from '@/lib/confirm';

export default function MeetingsScreen() {
  const colors = useColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.sidebar }]}>
      <Ionicons name="reader-outline" size={30} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.text }]}>Aún no hay ninguna reunión</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Registra las conversaciones donde quieras con el Anotador con IA
      </Text>
      <Pressable accessibilityRole="button" onPress={() => notConnectedYet('Anotador con IA')} hitSlop={8}>
        <Text style={[styles.link, { color: colors.accent }]}>Iniciar una nueva reunión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 140, gap: 6 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  text: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  link: { fontSize: 16, marginTop: 16 },
});
