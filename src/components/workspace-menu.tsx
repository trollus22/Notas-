import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { inform, notConnectedYet } from '@/lib/confirm';
import { WORKSPACE_NAME } from '@/store/seed';

import { Popover } from './popover';
import { Sheet } from './sheet';

/** The round workspace avatar at the top left; opens the workspace menu. */
export function WorkspaceAvatar() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Espacio de trabajo"
        onPress={() => setMenuOpen(true)}
        style={({ pressed }) => [
          styles.avatar,
          { backgroundColor: colors.floating, borderColor: colors.border },
          pressed && { backgroundColor: colors.surfacePressed },
        ]}>
        <Text style={[styles.avatarLetter, { color: colors.textSecondary }]}>{WORKSPACE_NAME[0]}</Text>
      </Pressable>

      <Popover
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        position={{ top: insets.top + 4, left: 16 }}
        items={[
          {
            label: 'Cambiar de espacio de trabajo',
            icon: 'swap-horizontal',
            separatorAfter: true,
            onPress: () => setTimeout(() => setAccountsOpen(true), 250),
          },
          { label: 'Configuración', icon: 'settings-outline', onPress: () => router.push('/settings') },
          {
            label: 'Páginas sin conexión',
            icon: 'arrow-down-circle-outline',
            onPress: () =>
              inform('Páginas sin conexión', 'Todo tu espacio se guarda en este dispositivo, así que está disponible sin conexión.'),
          },
          {
            label: 'Miembros',
            icon: 'people-outline',
            onPress: () => inform('Miembros', `${WORKSPACE_NAME} es un espacio local con un solo miembro: tú.`),
          },
          { label: 'Papelera', icon: 'trash-outline', onPress: () => router.push('/trash') },
          {
            label: 'Ayuda y soporte',
            icon: 'help-circle-outline',
            onPress: () =>
              inform(
                'Ayuda y soporte',
                'Escribe “/” en una página para añadir bloques. Mantén pulsado el lápiz para crear un chat o una página, y el botón de la izquierda para ver tus recientes.',
              ),
          },
        ]}
      />

      <Sheet visible={accountsOpen} onClose={() => setAccountsOpen(false)} title="Cuentas">
        <View style={styles.accountHeader}>
          <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>Cuenta local</Text>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </View>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <View style={styles.workspaceRow}>
            <View style={[styles.workspaceAvatar, { backgroundColor: '#2E8B6A' }]}>
              <Text style={styles.workspaceLetter}>{WORKSPACE_NAME[0]}</Text>
            </View>
            <View style={styles.workspaceText}>
              <Text style={[styles.workspaceName, { color: colors.text }]}>{WORKSPACE_NAME}</Text>
              <Text style={[styles.workspacePlan, { color: colors.textSecondary }]}>En este dispositivo</Text>
            </View>
            <Ionicons name="checkmark" size={18} color={colors.textSecondary} />
          </View>
          <AccountAction icon="add-circle-outline" label="Nuevo espacio de trabajo" onPress={() => notConnectedYet('Nuevo espacio de trabajo')} />
        </View>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <AccountAction icon="add-circle-outline" label="Añadir otra cuenta" onPress={() => notConnectedYet('Añadir otra cuenta')} />
          <AccountAction
            icon="close-circle-outline"
            label="Cerrar sesión"
            destructive
            onPress={() => inform('Cerrar sesión', 'No hay ninguna sesión iniciada: tus páginas solo están en este dispositivo.')}
          />
        </View>
      </Sheet>
    </>
  );
}

function AccountAction({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: 'add-circle-outline' | 'close-circle-outline';
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const color = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.workspaceRow, pressed && { backgroundColor: colors.surfacePressed }]}>
      <Ionicons name={icon} size={24} color={destructive ? colors.danger : colors.textSecondary} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 17, fontWeight: '500' },
  accountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  accountEmail: { fontSize: 15, fontWeight: '500' },
  group: { borderRadius: 18, marginHorizontal: 14, marginBottom: 14, paddingVertical: 4 },
  workspaceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  workspaceAvatar: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  workspaceLetter: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  workspaceText: { flex: 1 },
  workspaceName: { fontSize: 16 },
  workspacePlan: { fontSize: 13, marginTop: 1 },
  actionLabel: { fontSize: 16 },
});
