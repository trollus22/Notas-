import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { HomeSidebar } from '@/components/home-sidebar';
import { useColors } from '@/hooks/use-colors';
import { useIsTablet } from '@/hooks/use-is-tablet';

/** On iPhone this is the Inicio sidebar. On iPad the sidebar is fixed on the left and this pane is empty. */
export default function HomeScreen() {
  const colors = useColors();
  const tablet = useIsTablet();

  if (!tablet) return <HomeSidebar />;

  return (
    <View style={[styles.empty, { backgroundColor: colors.background }]}>
      <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
      <Text style={[styles.title, { color: colors.text }]}>Elige una página</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Selecciona una página de la barra lateral o crea una nueva.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  title: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  text: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
