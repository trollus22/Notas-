import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NotionIcon } from '@/components/notion-icon';
import { notionColor } from '@/constants/notion-colors';
import type { Palette, Scheme } from '@/constants/theme';
import type { BoardColumn } from '@/lib/database';
import { pageTitle } from '@/lib/format';
import type { Block, Property, PropertyValue } from '@/lib/types';

import { PropertyValueView, StatusPill } from './property-value';

const COLUMN_WIDTH = 272;

/** Kanban columns, one per option of the grouping property. */
export function BoardView({
  columns,
  groupBy,
  cardProperties,
  gutter,
  colors,
  scheme,
  onOpenRow,
  onCreateRow,
}: {
  columns: BoardColumn[];
  groupBy: Property | undefined;
  /** Properties shown on each card, under the title. */
  cardProperties: Property[];
  gutter: number;
  colors: Palette;
  scheme: Scheme;
  onOpenRow: (row: Block) => void;
  onCreateRow: (props: Record<string, PropertyValue>) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.columns, { paddingLeft: gutter }]}>
      {columns.map((column) => {
        const palette = notionColor(scheme, column.option?.color ?? 'gray');
        const accent = column.option?.color === 'blue' ? palette.text : colors.textSecondary;
        const createProps = groupBy ? { [groupBy.id]: column.option?.id ?? null } : {};
        return (
          <View key={column.option?.id ?? 'none'} style={[styles.column, { backgroundColor: palette.callout }]}>
            <View style={styles.columnHeader}>
              {column.option ? (
                <StatusPill option={column.option} scheme={scheme} size="small" />
              ) : (
                <Text style={[styles.noValue, { color: colors.textSecondary }]}>Sin {groupBy?.name ?? 'valor'}</Text>
              )}
              <Text style={[styles.count, { color: colors.textSecondary }]}>{column.rows.length}</Text>
              <View style={styles.spacer} />
              <Ionicons name="ellipsis-horizontal" size={17} color={colors.textSecondary} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Crear tarea en ${column.option?.name ?? 'sin valor'}`}
                hitSlop={8}
                onPress={() => onCreateRow(createProps)}>
                <Ionicons name="add" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {column.rows.map((row) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={pageTitle(row)}
                onPress={() => onOpenRow(row)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow },
                  pressed && { opacity: 0.8 },
                ]}>
                <View style={styles.cardTitleRow}>
                  <NotionIcon icon={row.icon} size={17} />
                  <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.text }]}>
                    {pageTitle(row)}
                  </Text>
                </View>
                {cardProperties.map((property) => {
                  const value = row.props?.[property.id];
                  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) return null;
                  return (
                    <View key={property.id} style={styles.cardProperty}>
                      <PropertyValueView property={property} value={value} scheme={scheme} textColor={colors.textSecondary} />
                    </View>
                  );
                })}
              </Pressable>
            ))}

            <Pressable
              accessibilityRole="button"
              onPress={() => onCreateRow(createProps)}
              style={({ pressed }) => [
                styles.create,
                { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)' },
                pressed && { opacity: 0.7 },
              ]}>
              <Ionicons name="add" size={21} color={accent} />
              <Text style={[styles.createText, { color: accent }]}>Crear tarea</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  columns: { gap: 12, paddingRight: 16, alignItems: 'flex-start' },
  column: { width: COLUMN_WIDTH, borderRadius: 10, padding: 8, gap: 8 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2, height: 30 },
  noValue: { fontSize: 14 },
  count: { fontSize: 14 },
  spacer: { flex: 1 },
  card: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 6,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '500' },
  cardProperty: { flexDirection: 'row' },
  create: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, height: 50, paddingHorizontal: 10 },
  createText: { fontSize: 17 },
});
