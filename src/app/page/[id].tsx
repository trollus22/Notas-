import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlockMenuSheet, SlashMenu } from '@/components/editor/block-menu';
import { BlockRow, webNoOutline, type BlockRowHandlers } from '@/components/editor/block-row';
import { EditorToolbar, type ToolbarAction } from '@/components/editor/editor-toolbar';
import { CoverPicker, EmojiPicker } from '@/components/editor/pickers';
import { DatabaseScreen } from '@/components/database/database-screen';
import { RowProperties } from '@/components/database/row-properties';
import { FloatingBar } from '@/components/floating-bar';
import { NotionIcon } from '@/components/notion-icon';
import { PageHeader } from '@/components/page-header';
import { ActionSheet } from '@/components/sheet';
import { coverById } from '@/constants/covers';
import { FloatingBarSpace, PageGutter } from '@/constants/theme';
import { autoGrowProps, useAutoGrow } from '@/hooks/use-auto-grow';
import { useColors, useScheme } from '@/hooks/use-colors';
import { filterBlockMenu } from '@/lib/block-menu';
import { confirm } from '@/lib/confirm';
import {
  applySlashCommand,
  backspaceAtStart,
  changeType,
  deleteBlock,
  indent,
  insertBlock,
  insertLines,
  markdownShortcut,
  mergePatches,
  moveBlock,
  outdent,
  purgePage,
  restorePage,
  slashQuery,
  splitBlock,
  trashPage,
  updateBlock,
  withBlock,
} from '@/lib/editing';
import { pageToText } from '@/lib/export';
import { pageTitle, textChange } from '@/lib/format';
import { setCaret } from '@/lib/input-selection';
import { goBack, openPage } from '@/lib/navigation';
import { childrenOf, flattenPage, isAlive, pageAncestors } from '@/lib/tree';
import { emptyPatch, isTextless, type Block, type BlockType, type EditResult, type FocusTarget } from '@/lib/types';
import { createAndOpenPage } from '@/store/actions';
import { usePreferences, useTree, useWorkspace } from '@/store/workspace-context';

/** Typing a `/` command: where the slash is and where the caret is now. */
interface SlashState {
  blockId: string;
  index: number;
  caret: number;
}

/** Modals on iOS cannot open while another one is still closing. */
const afterSheetCloses = (action: () => void) => setTimeout(action, Platform.OS === 'ios' ? 450 : 0);

const isTextBlock = (block: Block | undefined) => !!block && !isTextless(block.type);

export default function PageScreen() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  const tree = useTree();
  const colors = useColors();
  const page = id ? tree.map.get(id) : undefined;

  if (!page || (page.type !== 'page' && page.type !== 'database')) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <PageHeader title="" showTitle={false} />
        <Text style={[styles.missing, { color: colors.textSecondary }]}>Esta página no existe o se ha eliminado.</Text>
      </SafeAreaView>
    );
  }
  if (page.type === 'database') return <DatabaseScreen key={page.id} database={page} initialViewId={view} />;
  return <PageEditor key={page.id} page={page} />;
}

function PageEditor({ page }: { page: Block }) {
  const id = page.id;
  const colors = useColors();
  const scheme = useScheme();
  const workspace = useWorkspace();
  const tree = useTree();
  const [{ recordVisits }] = usePreferences();

  const rows = flattenPage(tree, id);
  const ancestors = pageAncestors(tree, id);
  const parent = page.parentId ? tree.map.get(page.parentId) : undefined;
  const database = parent?.type === 'database' ? parent : undefined;
  const editable = isAlive(tree, id);
  const cover = coverById(page.cover);

  const inputs = useRef(new Map<string, TextInputInstance>());
  const titleRef = useRef<TextInputInstance>(null);
  useAutoGrow(titleRef, page.text);
  const selections = useRef(new Map<string, { start: number; end: number }>());
  const pendingFocus = useRef<FocusTarget | null>(null);
  const [, setFocusRequest] = useState(0);
  const [isNew] = useState(() => page.text === '' && rows.length === 0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [menu, setMenu] = useState<{ mode: 'insert' | 'turnInto'; blockId: string } | null>(null);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    if (!recordVisits) return;
    const now = Date.now();
    workspace.apply(updateBlock(workspace.getTree(), id, { viewedAt: now }, now, { edit: false }));
  }, [id, workspace, recordVisits]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Move the caret where the last edit asked, once that block is on screen.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const input = target.id === 'title' ? titleRef.current : inputs.current.get(target.id);
    if (!input) {
      if (target.id !== 'title' && !isTextBlock(workspace.getTree().map.get(target.id))) pendingFocus.current = null;
      return;
    }
    pendingFocus.current = null;
    selections.current.set(target.id, { start: target.offset, end: target.offset });
    input.focus();
    setCaret(input, target.offset);
    // iOS can move the caret again while focusing; set it once more on the next frame.
    if (Platform.OS !== 'web') requestAnimationFrame(() => setCaret(input, target.offset));
  });

  const run = (result: EditResult | null | undefined) => {
    if (!result) return;
    workspace.apply(result.patch);
    if (result.open) {
      openPage(result.open);
      return;
    }
    if (result.focus) {
      pendingFocus.current = result.focus;
      setFocusRequest((count) => count + 1);
      setFocusedId(result.focus.id);
    }
  };

  const caretIn = (block: Block): FocusTarget | undefined =>
    isTextBlock(block) ? { id: block.id, offset: selections.current.get(block.id)?.start ?? block.text.length } : undefined;

  const handlers: BlockRowHandlers = {
    registerInput: (blockId, input) => {
      if (input) inputs.current.set(blockId, input);
      else inputs.current.delete(blockId);
    },
    onFocus: (block) => {
      setFocusedId(block.id);
      if (slash && slash.blockId !== block.id) setSlash(null);
    },
    onSelectionChange: (block, selection) => {
      selections.current.set(block.id, selection);
      if (slash && slash.blockId === block.id && selection.end <= slash.index) setSlash(null);
    },
    onChangeText: (block, text) => {
      const current = workspace.getTree();
      const now = Date.now();
      const change = textChange(block.text, text);

      if (block.type !== 'code' && change.inserted.includes('\n')) {
        setSlash(null);
        run(
          change.inserted === '\n' && change.removed === 0
            ? splitBlock(current, block.id, change.start, now)
            : insertLines(current, block.id, change, now),
        );
        return;
      }

      if (block.type === 'text') {
        const shortcut = markdownShortcut(block.text, text);
        if (shortcut) {
          setSlash(null);
          const converted = changeType(withBlock(current, { ...block, text: shortcut.text }), block.id, shortcut.type, now);
          run({
            patch: mergePatches(updateBlock(current, block.id, { text: shortcut.text }, now), converted.patch),
            focus: shortcut.type === 'divider' ? converted.focus : { id: block.id, offset: 0 },
          });
          return;
        }
      }

      const caret = change.start + change.inserted.length;
      const typedSlash =
        change.inserted === '/' && change.removed === 0 && (change.start === 0 || /\s/.test(block.text[change.start - 1]));
      if (typedSlash) {
        setSlash({ blockId: block.id, index: change.start, caret });
      } else if (slash && slash.blockId === block.id) {
        setSlash(slashQuery(text, slash.index, caret) === null ? null : { ...slash, caret });
      }
      workspace.apply(updateBlock(current, block.id, { text }, now));
    },
    onKeyPress: (block, key, liveSelection) => {
      if (key !== 'Backspace') return false;
      const selection =
        liveSelection ?? selections.current.get(block.id) ?? (block.text === '' ? { start: 0, end: 0 } : undefined);
      if (!selection || selection.start !== 0 || selection.end !== 0) return false;
      setSlash(null);
      run(backspaceAtStart(workspace.getTree(), block.id, Date.now()));
      return true;
    },
    onToggleChecked: (block) => {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      workspace.apply(updateBlock(workspace.getTree(), block.id, { checked: !block.checked }, Date.now()));
    },
    onToggleCollapsed: (block) => {
      workspace.apply(updateBlock(workspace.getTree(), block.id, { collapsed: !block.collapsed }, Date.now()));
    },
    onSelect: (block) => {
      Keyboard.dismiss();
      setSlash(null);
      setFocusedId(block.id);
    },
    onOpenPage: (block) => openPage(block.id),
  };

  const focusedBlock = focusedId && focusedId !== 'title' ? tree.map.get(focusedId) : undefined;
  const showToolbar =
    editable && !!focusedBlock && (Platform.OS === 'web' || keyboardVisible || !isTextBlock(focusedBlock));

  const onToolbarAction = (action: ToolbarAction) => {
    if (!focusedBlock) return;
    const current = workspace.getTree();
    const now = Date.now();
    const keepCaret = (result: EditResult | null) => run(result && { ...result, focus: caretIn(focusedBlock) });

    switch (action) {
      case 'insert':
      case 'turnInto':
        setSlash(null);
        setMenu({ mode: action, blockId: focusedBlock.id });
        return;
      case 'todo':
        if (isTextBlock(focusedBlock)) {
          keepCaret(changeType(current, focusedBlock.id, focusedBlock.type === 'todo' ? 'text' : 'todo', now));
        }
        return;
      case 'indent':
        keepCaret(indent(current, focusedBlock.id, now));
        return;
      case 'outdent':
        keepCaret(outdent(current, focusedBlock.id, now));
        return;
      case 'moveUp':
      case 'moveDown':
        keepCaret(moveBlock(current, focusedBlock.id, action === 'moveUp' ? 'up' : 'down', now));
        return;
      case 'delete': {
        setSlash(null);
        const result = deleteBlock(current, focusedBlock.id, now);
        run(result);
        if (!result.focus) {
          Keyboard.dismiss();
          setFocusedId(null);
        }
        return;
      }
      case 'dismiss':
        Keyboard.dismiss();
        inputs.current.get(focusedBlock.id)?.blur();
        setSlash(null);
        setFocusedId(null);
        return;
    }
  };

  const chooseFromMenu = (type: BlockType) => {
    if (!menu) return;
    const current = workspace.getTree();
    const block = current.map.get(menu.blockId);
    if (!block) return;
    const now = Date.now();
    if (menu.mode === 'turnInto' || (block.type === 'text' && block.text === '' && type !== 'page')) {
      run(changeType(current, block.id, type, now));
    } else {
      run(insertBlock(current, { parentId: block.parentId!, after: block.id, type }, now));
    }
  };

  const chooseFromSlash = (type: BlockType) => {
    if (!slash) return;
    setSlash(null);
    run(applySlashCommand(workspace.getTree(), slash.blockId, slash.index, slash.caret, type, Date.now()));
  };

  const slashBlock = slash ? tree.map.get(slash.blockId) : undefined;
  const slashItems = slash && slashBlock ? filterBlockMenu(slashQuery(slashBlock.text, slash.index, slash.caret) ?? '') : [];

  const onTitleChange = (text: string) => {
    const now = Date.now();
    if (!text.includes('\n')) {
      workspace.apply(updateBlock(workspace.getTree(), id, { text }, now));
      return;
    }
    workspace.apply(updateBlock(workspace.getTree(), id, { text: text.replace(/\n/g, '') }, now));
    const current = workspace.getTree();
    const first = flattenPage(current, id)[0]?.block;
    if (first && isTextBlock(first) && first.text === '') {
      run({ patch: emptyPatch(), focus: { id: first.id, offset: 0 } });
    } else {
      run(insertBlock(current, { parentId: id, after: null, type: 'text' }, now));
    }
  };

  /** Tapping below the content continues the page, like clicking empty space in Notion. */
  const continueWriting = () => {
    if (!editable) return;
    const current = workspace.getTree();
    const visible = flattenPage(current, id);
    const last = visible[visible.length - 1]?.block;
    if (last && last.type === 'text' && last.text === '' && last.parentId === id) {
      run({ patch: emptyPatch(), focus: { id: last.id, offset: 0 } });
      return;
    }
    const children = childrenOf(current, id);
    run(insertBlock(current, { parentId: id, after: children[children.length - 1]?.id ?? null, type: 'text' }, Date.now()));
  };

  const setPageFields = (fields: Partial<Block>) =>
    workspace.apply(updateBlock(workspace.getTree(), id, fields, Date.now()));

  const newSubPage = () => createAndOpenPage(workspace, id);

  const moveToTrash = () => {
    workspace.apply(trashPage(workspace.getTree(), id, Date.now()));
    goBack();
  };

  const deleteForever = async () => {
    const ok = await confirm(`¿Eliminar “${pageTitle(page)}”?`, 'Se borrará para siempre con todo su contenido.', 'Eliminar');
    if (!ok) return;
    goBack();
    workspace.apply(purgePage(workspace.getTree(), id));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageHeader
        title={pageTitle(page)}
        subtitle={ancestors.map((block) => (block.type === 'teamspace' ? block.text : pageTitle(block))).join(' / ')}
        showTitle={showTitle}
        onShare={() => void Share.share({ message: pageToText(workspace.getTree(), id) })}
        onMore={() => setPageMenuOpen(true)}
      />

      {!editable ? (
        <View style={[styles.banner, { backgroundColor: colors.danger }]}>
          <Text style={styles.bannerText}>
            {page.deletedAt ? 'Esta página está en la papelera.' : 'Esta página está dentro de otra que está en la papelera.'}
          </Text>
          {page.deletedAt ? (
            <View style={styles.bannerActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => workspace.apply(restorePage(workspace.getTree(), id, Date.now()))}
                style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Restaurar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void deleteForever()} style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Eliminar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={32}
          onScroll={(event) => setShowTitle(event.nativeEvent.contentOffset.y > (cover ? 230 : 100))}
          contentContainerStyle={{ paddingBottom: FloatingBarSpace }}>
          {cover ? (
            <View>
              <LinearGradient colors={cover.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} />
              {editable ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCoverPickerOpen(true)}
                  style={[styles.coverButton, { backgroundColor: colors.background }]}>
                  <Text style={[styles.coverButtonText, { color: colors.textSecondary }]}>Cambiar portada</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.body}>
            {page.icon ? (
              <Pressable
                accessibilityLabel="Cambiar icono"
                disabled={!editable}
                onPress={() => setIconPickerOpen(true)}
                style={[styles.iconButton, cover ? styles.iconOverCover : styles.iconNoCover]}>
                <NotionIcon icon={page.icon} size={database ? 28 : page.icon.startsWith('ion:') ? 66 : 58} />
              </Pressable>
            ) : (
              <View style={cover ? styles.noIconUnderCover : styles.noIcon} />
            )}

            <TextInput
              ref={titleRef}
              {...autoGrowProps}
              value={page.text}
              editable={editable}
              autoFocus={isNew}
              multiline
              scrollEnabled={false}
              placeholder="Sin título"
              placeholderTextColor={colors.textTertiary}
              onChangeText={onTitleChange}
              onFocus={() => {
                setFocusedId('title');
                setSlash(null);
              }}
              style={[styles.title, { color: colors.text }]}
            />
            {page.description ? (
              <Text style={[styles.description, { color: colors.text }]}>{page.description}</Text>
            ) : null}
            {database ? <RowProperties database={database} row={page} /> : null}

            {rows.map((row) => (
              <BlockRow
                key={row.block.id}
                row={row}
                focused={focusedId === row.block.id}
                editable={editable}
                colors={colors}
                scheme={scheme}
                handlers={handlers}
              />
            ))}

            <Pressable accessibilityLabel="Seguir escribiendo" onPress={continueWriting} style={styles.tail} />
          </View>
        </ScrollView>

        {slash ? <SlashMenu items={slashItems} colors={colors} onChoose={chooseFromSlash} /> : null}
        {showToolbar ? <EditorToolbar colors={colors} onAction={onToolbarAction} /> : null}
      </KeyboardAvoidingView>
      {!keyboardVisible && !showToolbar ? <FloatingBar mode="menu" /> : null}

      <BlockMenuSheet
        visible={menu !== null}
        title={menu?.mode === 'turnInto' ? 'Convertir en' : 'Añadir bloque'}
        colors={colors}
        onClose={() => setMenu(null)}
        onChoose={chooseFromMenu}
      />
      <EmojiPicker
        visible={iconPickerOpen}
        colors={colors}
        onClose={() => setIconPickerOpen(false)}
        onChoose={(icon) => setPageFields({ icon })}
      />
      <CoverPicker
        visible={coverPickerOpen}
        colors={colors}
        onClose={() => setCoverPickerOpen(false)}
        onChoose={(value) => setPageFields({ cover: value })}
      />
      <ActionSheet
        visible={pageMenuOpen}
        onClose={() => setPageMenuOpen(false)}
        title={pageTitle(page)}
        actions={[
          {
            label: page.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
            icon: page.favorite ? 'star' : 'star-outline',
            onPress: () => setPageFields({ favorite: !page.favorite }),
          },
          { label: page.icon ? 'Cambiar icono' : 'Añadir icono', icon: 'happy-outline', onPress: () => afterSheetCloses(() => setIconPickerOpen(true)) },
          { label: cover ? 'Cambiar portada' : 'Añadir portada', icon: 'image-outline', onPress: () => afterSheetCloses(() => setCoverPickerOpen(true)) },
          { label: 'Añadir subpágina', icon: 'add-outline', onPress: newSubPage },
          { label: 'Mover a la papelera', icon: 'trash-outline', destructive: true, onPress: moveToTrash },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  missing: { fontSize: 16, textAlign: 'center', padding: 32 },
  banner: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  bannerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  bannerActions: { flexDirection: 'row', gap: 10 },
  bannerButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  bannerButtonText: { color: '#FFFFFF', fontSize: 14 },
  cover: { height: 170 },
  coverButton: { position: 'absolute', right: 12, bottom: 10, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  coverButtonText: { fontSize: 13, fontWeight: '500' },
  body: { paddingHorizontal: PageGutter },
  iconButton: { alignSelf: 'flex-start', marginBottom: 12 },
  iconOverCover: { marginTop: -34 },
  iconNoCover: { marginTop: 20 },
  noIcon: { height: 28 },
  noIconUnderCover: { height: 24 },
  description: { fontSize: 14, marginBottom: 10, marginLeft: 2 },
  title: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '700',
    marginBottom: 14,
    paddingVertical: 0,
    paddingHorizontal: 2,
    ...webNoOutline,
  },
  tail: { minHeight: 220 },
});
