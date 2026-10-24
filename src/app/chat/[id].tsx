import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { webNoOutline } from '@/components/editor/block-row';
import { AiIcon } from '@/components/notion-icon';
import { useColors } from '@/hooks/use-colors';
import { chatMessages, sendMessage } from '@/lib/chat';
import { inform, notConnectedYet } from '@/lib/confirm';
import { goBack } from '@/lib/navigation';
import { useTree, useWorkspace } from '@/store/workspace-context';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tree = useTree();
  const workspace = useWorkspace();
  const [chatId, setChatId] = useState<string | null>(id && id !== 'new' ? id : null);
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const messages = chatMessages(tree, chatId);

  const send = () => {
    if (!draft.trim()) return;
    const result = sendMessage(workspace.getTree(), chatId, draft, Date.now());
    workspace.apply(result.patch);
    setChatId(result.chatId);
    setDraft('');
  };

  const circle = [styles.circle, { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow }];
  const expanded = focused || draft.length > 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Atrás" onPress={goBack} style={circle}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.agent}>
          <View style={[styles.agentAvatar, { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <AiIcon size={30} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => inform('IA', 'El asistente responderá aquí cuando conectemos el servidor.')}
            style={[styles.agentName, { backgroundColor: colors.floating, borderColor: colors.border }]}>
            <Text style={[styles.agentLabel, { color: colors.text }]}>IA</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
          </Pressable>
        </View>
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
        <ScrollView style={styles.flex} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          {messages.map((message) =>
            message.role === 'user' ? (
              <View key={message.id} style={[styles.bubble, { backgroundColor: colors.surface }]}>
                <Text style={[styles.bubbleText, { color: colors.text }]}>{message.text}</Text>
              </View>
            ) : (
              <View key={message.id} style={styles.reply}>
                <Text style={[styles.replyText, { color: message.role === 'notice' ? colors.textSecondary : colors.text }]}>
                  {message.text}
                </Text>
              </View>
            ),
          )}
        </ScrollView>

        <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom - 6, 12) }]}>
          <View
            style={[
              styles.composer,
              expanded ? styles.composerOpen : styles.composerClosed,
              { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow },
            ]}>
            {!expanded ? (
              <Pressable accessibilityLabel="Adjuntar" hitSlop={8} onPress={() => notConnectedYet('Adjuntar archivos')}>
                <Ionicons name="add" size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Preguntar a la IA"
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, expanded && styles.inputOpen, { color: colors.text }, webNoOutline]}
            />
            {expanded ? (
              <View style={styles.tools}>
                <Pressable accessibilityLabel="Adjuntar" hitSlop={8} onPress={() => notConnectedYet('Adjuntar archivos')}>
                  <Ionicons name="add" size={22} color={colors.textSecondary} />
                </Pressable>
                <Ionicons name="shield-checkmark-outline" size={19} color={colors.textSecondary} />
                <View style={styles.spacer} />
                <Text style={[styles.mode, { color: colors.textSecondary }]}>Automático</Text>
                {draft.trim() ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Enviar" onPress={send} style={[styles.send, { backgroundColor: colors.accent }]}>
                    <Ionicons name="arrow-up" size={17} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
                )}
              </View>
            ) : (
              <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6 },
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
  agent: { alignItems: 'center' },
  agentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  agentName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 28,
  },
  agentLabel: { fontSize: 16, fontWeight: '600' },
  messages: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16, gap: 18 },
  bubble: { alignSelf: 'flex-end', maxWidth: '80%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  reply: { alignSelf: 'stretch' },
  replyText: { fontSize: 16, lineHeight: 23 },
  composerWrap: { paddingHorizontal: 14, paddingTop: 6 },
  composer: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  composerClosed: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, minHeight: 48, paddingHorizontal: 14 },
  composerOpen: { borderRadius: 22, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 10 },
  input: { flex: 1, minWidth: 0, fontSize: 16, maxHeight: 140, paddingVertical: 0 },
  inputOpen: { flex: 0, minHeight: 24 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  spacer: { flex: 1 },
  mode: { fontSize: 15 },
  send: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
