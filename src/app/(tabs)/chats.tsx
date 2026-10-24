import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AiIcon } from '@/components/notion-icon';
import { FloatingBarSpace } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useNow } from '@/hooks/use-now';
import { notConnectedYet } from '@/lib/confirm';
import { openChat } from '@/lib/navigation';
import { chats } from '@/lib/tree';
import type { Block } from '@/lib/types';
import { useTree } from '@/store/workspace-context';

const DAY = 86_400_000;

function groupByDay(list: Block[], now: number): [string, Block[]][] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const groups = new Map<string, Block[]>();
  for (const chat of list) {
    const label =
      chat.updatedAt >= startOfToday ? 'Hoy' : chat.updatedAt >= startOfToday - DAY ? 'Ayer' : chat.updatedAt >= startOfToday - 7 * DAY ? 'Últimos 7 días' : 'Anteriores';
    groups.set(label, [...(groups.get(label) ?? []), chat]);
  }
  return [...groups.entries()];
}

export default function ChatsScreen() {
  const colors = useColors();
  const tree = useTree();
  const now = useNow();
  const history = chats(tree);

  return (
    <ScrollView style={{ backgroundColor: colors.sidebar }} contentContainerStyle={[styles.content, { paddingBottom: FloatingBarSpace }]}>
      <Text style={[styles.section, { color: colors.textSecondary }]}>Agentes</Text>
      <Pressable accessibilityRole="button" onPress={() => openChat()} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
        <AiIcon size={28} framed />
        <Text style={[styles.rowLabel, { color: colors.text }]}>IA</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => notConnectedYet('Todos los agentes')}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
        <View style={styles.agentsIcon}>
          <Ionicons name="apps-outline" size={19} color={colors.textSecondary} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Todos los agentes</Text>
      </Pressable>

      {history.length > 0 ? (
        groupByDay(history, now).map(([label, items]) => (
          <View key={label}>
            <Text style={[styles.section, styles.historySection, { color: colors.textSecondary }]}>{label}</Text>
            {items.map((chat) => (
              <Pressable
                key={chat.id}
                accessibilityRole="button"
                onPress={() => openChat(chat.id)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
                <Text numberOfLines={1} style={[styles.rowLabel, { color: colors.text }]}>
                  {chat.text || 'Chat sin título'}
                </Text>
              </Pressable>
            ))}
          </View>
        ))
      ) : (
        <View style={styles.empty}>
          <AiIcon size={24} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Da el salto a la IA</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Busca en tus páginas, crea bases de datos y mucho más con la IA.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => openChat()} style={[styles.button, { backgroundColor: colors.accent }]}>
            <Text style={styles.buttonText}>Nuevo chat</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 22 },
  section: { fontSize: 15, paddingHorizontal: 20, marginBottom: 8 },
  historySection: { marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 20 },
  rowLabel: { flex: 1, fontSize: 17 },
  agentsIcon: { width: 28, alignItems: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 150, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 10 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 19 },
  button: { marginTop: 18, borderRadius: 21, height: 42, paddingHorizontal: 18, justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});
