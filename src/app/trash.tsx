import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageListRow } from '@/components/page-rows';
import { ScreenTitleBar } from '@/components/screen-title-bar';
import { useColors } from '@/hooks/use-colors';
import { useNow } from '@/hooks/use-now';
import { confirm } from '@/lib/confirm';
import { purgePage, restorePage } from '@/lib/editing';
import { pageTitle, relativeTime } from '@/lib/format';
import { trashedPages } from '@/lib/tree';
import type { Block } from '@/lib/types';
import { useTree, useWorkspace } from '@/store/workspace-context';

export default function TrashScreen() {
  const colors = useColors();
  const tree = useTree();
  const pages = trashedPages(tree);
  const now = useNow();

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.sidebar }]}>
      <ScreenTitleBar title="Papelera" />
      <FlatList
        data={pages}
        keyExtractor={(page) => page.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trash-outline" size={34} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>La papelera está vacía.</Text>
          </View>
        }
        renderItem={({ item }) => <TrashRow page={item} now={now} />}
      />
    </SafeAreaView>
  );
}

function TrashRow({ page, now }: { page: Block; now: number }) {
  const colors = useColors();
  const workspace = useWorkspace();

  const restore = () => {
    workspace.apply(restorePage(workspace.getTree(), page.id, Date.now()));
  };
  const purge = async () => {
    const ok = await confirm(
      `¿Eliminar “${pageTitle(page)}”?`,
      'Se borrará para siempre con todo su contenido.',
      'Eliminar',
    );
    if (ok) workspace.apply(purgePage(workspace.getTree(), page.id));
  };

  return (
    <PageListRow
      page={page}
      detail={`Borrado ${relativeTime(page.deletedAt ?? now, now).toLowerCase()}`}
      accessory={
        <View style={styles.actions}>
          <Pressable accessibilityLabel="Restaurar" hitSlop={8} onPress={restore}>
            <Ionicons name="arrow-undo-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel="Eliminar para siempre" hitSlop={8} onPress={() => void purge()}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  actions: { flexDirection: 'row', gap: 18 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 80 },
  emptyText: { fontSize: 15 },
});
