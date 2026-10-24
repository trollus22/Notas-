import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NotionIcon } from '@/components/notion-icon';
import { FloatingBarSpace } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useNow } from '@/hooks/use-now';
import { pageTitle, shortAge } from '@/lib/format';
import { openPage } from '@/lib/navigation';
import { pageAncestors, recentlyEditedPages } from '@/lib/tree';
import type { Block } from '@/lib/types';
import { WORKSPACE_NAME } from '@/store/seed';
import { useTree } from '@/store/workspace-context';

const WEEK = 7 * 86_400_000;

/** Activity on your pages. With no account connected, that is your own edits. */
export default function InboxScreen() {
  const colors = useColors();
  const tree = useTree();
  const now = useNow();
  const edited = recentlyEditedPages(tree, 30);
  const sections: [string, Block[]][] = [
    ['Esta semana', edited.filter((page) => now - page.updatedAt < WEEK)],
    ['Anteriores', edited.filter((page) => now - page.updatedAt >= WEEK)],
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.sidebar }} contentContainerStyle={{ paddingBottom: FloatingBarSpace }}>
      {edited.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="file-tray-outline" size={30} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Todo al día</Text>
        </View>
      ) : null}
      {sections
        .filter(([, pages]) => pages.length > 0)
        .map(([label, pages], index) => (
          <View key={label}>
            <View style={styles.header}>
              <Text style={[styles.section, { color: colors.textSecondary }]}>{label}</Text>
              {index === 0 ? (
                <View style={styles.headerIcons}>
                  <Ionicons name="filter" size={19} color={colors.textSecondary} />
                  <Ionicons name="ellipsis-horizontal" size={19} color={colors.textSecondary} />
                </View>
              ) : null}
            </View>
            {pages.map((page) => {
              const where = pageAncestors(tree, page.id)
                .map((block) => (block.type === 'teamspace' ? block.text : pageTitle(block)))
                .join(' / ');
              return (
                <Pressable
                  key={page.id}
                  accessibilityRole="button"
                  onPress={() => openPage(page.id)}
                  style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfacePressed }]}>
                  <View style={styles.line}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarLetter}>{WORKSPACE_NAME[0]}</Text>
                    </View>
                    <Text style={[styles.message, { color: colors.text }]}>
                      <Text style={styles.bold}>Tú</Text> editaste una página
                    </Text>
                    <Text style={[styles.age, { color: colors.textSecondary }]}>{shortAge(page.updatedAt, now)}</Text>
                    {now - page.updatedAt < 86_400_000 ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}
                  </View>
                  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.cardIcon, { backgroundColor: colors.surface }]}>
                      <NotionIcon icon={page.icon} size={18} />
                    </View>
                    <View style={styles.cardText}>
                      <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text }]}>
                        {pageTitle(page)}
                      </Text>
                      {where ? (
                        <Text numberOfLines={1} style={[styles.cardDetail, { color: colors.textSecondary }]}>
                          {where}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  section: { fontSize: 15 },
  headerIcons: { flexDirection: 'row', gap: 16 },
  item: { paddingHorizontal: 20, paddingVertical: 8, gap: 10 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2E8B6A', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  avatarLetter: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  message: { flex: 1, fontSize: 16, lineHeight: 22 },
  bold: { fontWeight: '700' },
  age: { fontSize: 14, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 32, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  cardIcon: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15 },
  cardDetail: { fontSize: 13, marginTop: 1 },
  empty: { alignItems: 'center', paddingTop: 180, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
});
