import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageListRow } from '@/components/page-rows';
import { ScreenTitleBar } from '@/components/screen-title-bar';
import { useColors } from '@/hooks/use-colors';
import { useNow } from '@/hooks/use-now';
import { relativeTime } from '@/lib/format';
import { recentPages } from '@/lib/tree';
import { useTree } from '@/store/workspace-context';

export default function RecentsScreen() {
  const colors = useColors();
  const tree = useTree();
  const now = useNow();
  const pages = recentPages(tree, 50);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.sidebar }]}>
      <ScreenTitleBar title="Recientes" />
      <FlatList
        data={pages}
        keyExtractor={(page) => page.id}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No hay chats ni páginas recientes</Text>
        }
        renderItem={({ item }) => <PageListRow page={item} detail={relativeTime(item.viewedAt ?? item.updatedAt, now)} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  empty: { fontSize: 15, textAlign: 'center', paddingTop: 80 },
});
