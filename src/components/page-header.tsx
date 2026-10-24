import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { goBack } from '@/lib/navigation';

/**
 * Back, share and "…" buttons. Once the page title scrolls away, the title and
 * where the page lives appear next to the back button.
 */
export function PageHeader({
  title,
  subtitle,
  showTitle,
  onShare,
  onMore,
}: {
  title: string;
  subtitle?: string;
  showTitle: boolean;
  onShare?: () => void;
  onMore?: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.background },
        showTitle && { borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Atrás" hitSlop={10} onPress={goBack} style={styles.back}>
        <Ionicons name="chevron-back" size={25} color={colors.text} />
      </Pressable>
      <View style={styles.titles}>
        {showTitle ? (
          <>
            <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
                {subtitle}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
      {onShare ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Compartir" hitSlop={8} onPress={onShare} style={styles.action}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      {onMore ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Más opciones" hitSlop={8} onPress={onMore} style={styles.action}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 16, gap: 6 },
  back: { width: 36, height: 44, justifyContent: 'center' },
  titles: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 1 },
  action: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
