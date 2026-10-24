import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';

/** A bottom sheet with a grabber, a centred title and an optional action on the right. */
export function Sheet({
  visible,
  onClose,
  title,
  headerRight,
  grouped = false,
  tall = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: ReactNode;
  /** Grey background for sheets made of white cards. */
  grouped?: boolean;
  /** Nearly full-screen, like the views sheet in the reference app. */
  tall?: boolean;
  children: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Cerrar"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            tall && styles.tall,
            {
              backgroundColor: grouped ? colors.sidebar : colors.background,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {title || headerRight ? (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** White rounded card used inside grouped sheets and settings. */
export function SheetCard({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.card }]}>{children}</View>;
}

export interface SheetAction {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  onPress: () => void;
}

/** A sheet listing actions; it closes before running the chosen one. */
export function ActionSheet({
  visible,
  onClose,
  title,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  const colors = useColors();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {actions.map((action) => {
        const color = action.destructive ? colors.danger : colors.text;
        return (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              action.onPress();
            }}
            style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surfacePressed }]}>
            <Ionicons name={action.icon} size={20} color={color} />
            <Text style={[styles.actionLabel, { color }]}>{action.label}</Text>
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '85%',
    paddingTop: 8,
  },
  tall: { height: '93%', maxHeight: '93%' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 6 },
  header: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 20, marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  headerRight: { position: 'absolute', right: 18, top: 0, bottom: 0, justifyContent: 'center' },
  card: { borderRadius: 14, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  actionLabel: { fontSize: 16 },
});
