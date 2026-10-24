import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { pageTitle } from '@/lib/format';
import { openPage } from '@/lib/navigation';
import type { Block } from '@/lib/types';

import { NotionIcon } from './notion-icon';

/** A page with a second line of detail, used in search, recents and trash. */
export function PageListRow({
  page,
  detail,
  onPress,
  accessory,
}: {
  page: Block;
  detail?: string;
  onPress?: () => void;
  accessory?: ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (() => openPage(page.id))}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
      <NotionIcon icon={page.icon} size={20} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {pageTitle(page)}
        </Text>
        {detail ? (
          <Text numberOfLines={1} style={[styles.detail, { color: colors.textSecondary }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {accessory}
    </Pressable>
  );
}

/** Small grey heading above a list ("Recientes", "Hoy"). */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '500' },
  detail: { fontSize: 13 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 14 },
});
