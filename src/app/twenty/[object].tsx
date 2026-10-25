import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitleBar } from '@/components/screen-title-bar';
import { isUnauthorized, useTwentySession } from '@/components/twenty/twenty-session-context';
import { useColors } from '@/hooks/use-colors';
import { listRecords, objectLabel, subtitleOf, titleOf, TwentyError, type TwentyRecord } from '@/lib/twenty';

// Lista de un objeto de Twenty (empresas, personas, tareas…) con su mismo aspecto de lista de páginas.
export default function TwentyListScreen() {
  const colors = useColors();
  const { object } = useLocalSearchParams<{ object: string }>();
  const { token, expire } = useTwentySession();
  const [records, setRecords] = useState<TwentyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRecords(await listRecords(token, object));
    } catch (e) {
      if (isUnauthorized(e)) await expire();
      setError(e instanceof TwentyError || e instanceof Error ? e.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, [token, object, expire]);

  // Carga inicial al entrar (y al cambiar de sesión): los estados se fijan al terminar la petición.
  useEffect(() => {
    if (!token) return;
    listRecords(token, object)
      .then(setRecords)
      .catch(async (e) => {
        if (isUnauthorized(e)) await expire();
        setError(e instanceof Error ? e.message : 'No se pudo cargar.');
      })
      .finally(() => setLoading(false));
  }, [token, object, expire]);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.sidebar }]}>
      <ScreenTitleBar title={objectLabel(object)} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.textSecondary} />}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.loader} color={colors.text} /> : <Text style={[styles.empty, { color: colors.textTertiary }]}>Nada por aquí.</Text>}
        renderItem={({ item }) => {
          const sub = subtitleOf(object, item);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/twenty/[object]/[id]', params: { object, id: item.id } })}
              style={({ pressed }) => [styles.row, { borderColor: colors.border }, pressed && { backgroundColor: colors.surfacePressed }]}>
              <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{titleOf(item)}</Text>
              {sub ? <Text numberOfLines={1} style={[styles.sub, { color: colors.textSecondary }]}>{sub}</Text> : null}
            </Pressable>
          );
        }}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 60 },
  row: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '500' },
  sub: { fontSize: 13, marginTop: 2 },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
  error: { paddingHorizontal: 20, paddingVertical: 8, fontSize: 14 },
});
