import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { COVERS, PAGE_EMOJIS } from '@/constants/covers';
import type { Palette } from '@/constants/theme';

export function EmojiPicker({
  visible,
  colors,
  onClose,
  onChoose,
}: {
  visible: boolean;
  colors: Palette;
  onClose: () => void;
  onChoose: (emoji: string | null) => void;
}) {
  const choose = (emoji: string | null) => {
    onClose();
    onChoose(emoji);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Icono">
      <View style={styles.grid}>
        {PAGE_EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityLabel={emoji}
            onPress={() => choose(emoji)}
            style={({ pressed }) => [styles.emojiCell, pressed && { backgroundColor: colors.surfacePressed }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => choose(null)} style={styles.remove}>
        <Text style={[styles.removeLabel, { color: colors.danger }]}>Quitar icono</Text>
      </Pressable>
    </Sheet>
  );
}

export function CoverPicker({
  visible,
  colors,
  onClose,
  onChoose,
}: {
  visible: boolean;
  colors: Palette;
  onClose: () => void;
  onChoose: (cover: string | null) => void;
}) {
  const choose = (cover: string | null) => {
    onClose();
    onChoose(cover);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Portada">
      <View style={styles.covers}>
        {COVERS.map((cover) => (
          <Pressable key={cover.id} accessibilityLabel={`Portada ${cover.id}`} onPress={() => choose(cover.id)} style={styles.coverCell}>
            <LinearGradient colors={cover.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverSwatch} />
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => choose(null)} style={styles.remove}>
        <Text style={[styles.removeLabel, { color: colors.danger }]}>Quitar portada</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  emojiCell: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  emoji: { fontSize: 26 },
  covers: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
  coverCell: { width: '47%' },
  coverSwatch: { height: 64, borderRadius: 8 },
  remove: { alignItems: 'center', paddingVertical: 16 },
  removeLabel: { fontSize: 16 },
});
