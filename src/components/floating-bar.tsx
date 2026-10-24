import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { pageTitle } from '@/lib/format';
import { goHome, openChat, openPage } from '@/lib/navigation';
import { recentPages } from '@/lib/tree';
import { createAndOpenPage } from '@/store/actions';
import { useTree, useWorkspace } from '@/store/workspace-context';

import { AiIcon, NotionIcon } from './notion-icon';
import { Popover } from './popover';

/** Bottom offset of the bar from the screen edge. */
export function useFloatingBarBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 8, 14);
}

function CircleButton({
  label,
  onPress,
  onLongPress,
  children,
}: {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.circle,
        styles.floating,
        { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow },
        pressed && { backgroundColor: colors.surfacePressed },
      ]}>
      {children}
    </Pressable>
  );
}

/**
 * The floating bar at the bottom of every screen: search (or the sidebar
 * button inside pages), "Preguntar a la IA", and a new-page button.
 */
export function FloatingBar({ mode }: { mode: 'search' | 'menu' }) {
  const colors = useColors();
  const tree = useTree();
  const workspace = useWorkspace();
  const bottom = useFloatingBarBottom();
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const recents = recentPages(tree, 5);

  const newPage = () => createAndOpenPage(workspace, null);

  return (
    <>
      <View pointerEvents="box-none" style={[styles.bar, { bottom }]}>
        <CircleButton
          label={mode === 'search' ? 'Buscar' : 'Inicio'}
          onPress={mode === 'search' ? () => router.push('/search') : goHome}
          onLongPress={() => setRecentsOpen(true)}>
          <Ionicons name={mode === 'search' ? 'search' : 'menu'} size={23} color={colors.text} />
        </CircleButton>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Preguntar a la IA"
          onPress={() => openChat()}
          style={({ pressed }) => [
            styles.pill,
            styles.floating,
            { backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow },
            pressed && { backgroundColor: colors.surfacePressed },
          ]}>
          <AiIcon size={28} framed />
          <Text numberOfLines={1} style={[styles.pillLabel, { color: colors.textSecondary }]}>
            Preguntar a la IA
          </Text>
        </Pressable>
        <CircleButton label="Nueva página" onPress={newPage} onLongPress={() => setComposeOpen(true)}>
          <Ionicons name="create-outline" size={23} color={colors.text} />
        </CircleButton>
      </View>

      <Popover
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        position={{ right: 26, bottom: bottom + 8 }}
        width={246}
        items={[
          { label: 'Anotador con IA', icon: 'mic-outline', onPress: () => router.navigate('/meetings') },
          { label: 'Chatear', icon: 'chatbubble-outline', onPress: () => openChat() },
          { label: 'Página', icon: 'document-text-outline', onPress: newPage },
        ]}
      />

      <Popover
        visible={recentsOpen}
        onClose={() => setRecentsOpen(false)}
        position={{ left: 14, bottom: bottom - 6 }}
        width={222}>
        <Text style={[styles.recentsTitle, { color: colors.textSecondary }]}>Recientes</Text>
        {recents.length === 0 ? (
          <Text style={[styles.recentsEmpty, { color: colors.textSecondary }]}>No hay chats ni páginas recientes</Text>
        ) : (
          recents.map((page) => (
            <Pressable
              key={page.id}
              accessibilityRole="button"
              onPress={() => {
                setRecentsOpen(false);
                openPage(page.id);
              }}
              style={({ pressed }) => [styles.recentRow, pressed && { backgroundColor: colors.surfacePressed }]}>
              <NotionIcon icon={page.icon} size={16} />
              <Text numberOfLines={1} style={[styles.recentTitle, { color: colors.text }]}>
                {pageTitle(page)}
              </Text>
            </Pressable>
          ))
        )}
        <View style={[styles.recentsDivider, { backgroundColor: colors.hairline }]} />
        <View style={styles.recentsActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRecentsOpen(false);
              goHome();
            }}
            style={styles.recentsAction}>
            <Ionicons name="home-outline" size={21} color={colors.text} />
            <Text style={[styles.recentsActionLabel, { color: colors.text }]}>Inicio</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRecentsOpen(false);
              router.push('/search');
            }}
            style={styles.recentsAction}>
            <Ionicons name="search" size={21} color={colors.text} />
            <Text style={[styles.recentsActionLabel, { color: colors.text }]}>Buscar</Text>
          </Pressable>
        </View>
      </Popover>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 26 },
  floating: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  circle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  pill: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  pillLabel: { fontSize: 17, flexShrink: 1 },
  recentsTitle: { fontSize: 12, fontWeight: '500', paddingHorizontal: 14, paddingTop: 2, paddingBottom: 8 },
  recentsEmpty: { fontSize: 13, paddingHorizontal: 14, paddingBottom: 14, lineHeight: 17 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  recentTitle: { flex: 1, fontSize: 15 },
  recentsDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  recentsActions: { flexDirection: 'row', paddingTop: 8 },
  recentsAction: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  recentsActionLabel: { fontSize: 11, fontWeight: '500' },
});
