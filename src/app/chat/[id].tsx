import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgentAvatar } from '@/components/agent-avatar';
import { webNoOutline } from '@/components/editor/block-row';
import { AiIcon } from '@/components/notion-icon';
import { useColors } from '@/hooks/use-colors';
import { agentById, insertMention, mentionQuery } from '@/lib/agents';
import { chatMessages, sendMessage } from '@/lib/chat';
import { notConnectedYet } from '@/lib/confirm';
import { goBack } from '@/lib/navigation';
import { useTree, useWorkspace } from '@/store/workspace-context';

/** Ideas para empezar, como en el chat de Twenty: rellenan el cuadro con la agente que mejor encaja. */
const STARTERS = [
  { label: 'Repartir tarjetas', icon: 'albums-outline', text: '@pacer Reparte las tarjetas de esta semana ' },
  { label: 'Código', icon: 'code-slash-outline', text: '@dev ' },
  { label: 'Diseño', icon: 'color-palette-outline', text: '@marca ' },
  { label: 'Lectura', icon: 'trending-up-outline', text: '@growth Haz la lectura de la semana ' },
] as const;

export default function ChatScreen() {
  const { id, agent: agentParam } = useLocalSearchParams<{ id: string; agent?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tree = useTree();
  const workspace = useWorkspace();
  const input = useRef<TextInputInstance>(null);
  const [chatId, setChatId] = useState<string | null>(id && id !== 'new' ? id : null);
  const [draft, setDraft] = useState(agentById(agentParam) ? `@${agentParam} ` : '');
  // Tras rellenar el cuadro desde fuera (mención, idea para empezar) el cursor va al final del texto.
  const [caret, setCaret] = useState<{ start: number; end: number } | undefined>(undefined);
  const fill = (text: string) => {
    setDraft(text);
    setCaret({ start: text.length, end: text.length });
    input.current?.focus();
  };
  const messages = chatMessages(tree, chatId);
  const chat = chatId ? tree.map.get(chatId) : undefined;
  const mentions = mentionQuery(draft);

  const send = () => {
    if (!draft.trim()) return;
    const result = sendMessage(workspace.getTree(), chatId, draft, Date.now());
    workspace.apply(result.patch);
    setChatId(result.chatId);
    setDraft('');
  };

  const circle = [styles.circle, { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow }];
  const chip = (active = false) => [styles.chip, { backgroundColor: active ? colors.accent + '1F' : colors.surface }];

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Atrás" onPress={goBack} style={circle}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {chat?.text || 'Nuevo chat'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nuevo chat"
          onPress={() => {
            setChatId(null);
            setDraft('');
          }}
          style={circle}>
          <Ionicons name="create-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {messages.length === 0 ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.empty} keyboardShouldPersistTaps="handled">
            <View style={[styles.sparkle, { borderColor: colors.border, backgroundColor: colors.floating }]}>
              <AiIcon size={28} />
            </View>
            <Text style={[styles.hello, { color: colors.text }]}>¿Con quién hablamos hoy?</Text>
            <View style={styles.starters}>
              {STARTERS.map((s) => (
                <Pressable
                  key={s.label}
                  accessibilityRole="button"
                  onPress={() => {
                    fill(s.text);
                  }}
                  style={[styles.starter, { borderColor: colors.border, backgroundColor: colors.floating }]}>
                  <Ionicons name={s.icon} size={15} color={colors.textSecondary} />
                  <Text style={[styles.starterText, { color: colors.textSecondary }]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
            {messages.map((message) => {
              if (message.role === 'user') {
                return (
                  <View key={message.id} style={[styles.bubble, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.bubbleText, { color: colors.text }]}>{message.text}</Text>
                  </View>
                );
              }
              const who = agentById(message.agent);
              return (
                <View key={message.id} style={styles.reply}>
                  <View style={styles.who}>
                    {who ? <AgentAvatar agent={who} size={24} /> : <AiIcon size={18} />}
                    <Text style={[styles.whoName, { color: colors.textSecondary }]}>{who?.name ?? 'IA'}</Text>
                  </View>
                  <Text style={[styles.replyText, { color: colors.textSecondary }]}>{message.text}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom - 6, 12) }]}>
          {mentions && mentions.length > 0 ? (
            <View style={[styles.popup, { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow }]}>
              {mentions.map((agent) => (
                <Pressable
                  key={agent.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Mencionar a ${agent.name}`}
                  onPress={() => fill(insertMention(draft, agent))}
                  style={({ pressed }) => [styles.mention, pressed && { backgroundColor: colors.surfacePressed }]}>
                  <AgentAvatar agent={agent} />
                  <Text style={[styles.mentionName, { color: colors.text }]}>{agent.name}</Text>
                  <Text style={[styles.mentionRole, { color: colors.textTertiary }]}>{agent.role}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={[styles.composer, { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <TextInput
              ref={input}
              value={draft}
              onChangeText={setDraft}
              selection={caret}
              onSelectionChange={() => setCaret(undefined)}
              placeholder="Escribe a tus agentes, @ para elegir una"
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, { color: colors.text }, webNoOutline]}
            />
            <View style={styles.tools}>
              <Pressable accessibilityLabel="Adjuntar" hitSlop={8} onPress={() => notConnectedYet('Adjuntar archivos')} style={chip()}>
                <Ionicons name="add" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => notConnectedYet('Datos de Twenty en el chat')} style={chip(true)}>
                <Ionicons name="server-outline" size={15} color={colors.accent} />
                <Text style={[styles.chipText, { color: colors.accent }]}>Twenty</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => notConnectedYet('Reflejar en Telegram')} style={chip(true)}>
                <Ionicons name="paper-plane-outline" size={15} color={colors.accent} />
                <Text style={[styles.chipText, { color: colors.accent }]}>Telegram</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => notConnectedYet('Elegir modelo')} style={chip()}>
                <Text style={[styles.chipText, { color: colors.text }]}>Auto</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
              </Pressable>
              <View style={styles.spacer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar"
                disabled={!draft.trim()}
                onPress={send}
                style={[styles.send, { backgroundColor: draft.trim() ? colors.accent : colors.tabSelected }]}>
                <Ionicons name="arrow-up" size={18} color={draft.trim() ? '#FFFFFF' : colors.textTertiary} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, gap: 12 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, gap: 18 },
  sparkle: { width: 64, height: 64, borderRadius: 32, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  hello: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  starters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  starter: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  starterText: { fontSize: 14 },
  messages: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16, gap: 22 },
  bubble: { alignSelf: 'flex-end', maxWidth: '80%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  reply: { alignSelf: 'stretch', gap: 6 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whoName: { fontSize: 14 },
  replyText: { fontSize: 16, lineHeight: 23 },
  composerWrap: { paddingHorizontal: 12, paddingTop: 6 },
  popup: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 6, marginBottom: 8, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  mention: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 10, borderRadius: 10 },
  mentionName: { flex: 1, fontSize: 17 },
  mentionRole: { fontSize: 13 },
  composer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  input: { fontSize: 16.5, lineHeight: 22, minHeight: 26, maxHeight: 140, paddingVertical: 0 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, borderRadius: 16, paddingHorizontal: 9 },
  chipText: { fontSize: 13.5 },
  spacer: { flex: 1 },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
