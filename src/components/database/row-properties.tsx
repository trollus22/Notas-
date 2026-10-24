import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors, useScheme } from '@/hooks/use-colors';
import { setRowProperty } from '@/lib/database';
import type { Block, Property } from '@/lib/types';
import { useWorkspace } from '@/store/workspace-context';

import { PropertyEditor } from './property-editor';
import { PROPERTY_ICONS, PropertyValueView } from './property-value';

/** The property list at the top of a database row's page. */
export function RowProperties({ database, row }: { database: Block; row: Block }) {
  const colors = useColors();
  const scheme = useScheme();
  const workspace = useWorkspace();
  const [editing, setEditing] = useState<Property | null>(null);

  return (
    <View style={[styles.list, { borderBottomColor: colors.hairline }]}>
      {(database.schema ?? []).map((property) => {
        const value = row.props?.[property.id];
        const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
        return (
          <Pressable
            key={property.id}
            accessibilityRole="button"
            accessibilityLabel={property.name}
            onPress={() => setEditing(property)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
            <View style={styles.name}>
              <Ionicons name={PROPERTY_ICONS[property.type]} size={16} color={colors.textSecondary} />
              <Text numberOfLines={1} style={[styles.nameText, { color: colors.textSecondary }]}>
                {property.name}
              </Text>
            </View>
            <View style={styles.value}>
              {empty ? (
                <Text style={[styles.empty, { color: colors.textTertiary }]}>Vacío</Text>
              ) : (
                <PropertyValueView property={property} value={value} scheme={scheme} textColor={colors.text} />
              )}
            </View>
          </Pressable>
        );
      })}
      <PropertyEditor
        property={editing}
        value={editing ? row.props?.[editing.id] : undefined}
        onChange={(value) => {
          if (editing) workspace.apply(setRowProperty(workspace.getTree(), row.id, editing.id, value, Date.now()));
        }}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 38, borderRadius: 4 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 130 },
  nameText: { fontSize: 15, flexShrink: 1 },
  value: { flex: 1 },
  empty: { fontSize: 15 },
});
