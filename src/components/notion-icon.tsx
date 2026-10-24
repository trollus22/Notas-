import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** `ion:<glyph>:<color>` → glyph and colour, or null for emoji icons. */
export function parseBuiltInIcon(icon: string): { name: IconName; color: string } | null {
  if (!icon.startsWith('ion:')) return null;
  const [, name, color] = icon.split(':');
  return { name: name as IconName, color: color || '#91918E' };
}

/** A page's icon: an emoji, a built-in glyph, or a page outline when it has none. */
export function NotionIcon({ icon, size, empty = 'page' }: { icon?: string | null; size: number; empty?: 'page' | 'none' }) {
  const colors = useColors();
  const box = { width: size + 2, height: size + 2 };
  if (!icon) {
    if (empty === 'none') return null;
    return (
      <View style={[styles.box, box]}>
        <Ionicons name="document-text-outline" size={size} color={colors.textSecondary} />
      </View>
    );
  }
  const builtIn = parseBuiltInIcon(icon);
  return (
    <View style={[styles.box, box]}>
      {builtIn ? (
        <Ionicons name={builtIn.name} size={size} color={builtIn.color} />
      ) : (
        <Text style={{ fontSize: size * 0.88, lineHeight: size + 2 }}>{icon}</Text>
      )}
    </View>
  );
}

/** Teamspaces show their glyph on a small grey tile. */
export function TeamspaceIcon({ icon, size = 22 }: { icon?: string | null; size?: number }) {
  const colors = useColors();
  const builtIn = icon ? parseBuiltInIcon(icon) : null;
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: colors.tabSelected }]}>
      {builtIn ? (
        <Ionicons name={builtIn.name} size={size * 0.62} color={colors.textSecondary} />
      ) : (
        <Text style={{ fontSize: size * 0.6 }}>{icon ?? '🏠'}</Text>
      )}
    </View>
  );
}

/** The assistant's mark: a sparkle in a circle (used instead of a brand logo). */
export function AiIcon({ size = 22, framed = false }: { size?: number; framed?: boolean }) {
  const colors = useColors();
  const glyph = <Ionicons name="sparkles-outline" size={framed ? size * 0.55 : size} color={colors.text} />;
  if (!framed) return glyph;
  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.border, backgroundColor: colors.floating },
      ]}>
      {glyph}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  tile: { borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  frame: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
