import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AgentAvatar } from '@/components/agent-avatar';
import { FloatingBarSpace } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useNow } from '@/hooks/use-now';
import { AGENTS } from '@/lib/agents';
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
      {AGENTS.map((agent) => (
        <Pressable
          key={agent.id}
          accessibilityRole="button"
          accessibilityLabel={`Chatear con ${agent.name}`}
          onPress={() => openChat('new', agent.id)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
          <AgentAvatar agent={agent} />
          <Text style={[styles.rowLabel, { color: colors.text }]}>{agent.name}</Text>
        </Pressable>
      ))}

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
                <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} style={styles.chatIcon} />
                <Text numberOfLines={1} style={[styles.rowLabel, { color: colors.text }]}>
                  {chat.text || 'Chat sin título'}
                </Text>
              </Pressable>
            ))}
          </View>
        ))
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 22 },
  section: { fontSize: 15, paddingHorizontal: 20, marginBottom: 8 },
  historySection: { marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 20 },
  rowLabel: { flex: 1, fontSize: 17 },
  chatIcon: { width: 28, textAlign: 'center' },
});
