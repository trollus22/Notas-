import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import type { Palette } from '@/constants/theme';
import { BLOCK_MENU, type BlockMenuItem } from '@/lib/block-menu';
import type { BlockType } from '@/lib/types';

function MenuItem({ item, colors, onPress }: { item: BlockMenuItem; colors: Palette; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfacePressed }]}>
      <View style={[styles.tile, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.glyph, { color: colors.text }]}>{item.glyph}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
        <Text numberOfLines={1} style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    </Pressable>
  );
}

/** Floating list shown above the keyboard while a `/` command is typed. */
export function SlashMenu({
  items,
  colors,
  onChoose,
}: {
  items: BlockMenuItem[];
  colors: Palette;
  onChoose: (type: BlockType) => void;
}) {
  return (
    <View style={[styles.panel, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {items.length === 0 ? (
        <Text style={[styles.noResults, { color: colors.textSecondary }]}>Sin resultados</Text>
      ) : (
        <ScrollView keyboardShouldPersistTaps="always">
          <Text style={[styles.heading, { color: colors.textSecondary }]}>Bloques básicos</Text>
          {items.map((item) => (
            <MenuItem key={item.type} item={item} colors={colors} onPress={() => onChoose(item.type)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** Sheet with every block type, for "add block" and "turn into". */
export function BlockMenuSheet({
  visible,
  title,
  colors,
  onClose,
  onChoose,
}: {
  visible: boolean;
  title: string;
  colors: Palette;
  onClose: () => void;
  onChoose: (type: BlockType) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {BLOCK_MENU.map((item) => (
        <MenuItem
          key={item.type}
          item={item}
          colors={colors}
          onPress={() => {
            onClose();
            onChoose(item.type);
          }}
        />
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 52,
    maxHeight: 280,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  heading: { fontSize: 12, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 6 },
  noResults: { fontSize: 14, padding: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 7 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 17, fontWeight: '600' },
  texts: { flex: 1, gap: 2 },
  label: { fontSize: 15 },
  description: { fontSize: 12 },
});
