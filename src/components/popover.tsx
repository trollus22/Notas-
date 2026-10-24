import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useColors } from '@/hooks/use-colors';

export interface PopoverItem {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  /** Draw a divider under this item. */
  separatorAfter?: boolean;
  onPress: () => void;
}

/**
 * A floating rounded menu, placed with absolute offsets from the screen edges.
 * Tapping outside closes it; choosing an item closes it before running it.
 */
export function Popover({
  visible,
  onClose,
  position,
  width = 246,
  items,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  position: Pick<ViewStyle, 'top' | 'bottom' | 'left' | 'right'>;
  width?: number;
  items?: PopoverItem[];
  children?: ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Cerrar menú" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          styles.card,
          position,
          { width, backgroundColor: colors.floating, borderColor: colors.border, shadowColor: colors.shadow },
        ]}>
        {items?.map((item) => {
          const color = item.destructive ? colors.danger : colors.text;
          return (
            <View key={item.label}>
              <Pressable
                accessibilityRole="menuitem"
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfacePressed }]}>
                {item.icon ? <Ionicons name={item.icon} size={19} color={color} /> : null}
                <Text style={[styles.label, { color }]}>{item.label}</Text>
              </Pressable>
              {item.separatorAfter ? <View style={[styles.separator, { backgroundColor: colors.hairline }]} /> : null}
            </View>
          );
        })}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 30, paddingVertical: 11 },
  label: { fontSize: 17, lineHeight: 21, flexShrink: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 22, marginVertical: 8 },
});
