import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitleBar } from '@/components/screen-title-bar';
import { isUnauthorized, useTwentySession } from '@/components/twenty/twenty-session-context';
import { useColors } from '@/hooks/use-colors';
import { bodyOf, fieldsOf, getRecord, objectLabel, titleOf, type TwentyRecord } from '@/lib/twenty';

// Ficha de un registro de Twenty: título, campos y el cuerpo de la nota si lo tiene.
export default function TwentyRecordScreen() {
  const colors = useColors();
  const { object, id } = useLocalSearchParams<{ object: string; id: string }>();
  const { token, expire } = useTwentySession();
  const [record, setRecord] = useState<TwentyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getRecord(token, object, id)
      .then(setRecord)
      .catch(async (e) => {
        if (isUnauthorized(e)) await expire();
        setError(e instanceof Error ? e.message : 'No se pudo cargar el registro.');
      });
  }, [token, object, id, expire]);

  const body = record ? bodyOf(record) : '';

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenTitleBar title={objectLabel(object)} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {!record && !error ? <ActivityIndicator style={styles.loader} color={colors.text} /> : null}
      {record ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{titleOf(record)}</Text>
          {fieldsOf(record).map((f) => (
            <View key={f.label} style={[styles.field, { borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{f.label}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{f.value}</Text>
            </View>
          ))}
          {body ? <Text style={[styles.body, { color: colors.text }]}>{body}</Text> : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 26, paddingBottom: 60, gap: 14 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 8 },
  field: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 2 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 16 },
  body: { fontSize: 16, lineHeight: 24, marginTop: 8 },
  loader: { marginTop: 40 },
  error: { paddingHorizontal: 20, paddingVertical: 8, fontSize: 14 },
});
