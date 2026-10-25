import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { LoginForm } from '@/components/twenty/login-form';
import { useTwentySession } from '@/components/twenty/twenty-session-context';
import { SidebarSection } from '@/components/sidebar';
import { FloatingBarSpace } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { TWENTY_OBJECTS } from '@/lib/twenty';

// Inicio: el panel de Twenty. Cada objeto (empresas, personas, tareas…) abre su lista con los datos de tu cuenta.
export default function HomeScreen() {
  const colors = useColors();
  const { token, signOut } = useTwentySession();

  if (token === undefined) return null;
  if (token === null) {
    return (
      <ScrollView style={{ backgroundColor: colors.sidebar }}>
        <LoginForm />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.sidebar }} contentContainerStyle={{ paddingBottom: FloatingBarSpace + 20 }}>
      <SidebarSection id="twenty" title="Espacio de trabajo">
        {TWENTY_OBJECTS.map((o) => (
          <Pressable
            key={o.plural}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/twenty/[object]', params: { object: o.plural } })}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
            <Ionicons name={o.icon} size={20} color={colors.textSecondary} />
            <Text style={[styles.title, { color: colors.text }]}>{o.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        ))}
      </SidebarSection>
      <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOut}>
        <Text style={[styles.signOutText, { color: colors.danger }]}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 20, gap: 12 },
  title: { flex: 1, fontSize: 16 },
  signOut: { alignSelf: 'center', paddingVertical: 24 },
  signOutText: { fontSize: 15 },
});
