import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { webNoOutline } from '@/components/editor/block-row';
import { PageListRow, SectionHeader } from '@/components/page-rows';
import { useColors } from '@/hooks/use-colors';
import { useNow } from '@/hooks/use-now';
import { pageTitle, relativeTime } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { pageAncestors, recentPages, searchPages, type SearchResult } from '@/lib/tree';
import { useTree } from '@/store/workspace-context';

export default function SearchScreen() {
  const colors = useColors();
  const tree = useTree();
  const now = useNow();
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';

  const results: SearchResult[] = searching ? searchPages(tree, query) : recentPages(tree, 15).map((page) => ({ page }));

  const detail = ({ page, snippet }: SearchResult) => {
    if (snippet) return snippet;
    const path = pageAncestors(tree, page.id).map((block) => (block.type === 'teamspace' ? block.text : pageTitle(block)));
    if (path.length > 0) return path.join(' / ');
    return relativeTime(page.viewedAt ?? page.updatedAt, now);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.sidebar }]}>
      <View style={styles.header}>
        <View style={[styles.field, { backgroundColor: colors.tabIdle }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Buscar"
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.input, { color: colors.text }, webNoOutline]}
          />
          {query ? (
            <Pressable accessibilityLabel="Borrar búsqueda" hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" onPress={goBack} hitSlop={8}>
          <Text style={[styles.cancel, { color: colors.accent }]}>Cancelar</Text>
        </Pressable>
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.page.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={<SectionHeader title={searching ? 'Resultados' : 'Recientes'} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {searching ? `No hay resultados para “${query.trim()}”` : 'No hay páginas recientes'}
          </Text>
        }
        renderItem={({ item }) => <PageListRow page={item.page} detail={detail(item)} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  field: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, paddingHorizontal: 14, height: 40 },
  input: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: 0 },
  cancel: { fontSize: 17 },
  empty: { fontSize: 15, textAlign: 'center', paddingHorizontal: 32, paddingTop: 40 },
});
