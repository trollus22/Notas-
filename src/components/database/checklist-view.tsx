import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NotionIcon } from '@/components/notion-icon';
import type { Palette } from '@/constants/theme';
import { pageTitle } from '@/lib/format';
import type { Block, StatusGroup } from '@/lib/types';

/** Tasks as a checklist; the box shows the status group (empty, in progress, done). */
export function ChecklistView({
  rows,
  groupOf,
  gutter,
  colors,
  onToggle,
  onOpenRow,
  onCreateRow,
}: {
  rows: Block[];
  groupOf: (row: Block) => StatusGroup;
  gutter: number;
  colors: Palette;
  onToggle: (row: Block) => void;
  onOpenRow: (row: Block) => void;
  onCreateRow: () => void;
}) {
  return (
    <View style={{ paddingLeft: gutter + 10, paddingRight: 16 }}>
      {rows.map((row) => {
        const group = groupOf(row);
        const filled = group !== 'todo';
        return (
          <View key={row.id} style={styles.row}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: group === 'complete' ? true : group === 'inProgress' ? 'mixed' : false }}
              accessibilityLabel={pageTitle(row)}
              hitSlop={10}
              onPress={() => onToggle(row)}
              style={[
                styles.box,
                filled ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.textTertiary },
              ]}>
              {group === 'complete' ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
              {group === 'inProgress' ? <View style={styles.minus} /> : null}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onOpenRow(row)} style={styles.title}>
              <NotionIcon icon={row.icon} size={18} />
              <Text numberOfLines={1} style={[styles.titleText, { color: colors.text }]}>
                {pageTitle(row)}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <Pressable accessibilityRole="button" onPress={onCreateRow} style={styles.create}>
        <Ionicons name="add" size={19} color={colors.textTertiary} />
        <Text style={[styles.createText, { color: colors.textTertiary }]}>Crear tarea</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  box: { width: 15, height: 15, borderRadius: 3, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center' },
  minus: { width: 7, height: 1.6, borderRadius: 1, backgroundColor: '#FFFFFF' },
  title: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  titleText: { flex: 1, fontSize: 16, fontWeight: '500' },
  create: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 },
  createText: { fontSize: 15 },
});
