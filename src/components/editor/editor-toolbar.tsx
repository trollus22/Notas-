import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Palette } from '@/constants/theme';

export type ToolbarAction =
  | 'insert'
  | 'turnInto'
  | 'todo'
  | 'indent'
  | 'outdent'
  | 'moveUp'
  | 'moveDown'
  | 'delete'
  | 'dismiss';

const BUTTONS: { action: Exclude<ToolbarAction, 'turnInto' | 'dismiss'>; icon: ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { action: 'todo', icon: 'checkbox-outline', label: 'Lista de tareas' },
  { action: 'outdent', icon: 'arrow-back-outline', label: 'Quitar sangría' },
  { action: 'indent', icon: 'arrow-forward-outline', label: 'Sangrar' },
  { action: 'moveUp', icon: 'arrow-up-outline', label: 'Mover arriba' },
  { action: 'moveDown', icon: 'arrow-down-outline', label: 'Mover abajo' },
  { action: 'delete', icon: 'trash-outline', label: 'Eliminar bloque' },
];

/** Formatting bar that sits on top of the keyboard while a block is selected. */
export function EditorToolbar({ colors, onAction }: { colors: Palette; onAction: (action: ToolbarAction) => void }) {
  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Pressable accessibilityLabel="Añadir bloque" onPress={() => onAction('insert')} style={styles.button}>
          <Ionicons name="add" size={24} color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Convertir en" onPress={() => onAction('turnInto')} style={styles.button}>
          <Text style={[styles.turnInto, { color: colors.text }]}>Aa</Text>
        </Pressable>
        {BUTTONS.map((button) => (
          <Pressable
            key={button.action}
            accessibilityLabel={button.label}
            onPress={() => onAction(button.action)}
            style={styles.button}>
            <Ionicons name={button.icon} size={21} color={colors.text} />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        accessibilityLabel="Ocultar teclado"
        onPress={() => onAction('dismiss')}
        style={[styles.button, styles.dismiss, { borderLeftColor: colors.border }]}>
        <Ionicons name="chevron-down" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 46, borderTopWidth: StyleSheet.hairlineWidth },
  scroll: { alignItems: 'center', paddingHorizontal: 4 },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  turnInto: { fontSize: 17, fontWeight: '600' },
  dismiss: { borderLeftWidth: StyleSheet.hairlineWidth },
});
