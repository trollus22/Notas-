import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet, SheetCard } from '@/components/sheet';
import type { Palette } from '@/constants/theme';
import type { DatabaseView, ViewType } from '@/lib/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const NEW_VIEW_TYPES: { type: ViewType; label: string; icon: IconName }[] = [
  { type: 'table', label: 'Tabla', icon: 'grid-outline' },
  { type: 'board', label: 'Tablero', icon: 'albums-outline' },
  { type: 'checklist', label: 'Checklist', icon: 'list' },
];

/** "N vistas" sheet: pick a view, delete one, or add a new one. */
export function ViewsSheet({
  visible,
  views,
  currentId,
  colors,
  onClose,
  onSelect,
  onRemove,
  onAdd,
  onNewSource,
}: {
  visible: boolean;
  views: DatabaseView[];
  currentId: string | undefined;
  colors: Palette;
  onClose: () => void;
  onSelect: (view: DatabaseView) => void;
  onRemove: (view: DatabaseView) => void;
  onAdd: (type: ViewType) => void;
  onNewSource: () => void;
}) {
  const [choosing, setChoosing] = useState(false);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      tall
      grouped
      title={`${views.length} ${views.length === 1 ? 'vista' : 'vistas'}`}
      headerRight={
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
          <Text style={[styles.done, { color: colors.accent }]}>Listo</Text>
        </Pressable>
      }>
      <SheetCard>
        {views.map((view, index) => (
          <View key={view.id}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.hairline }]} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={view.name}
              accessibilityState={{ selected: view.id === currentId }}
              onPress={() => {
                onSelect(view);
                onClose();
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
              <Ionicons name={view.icon as IconName} size={19} color={colors.text} />
              <Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>
                {view.name}
              </Text>
              {views.length > 1 ? (
                <Pressable accessibilityLabel={`Eliminar la vista ${view.name}`} hitSlop={8} onPress={() => onRemove(view)}>
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </Pressable>
          </View>
        ))}
      </SheetCard>
      <SheetCard>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: choosing }}
          onPress={() => setChoosing((open) => !open)}
          style={({ pressed }) => [styles.row, styles.tallRow, pressed && { backgroundColor: colors.surfacePressed }]}>
          <Ionicons name="add-circle" size={21} color={colors.accent} />
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: colors.text }]}>Nueva vista</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tabla, tablero o checklist</Text>
          </View>
        </Pressable>
        {choosing
          ? NEW_VIEW_TYPES.map((option) => (
              <Pressable
                key={option.type}
                accessibilityRole="button"
                accessibilityLabel={`Nueva vista de ${option.label.toLowerCase()}`}
                onPress={() => {
                  setChoosing(false);
                  onAdd(option.type);
                }}
                style={({ pressed }) => [styles.row, styles.choice, pressed && { backgroundColor: colors.surfacePressed }]}>
                <Ionicons name={option.icon} size={18} color={colors.textSecondary} />
                <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
              </Pressable>
            ))
          : null}
        <View style={[styles.separator, { backgroundColor: colors.hairline }]} />
        <Pressable
          accessibilityRole="button"
          onPress={onNewSource}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
          <Ionicons name="duplicate-outline" size={19} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Nueva fuente de datos</Text>
        </Pressable>
      </SheetCard>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  done: { fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 14 },
  label: { flex: 1, fontSize: 17 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  tallRow: { minHeight: 58, alignItems: 'flex-start', paddingTop: 10 },
  rowText: { flex: 1 },
  subtitle: { fontSize: 13, marginTop: 2 },
  choice: { paddingLeft: 48 },
});
