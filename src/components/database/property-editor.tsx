import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { webNoOutline } from '@/components/editor/block-row';
import { Sheet } from '@/components/sheet';
import type { Palette } from '@/constants/theme';
import { useColors, useScheme } from '@/hooks/use-colors';
import { formatDate, isoDate, ME } from '@/lib/database';
import type { Property, PropertyValue } from '@/lib/types';

import { StatusPill, TagPill } from './property-value';

/** Bottom sheet to change one property value of a database row. */
export function PropertyEditor({
  property,
  value,
  onChange,
  onClose,
}: {
  property: Property | null;
  value: PropertyValue | undefined;
  onChange: (value: PropertyValue) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={property !== null} onClose={onClose} title={property?.name}>
      {property ? <EditorBody key={property.id} property={property} value={value} onChange={onChange} onClose={onClose} /> : null}
    </Sheet>
  );
}

function EditorBody({
  property,
  value,
  onChange,
  onClose,
}: {
  property: Property;
  value: PropertyValue | undefined;
  onChange: (value: PropertyValue) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const scheme = useScheme();
  const [text, setText] = useState(typeof value === 'string' ? value : '');

  const choose = (next: PropertyValue) => {
    onChange(next);
    onClose();
  };

  switch (property.type) {
    case 'status':
    case 'select':
      return (
        <View>
          {(property.options ?? []).map((option) => (
            <OptionRow colors={colors} key={option.id} selected={value === option.id} onPress={() => choose(option.id)}>
              {property.type === 'status' ? <StatusPill option={option} scheme={scheme} /> : <TagPill option={option} scheme={scheme} />}
            </OptionRow>
          ))}
          {property.type === 'select' ? (
            <OptionRow colors={colors} selected={!value} onPress={() => choose(null)}>
              <Text style={[styles.optionText, { color: colors.textSecondary }]}>Vacío</Text>
            </OptionRow>
          ) : null}
        </View>
      );
    case 'multiSelect': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <View>
          {(property.options ?? []).map((option) => {
            const isOn = selected.includes(option.id);
            return (
              <OptionRow
                colors={colors}
                key={option.id}
                selected={isOn}
                onPress={() => onChange(isOn ? selected.filter((id) => id !== option.id) : [...selected, option.id])}>
                <TagPill option={option} scheme={scheme} />
              </OptionRow>
            );
          })}
        </View>
      );
    }
    case 'person':
      return (
        <View>
          <OptionRow colors={colors} selected={value === ME} onPress={() => choose(ME)}>
            <Text style={[styles.optionText, { color: colors.text }]}>{ME}</Text>
          </OptionRow>
          <OptionRow colors={colors} selected={!value} onPress={() => choose(null)}>
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>Sin asignar</Text>
          </OptionRow>
        </View>
      );
    case 'date': {
      const today = new Date();
      const plus = (days: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));
      const choices: [string, PropertyValue][] = [
        ['Hoy', plus(0)],
        ['Mañana', plus(1)],
        ['En una semana', plus(7)],
        ['Sin fecha', null],
      ];
      return (
        <View>
          {value ? <Text style={[styles.current, { color: colors.textSecondary }]}>Ahora: {formatDate(value)}</Text> : null}
          {choices.map(([label, next]) => (
            <OptionRow colors={colors} key={label} selected={value === next} onPress={() => choose(next)}>
              <Text style={[styles.optionText, { color: colors.text }]}>{label}</Text>
            </OptionRow>
          ))}
        </View>
      );
    }
    case 'text':
      return (
        <View style={styles.textEditor}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            placeholder="Vacío"
            placeholderTextColor={colors.textTertiary}
            style={[styles.textInput, { color: colors.text, borderColor: colors.border }, webNoOutline]}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(text.trim() ? text : null)}
            style={[styles.save, { backgroundColor: colors.accent }]}>
            <Text style={styles.saveText}>Guardar</Text>
          </Pressable>
        </View>
      );
  }
}

function OptionRow({
  colors,
  selected,
  onPress,
  children,
}: {
  colors: Palette;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surfacePressed }]}>
      <View style={styles.optionBody}>{children}</View>
      {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, minHeight: 48 },
  optionBody: { flex: 1 },
  optionText: { fontSize: 16 },
  current: { fontSize: 14, paddingHorizontal: 20, paddingBottom: 6 },
  textEditor: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  textInput: { minHeight: 90, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 10, fontSize: 16, textAlignVertical: 'top' },
  save: { alignSelf: 'flex-end', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
