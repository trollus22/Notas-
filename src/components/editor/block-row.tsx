import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputKeyPressEvent,
  type TextInputSelectionChangeEvent,
  type TextStyle,
} from 'react-native';

import { NotionIcon } from '@/components/notion-icon';
import { notionColor } from '@/constants/notion-colors';
import { Fonts, type Palette, type Scheme } from '@/constants/theme';
import { autoGrowProps, useAutoGrow } from '@/hooks/use-auto-grow';
import { pageTitle } from '@/lib/format';
import { currentSelection } from '@/lib/input-selection';
import type { Row } from '@/lib/tree';
import type { Block, BlockType } from '@/lib/types';

export const INDENT_WIDTH = 24;

const PLACEHOLDERS: Partial<Record<BlockType, string>> = {
  h1: 'Encabezado 1',
  h2: 'Encabezado 2',
  h3: 'Encabezado 3',
  todo: 'Tarea',
  bullet: 'Lista',
  numbered: 'Lista',
  toggle: 'Desplegable',
  quote: 'Cita vacía',
  callout: 'Escribe algo…',
  code: 'Código',
};

const BULLETS = ['•', '◦', '▪'];

/** Hide the browser focus ring; React Native's style types do not list `none`. */
export const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};

export interface BlockRowHandlers {
  registerInput: (id: string, input: TextInputInstance | null) => void;
  onChangeText: (block: Block, text: string) => void;
  /**
   * `selection` is the caret read at key time where the platform allows it.
   * Returns true when the editor handled the key, so the default action is skipped.
   */
  onKeyPress: (block: Block, key: string, selection?: { start: number; end: number }) => boolean;
  onFocus: (block: Block) => void;
  onSelectionChange: (block: Block, selection: { start: number; end: number }) => void;
  onToggleChecked: (block: Block) => void;
  onToggleCollapsed: (block: Block) => void;
  /** Select a block that has no text input (divider, sub-page link). */
  onSelect: (block: Block) => void;
  onOpenPage: (block: Block) => void;
}

interface BlockRowProps {
  row: Row;
  focused: boolean;
  editable: boolean;
  colors: Palette;
  scheme: Scheme;
  handlers: BlockRowHandlers;
}

/** A content row; rows inside a callout are drawn on the callout's coloured box. */
export function BlockRow(props: BlockRowProps) {
  const { container } = props.row;
  if (!container) return <BlockRowContent {...props} />;
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: notionColor(props.scheme, container.color).callout },
        container.first && styles.boxFirst,
        container.last && styles.boxLast,
      ]}>
      <BlockRowContent {...props} />
    </View>
  );
}

function BlockRowContent({ row, focused, editable, colors, scheme, handlers }: BlockRowProps) {
  const { block, depth, number } = row;
  const indent = { marginLeft: depth * INDENT_WIDTH };

  if (block.type === 'divider') {
    return (
      <Pressable
        accessibilityLabel="Divisor"
        onPress={() => handlers.onSelect(block)}
        style={[styles.dividerRow, indent, focused && { backgroundColor: colors.surfacePressed }]}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </Pressable>
    );
  }

  if (block.type === 'page' || block.type === 'database') {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={() => handlers.onOpenPage(block)}
        onLongPress={() => handlers.onSelect(block)}
        style={({ pressed }) => [
          styles.pageLink,
          indent,
          (pressed || focused) && { backgroundColor: colors.surfacePressed },
        ]}>
        <NotionIcon icon={block.icon} size={19} />
        <Text numberOfLines={1} style={[styles.pageLinkText, { color: colors.text, textDecorationColor: colors.border }]}>
          {pageTitle(block)}
        </Text>
      </Pressable>
    );
  }

  const input = (
    <BlockInput block={block} focused={focused} editable={editable} colors={colors} scheme={scheme} handlers={handlers} />
  );

  switch (block.type) {
    case 'todo':
      return (
        <View style={[styles.row, indent]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!block.checked }}
            hitSlop={8}
            onPress={() => handlers.onToggleChecked(block)}
            style={styles.prefix}>
            <View
              style={[
                styles.checkbox,
                block.checked
                  ? { backgroundColor: colors.accent, borderColor: colors.accent }
                  : { borderColor: colors.text },
              ]}>
              {block.checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
            </View>
          </Pressable>
          {input}
        </View>
      );
    case 'bullet':
      return (
        <View style={[styles.row, indent]}>
          <Text style={[styles.prefix, styles.bullet, { color: colors.text }]}>{BULLETS[row.listLevel % BULLETS.length]}</Text>
          {input}
        </View>
      );
    case 'numbered':
      return (
        <View style={[styles.row, indent]}>
          <Text style={[styles.prefix, styles.number, { color: colors.text }]}>{number}.</Text>
          {input}
        </View>
      );
    case 'toggle':
      return (
        <View style={[styles.row, indent]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={block.collapsed ? 'Desplegar' : 'Plegar'}
            hitSlop={8}
            onPress={() => handlers.onToggleCollapsed(block)}
            style={styles.prefix}>
            <Ionicons name={block.collapsed ? 'caret-forward' : 'caret-down'} size={14} color={colors.text} />
          </Pressable>
          {input}
        </View>
      );
    case 'quote':
      return (
        <View style={[styles.row, indent]}>
          <View style={[styles.quoteBar, { backgroundColor: colors.text }]} />
          {input}
        </View>
      );
    case 'callout':
      return (
        <View style={[styles.row, styles.callout, indent]}>
          <Text style={styles.calloutIcon}>{block.icon ?? '💡'}</Text>
          {input}
        </View>
      );
    case 'code':
      return <View style={[styles.code, indent, { backgroundColor: colors.codeBackground }]}>{input}</View>;
    default:
      return <View style={[styles.row, indent]}>{input}</View>;
  }
}

function BlockInput({
  block,
  focused,
  editable,
  colors,
  scheme,
  handlers,
}: {
  block: Block;
  focused: boolean;
  editable: boolean;
  colors: Palette;
  scheme: Scheme;
  handlers: BlockRowHandlers;
}) {
  const inputRef = useRef<TextInputInstance | null>(null);
  useAutoGrow(inputRef, block.text);

  return (
    <TextInput
      ref={(ref) => {
        inputRef.current = ref;
        handlers.registerInput(block.id, ref);
      }}
      value={block.text}
      editable={editable}
      multiline
      scrollEnabled={false}
      {...autoGrowProps}
      placeholder={block.type === 'text' ? (focused ? 'Escribe “/” para ver comandos' : undefined) : PLACEHOLDERS[block.type]}
      placeholderTextColor={colors.textTertiary}
      onChangeText={(text) => handlers.onChangeText(block, text)}
      onKeyPress={(event: TextInputKeyPressEvent) => {
        if (handlers.onKeyPress(block, event.nativeEvent.key, currentSelection(inputRef.current))) {
          event.preventDefault();
        }
      }}
      onFocus={() => handlers.onFocus(block)}
      onSelectionChange={(event: TextInputSelectionChangeEvent) =>
        handlers.onSelectionChange(block, event.nativeEvent.selection)
      }
      autoCorrect={block.type !== 'code'}
      autoCapitalize={block.type === 'code' ? 'none' : 'sentences'}
      style={[styles.input, textStyle(block, colors, scheme)]}
    />
  );
}

function textStyle(block: Block, colors: Palette, scheme: Scheme): TextStyle {
  const colored = block.color && block.color !== 'default' && block.type !== 'callout';
  const base: TextStyle = { color: colored ? notionColor(scheme, block.color).text : colors.text };
  switch (block.type) {
    case 'h1':
      return { ...base, fontSize: 26, lineHeight: 34, fontWeight: '700', marginTop: 16 };
    case 'h2':
      return { ...base, fontSize: 21, lineHeight: 28, fontWeight: '600', marginTop: 18 };
    case 'h3':
      return { ...base, fontSize: 18, lineHeight: 25, fontWeight: '600', marginTop: 8 };
    case 'todo':
      return block.checked
        ? { ...base, color: colors.textTertiary, textDecorationLine: 'line-through' }
        : base;
    case 'quote':
      return { ...base, fontSize: 17 };
    case 'code':
      return { ...base, fontFamily: Fonts.mono, fontSize: 14, lineHeight: 21 };
    default:
      return base;
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  prefix: { width: 26, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 3,
    paddingBottom: 3,
    paddingHorizontal: 2,
    textAlignVertical: 'top',
    ...webNoOutline,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: { fontSize: 22, lineHeight: 30, textAlign: 'center' },
  number: { fontSize: 16, lineHeight: 30, textAlign: 'center' },
  quoteBar: { width: 3, alignSelf: 'stretch', marginVertical: 3, marginRight: 12, marginLeft: 2 },
  callout: { gap: 8 },
  box: { paddingHorizontal: 14 },
  boxFirst: { borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingTop: 12, marginTop: 6 },
  boxLast: { borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingBottom: 12, marginBottom: 10 },
  calloutIcon: { fontSize: 18, lineHeight: 30 },
  code: { borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, marginVertical: 3 },
  dividerRow: { height: 22, justifyContent: 'center' },
  dividerLine: { height: 1 },
  pageLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, borderRadius: 4, paddingHorizontal: 2 },
  pageLinkText: { flex: 1, fontSize: 16, fontWeight: '500', textDecorationLine: 'underline' },
});
