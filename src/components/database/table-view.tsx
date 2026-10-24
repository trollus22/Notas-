import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Palette, Scheme } from '@/constants/theme';
import { pageTitle } from '@/lib/format';
import type { Block, Property, PropertyType } from '@/lib/types';

import { PROPERTY_ICONS, PropertyValueView } from './property-value';

const TITLE_WIDTH = 284;
const WIDTHS: Record<PropertyType, number> = {
  status: 128,
  person: 128,
  date: 112,
  select: 100,
  multiSelect: 160,
  text: 260,
};

export interface RowHandlers {
  onOpenRow: (row: Block) => void;
  onEditProperty: (row: Block, property: Property) => void;
  onCreateRow: () => void;
}

/** Spreadsheet-like view: title column with "ABRIR", one column per property. */
export function TableView({
  rows,
  columns,
  gutter,
  colors,
  scheme,
  emptyActions,
  handlers,
}: {
  rows: Block[];
  columns: Property[];
  gutter: number;
  colors: Palette;
  scheme: Scheme;
  /** Shown instead of rows when a filtered view matches nothing. */
  emptyActions?: { onEditFilters: () => void };
  handlers: RowHandlers;
}) {
  const lines = { borderColor: colors.hairline };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: gutter, paddingRight: 16 }}>
      <View>
        <View style={[styles.row, styles.header, lines]}>
          <View style={[styles.cell, styles.headerCell, { width: TITLE_WIDTH }]}>
            <Text style={[styles.titleGlyph, { color: colors.textTertiary }]}>Aa</Text>
            <Text style={[styles.headerText, { color: colors.textTertiary }]}>Task name</Text>
          </View>
          {columns.map((property) => (
            <View key={property.id} style={[styles.cell, styles.headerCell, styles.divided, lines, { width: WIDTHS[property.type] }]}>
              <Ionicons name={PROPERTY_ICONS[property.type]} size={15} color={colors.textTertiary} />
              <Text numberOfLines={1} style={[styles.headerText, { color: colors.textTertiary }]}>
                {property.name}
              </Text>
            </View>
          ))}
        </View>

        {rows.map((row) => (
          <View key={row.id} style={[styles.row, lines]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pageTitle(row)}
              onPress={() => handlers.onOpenRow(row)}
              style={[styles.cell, styles.titleCell, { width: TITLE_WIDTH }]}>
              <Text numberOfLines={1} style={[styles.rowTitle, { color: row.text ? colors.text : colors.textTertiary }]}>
                {pageTitle(row)}
              </Text>
              <View style={[styles.open, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.openText, { color: colors.textSecondary }]}>ABRIR</Text>
              </View>
            </Pressable>
            {columns.map((property) => (
              <Pressable
                key={property.id}
                accessibilityRole="button"
                accessibilityLabel={`${property.name} de ${pageTitle(row)}`}
                onPress={() => handlers.onEditProperty(row, property)}
                style={[styles.cell, styles.divided, lines, { width: WIDTHS[property.type] }]}>
                <PropertyValueView property={property} value={row.props?.[property.id]} scheme={scheme} textColor={colors.text} />
              </Pressable>
            ))}
          </View>
        ))}

        {rows.length === 0 && emptyActions ? (
          <View style={styles.emptyActions}>
            <Pressable
              accessibilityRole="button"
              onPress={emptyActions.onEditFilters}
              style={[styles.outlined, { borderColor: colors.border }]}>
              <Ionicons name="filter" size={16} color={colors.textSecondary} />
              <Text style={[styles.outlinedText, { color: colors.textSecondary }]}>Editar filtros</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handlers.onCreateRow}
              style={[styles.outlined, { borderColor: colors.border }]}>
              <Ionicons name="add" size={18} color={colors.textSecondary} />
              <Text style={[styles.outlinedText, { color: colors.textSecondary }]}>Crear tarea</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={handlers.onCreateRow} style={styles.create}>
            <Ionicons name="add" size={19} color={colors.textTertiary} />
            <Text style={[styles.createText, { color: colors.textTertiary }]}>Crear tarea</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 45 },
  header: { minHeight: 36 },
  cell: { justifyContent: 'center', paddingHorizontal: 8 },
  headerCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  divided: { borderLeftWidth: StyleSheet.hairlineWidth },
  titleGlyph: { fontSize: 14, fontWeight: '600' },
  headerText: { fontSize: 15, flexShrink: 1 },
  titleCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 12 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '500' },
  open: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  openText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  create: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 45, paddingLeft: 10 },
  createText: { fontSize: 15 },
  emptyActions: { flexDirection: 'row', gap: 16, paddingLeft: 18, paddingTop: 54 },
  outlined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 34,
  },
  outlinedText: { fontSize: 16 },
});
