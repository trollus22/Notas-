import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { notionColor } from '@/constants/notion-colors';
import type { Scheme } from '@/constants/theme';
import { formatDate, optionById } from '@/lib/database';
import type { Property, PropertyType, PropertyValue, SelectOption } from '@/lib/types';

export const PROPERTY_ICONS: Record<PropertyType, ComponentProps<typeof Ionicons>['name']> = {
  status: 'aperture-outline',
  select: 'chevron-down-circle-outline',
  multiSelect: 'shapes-outline',
  person: 'people',
  date: 'calendar-outline',
  text: 'reorder-three-outline',
};

/** Rounded status pill with its coloured dot ("● Done"). */
export function StatusPill({ option, scheme, size = 'regular' }: { option: SelectOption; scheme: Scheme; size?: 'regular' | 'small' }) {
  const palette = notionColor(scheme, option.color);
  const small = size === 'small';
  return (
    <View style={[styles.status, small && styles.statusSmall, { backgroundColor: palette.tagBackground }]}>
      <View style={[styles.dot, small && styles.dotSmall, { backgroundColor: palette.dot }]} />
      <Text numberOfLines={1} style={[styles.statusText, small && styles.smallText, { color: palette.tagText }]}>
        {option.name}
      </Text>
    </View>
  );
}

/** Square-ish tag used by select and multi-select values. */
export function TagPill({ option, scheme }: { option: SelectOption; scheme: Scheme }) {
  const palette = notionColor(scheme, option.color);
  return (
    <View style={[styles.tag, { backgroundColor: palette.tagBackground }]}>
      <Text numberOfLines={1} style={[styles.tagText, { color: palette.tagText }]}>
        {option.name}
      </Text>
    </View>
  );
}

/** A property value as shown in tables, cards and row pages. Empty values render nothing. */
export function PropertyValueView({
  property,
  value,
  scheme,
  textColor,
}: {
  property: Property;
  value: PropertyValue | undefined;
  scheme: Scheme;
  textColor: string;
}) {
  switch (property.type) {
    case 'status': {
      const option = optionById(property, value);
      return option ? <StatusPill option={option} scheme={scheme} /> : null;
    }
    case 'select': {
      const option = optionById(property, value);
      return option ? <TagPill option={option} scheme={scheme} /> : null;
    }
    case 'multiSelect': {
      const ids = Array.isArray(value) ? value : [];
      const options = ids.map((id) => optionById(property, id)).filter((option): option is SelectOption => !!option);
      if (options.length === 0) return null;
      return (
        <View style={styles.tags}>
          {options.map((option) => (
            <TagPill key={option.id} option={option} scheme={scheme} />
          ))}
        </View>
      );
    }
    case 'date':
      return value ? <Text style={[styles.plain, { color: textColor }]}>{formatDate(value)}</Text> : null;
    case 'person':
    case 'text':
      return typeof value === 'string' && value ? (
        <Text numberOfLines={1} style={[styles.plain, { color: textColor }]}>
          {value}
        </Text>
      ) : null;
  }
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 10,
    height: 26,
    maxWidth: '100%',
  },
  statusSmall: { height: 22, borderRadius: 11, gap: 5, paddingLeft: 7, paddingRight: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSmall: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 15, flexShrink: 1 },
  smallText: { fontSize: 13 },
  tag: { borderRadius: 4, paddingHorizontal: 6, height: 24, justifyContent: 'center', alignSelf: 'flex-start', maxWidth: '100%' },
  tagText: { fontSize: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  plain: { fontSize: 15 },
});
