import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { pageTitle } from '@/lib/format';
import { openPage } from '@/lib/navigation';
import { subPages } from '@/lib/tree';
import type { Block } from '@/lib/types';
import { toggleExpanded, useExpanded } from '@/store/sidebar-state';
import { useTree } from '@/store/workspace-context';

import { NotionIcon, TeamspaceIcon } from './notion-icon';

const INDENT = 22;

/** "Espacios de equipo ⌄ …" style header; tapping the title folds the section. */
export function SidebarSection({
  id,
  title,
  onMore,
  children,
}: {
  id: string;
  title: string;
  onMore?: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  const open = useExpanded(`section:${id}`, true);
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => toggleExpanded(`section:${id}`, true)}
          style={styles.sectionTitle}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={13} color={colors.textSecondary} />
        </Pressable>
        {onMore ? (
          <Pressable accessibilityLabel={`Más opciones de ${title}`} hitSlop={10} onPress={onMore}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {open ? children : null}
    </View>
  );
}

export function TeamspaceRow({ teamspace, onLongPress }: { teamspace: Block; onLongPress?: (block: Block) => void }) {
  const colors = useColors();
  const tree = useTree();
  const open = useExpanded(teamspace.id, true);
  const pages = subPages(tree, teamspace.id);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={teamspace.text}
        onPress={() => toggleExpanded(teamspace.id, true)}
        onLongPress={onLongPress ? () => onLongPress(teamspace) : undefined}
        style={({ pressed }) => [styles.row, styles.topRow, pressed && { backgroundColor: colors.surfacePressed }]}>
        <TeamspaceIcon icon={teamspace.icon} />
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {teamspace.text}
        </Text>
      </Pressable>
      {open ? pages.map((page) => <SidebarPageRow key={page.id} page={page} depth={0} onLongPress={onLongPress} />) : null}
    </View>
  );
}

/**
 * A page or database in the sidebar. Pages unfold their sub-pages, databases
 * their views; tapping the title opens it.
 */
export function SidebarPageRow({
  page,
  depth,
  onLongPress,
  topLevel = false,
}: {
  page: Block;
  depth: number;
  onLongPress?: (block: Block) => void;
  /** Private pages sit flush with the section, with no chevron column. */
  topLevel?: boolean;
}) {
  const colors = useColors();
  const tree = useTree();
  const open = useExpanded(page.id);
  const isDatabase = page.type === 'database';
  const children = !isDatabase ? subPages(tree, page.id) : [];
  const showChevron = !topLevel || isDatabase || children.length > 0;
  const childIndent = 36 + (depth + 1) * INDENT + 28;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pageTitle(page)}
        onPress={() => openPage(page.id)}
        onLongPress={onLongPress ? () => onLongPress(page) : undefined}
        style={({ pressed }) => [
          styles.row,
          { paddingLeft: topLevel && !showChevron ? 20 : 34 + depth * INDENT },
          pressed && { backgroundColor: colors.surfacePressed },
        ]}>
        {showChevron ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? 'Contraer' : 'Expandir'}
            hitSlop={10}
            onPress={() => toggleExpanded(page.id, false)}
            style={styles.chevron}>
            <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        <NotionIcon icon={page.icon} size={20} />
        <Text numberOfLines={1} style={[styles.title, { color: page.text.trim() ? colors.text : colors.textSecondary }]}>
          {pageTitle(page)}
        </Text>
      </Pressable>

      {open && isDatabase
        ? (page.views ?? []).map((view) => (
            <Pressable
              key={view.id}
              accessibilityRole="button"
              accessibilityLabel={view.name}
              onPress={() => openPage(page.id, view.id)}
              style={({ pressed }) => [
                styles.viewRow,
                { paddingLeft: 58 + depth * INDENT },
                pressed && { backgroundColor: colors.surfacePressed },
              ]}>
              <Text style={[styles.bullet, { color: colors.textTertiary }]}>•</Text>
              <Text numberOfLines={1} style={[styles.viewTitle, { color: colors.textSecondary }]}>
                {view.name}
              </Text>
            </Pressable>
          ))
        : null}

      {open && !isDatabase && children.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textTertiary, paddingLeft: childIndent - 30 }]}>No hay páginas dentro</Text>
      ) : null}
      {open && !isDatabase
        ? children.map((child) => <SidebarPageRow key={child.id} page={child} depth={depth + 1} onLongPress={onLongPress} />)
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 34,
    marginBottom: 10,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionLabel: { fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingRight: 20, gap: 10 },
  topRow: { paddingLeft: 20 },
  chevron: { width: 18, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17 },
  viewRow: { flexDirection: 'row', alignItems: 'center', minHeight: 53, paddingRight: 20, gap: 12 },
  bullet: { fontSize: 14, width: 8 },
  viewTitle: { flex: 1, fontSize: 17 },
  empty: { fontSize: 16, paddingVertical: 14 },
});
