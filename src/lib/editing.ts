import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

import { newId } from './ids';
import { childrenOf, flattenPage, containingPageId, type Tree } from './tree';
import { isPageLike, isTextless, type Block, type BlockType, type EditResult, type Patch } from './types';

/** Types whose next block continues the same type when you press Enter. */
const CONTINUING_TYPES: ReadonlySet<BlockType> = new Set(['bullet', 'numbered', 'todo']);

/** Types that turn back into plain text on Enter or Backspace when empty. */
const FALLBACK_TO_TEXT: ReadonlySet<BlockType> = new Set([
  'bullet',
  'numbered',
  'todo',
  'toggle',
  'quote',
  'callout',
]);

function get(tree: Tree, id: string): Block {
  const block = tree.map.get(id);
  if (!block) throw new Error(`Unknown block ${id}`);
  return block;
}

function patchOf(put: Block[], remove: string[] = []): Patch {
  return { put, remove };
}

function edited(block: Block, fields: Partial<Block>, now: number): Block {
  return { ...block, ...fields, updatedAt: now };
}

export function newBlock(
  fields: Pick<Block, 'type' | 'parentId' | 'position'> & Partial<Block>,
  now: number,
): Block {
  return {
    id: newId(),
    text: '',
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

/** Key that sorts directly after `afterId` among the children of `parentId` (or first, if null). */
export function keyAfter(tree: Tree, parentId: string | null, afterId: string | null): string {
  const siblings = childrenOf(tree, parentId);
  if (afterId === null) return generateKeyBetween(null, siblings[0]?.position ?? null);
  const index = siblings.findIndex((block) => block.id === afterId);
  if (index === -1) return keyAtEnd(tree, parentId);
  return generateKeyBetween(siblings[index].position, siblings[index + 1]?.position ?? null);
}

export function keyAtEnd(tree: Tree, parentId: string | null): string {
  const siblings = childrenOf(tree, parentId);
  return generateKeyBetween(siblings[siblings.length - 1]?.position ?? null, null);
}

function descendantIds(tree: Tree, id: string): string[] {
  const result: string[] = [];
  const walk = (parentId: string) => {
    for (const child of childrenOf(tree, parentId)) {
      result.push(child.id);
      walk(child.id);
    }
  };
  walk(id);
  return result;
}

/** Re-parent `blocks` to the end of `parentId`'s children, keeping their order. */
function appendChildren(tree: Tree, blocks: readonly Block[], parentId: string, now: number): Block[] {
  const existing = childrenOf(tree, parentId);
  let previous = existing[existing.length - 1]?.position ?? null;
  return blocks.map((block) => {
    previous = generateKeyBetween(previous, null);
    return edited(block, { parentId, position: previous }, now);
  });
}

function hasOpenChildren(tree: Tree, block: Block): boolean {
  if (isPageLike(block.type)) return false;
  if (block.type === 'toggle') return !block.collapsed;
  return childrenOf(tree, block.id).length > 0;
}

/** Creates a page at the top level, or as a sub-page at the end of a page's content. */
export function createPage(
  tree: Tree,
  parentId: string | null,
  now: number,
  fields: Partial<Block> = {},
): EditResult {
  const page = newBlock(
    { type: 'page', parentId, position: keyAtEnd(tree, parentId), viewedAt: now, ...fields },
    now,
  );
  return { patch: patchOf([page]), focus: { id: 'title', offset: 0 } };
}

export function insertBlock(
  tree: Tree,
  options: { parentId: string; after: string | null; type: BlockType; text?: string },
  now: number,
): EditResult {
  const block = newBlock(
    {
      type: options.type,
      parentId: options.parentId,
      position: keyAfter(tree, options.parentId, options.after),
      text: options.type === 'divider' ? '' : (options.text ?? ''),
      ...(options.type === 'todo' ? { checked: false } : {}),
      ...(options.type === 'callout' ? { icon: '💡' } : {}),
    },
    now,
  );
  if (block.type === 'page') return { patch: patchOf([{ ...block, viewedAt: now }]), open: block.id };
  if (block.type === 'divider') {
    const after = newBlock(
      {
        type: 'text',
        parentId: options.parentId,
        position: generateKeyBetween(block.position, nextSiblingKey(tree, options.parentId, options.after)),
      },
      now,
    );
    return { patch: patchOf([block, after]), focus: { id: after.id, offset: 0 } };
  }
  return { patch: patchOf([block]), focus: { id: block.id, offset: block.text.length } };
}

function nextSiblingKey(tree: Tree, parentId: string, afterId: string | null): string | null {
  const siblings = childrenOf(tree, parentId);
  if (afterId === null) return siblings[0]?.position ?? null;
  const index = siblings.findIndex((block) => block.id === afterId);
  return index === -1 ? null : (siblings[index + 1]?.position ?? null);
}

export function updateBlock(
  tree: Tree,
  id: string,
  fields: Partial<Omit<Block, 'id' | 'createdAt'>>,
  now: number,
  options: { edit?: boolean } = { edit: true },
): Patch {
  const block = get(tree, id);
  const updated = options.edit === false ? { ...block, ...fields } : edited(block, fields, now);
  return patchOf([updated]);
}

/** Enter pressed with the caret at `offset`. */
export function splitBlock(tree: Tree, id: string, offset: number, now: number): EditResult {
  const block = get(tree, id);
  const parentId = block.parentId!;
  const parent = tree.map.get(parentId);

  if (block.text === '' && FALLBACK_TO_TEXT.has(block.type)) {
    if (parent && !isPageLike(parent.type)) {
      const result = outdent(tree, id, now);
      if (result) return { ...result, focus: { id, offset: 0 } };
    }
    return { patch: updateBlock(tree, id, { type: 'text', checked: undefined }, now), focus: { id, offset: 0 } };
  }

  const nextType: BlockType = CONTINUING_TYPES.has(block.type) ? block.type : 'text';

  if (offset === 0 && block.text !== '') {
    // Notion keeps the caret on the current block and opens an empty one above.
    const siblings = childrenOf(tree, parentId);
    const index = siblings.findIndex((sibling) => sibling.id === id);
    const before = newBlock(
      {
        type: nextType,
        parentId,
        position: generateKeyBetween(siblings[index - 1]?.position ?? null, block.position),
        ...(nextType === 'todo' ? { checked: false } : {}),
      },
      now,
    );
    return { patch: patchOf([before]), focus: { id, offset: 0 } };
  }

  const head = block.text.slice(0, offset);
  const tail = block.text.slice(offset);
  const intoChildren = hasOpenChildren(tree, block);
  const created = newBlock(
    {
      type: nextType,
      text: tail,
      parentId: intoChildren ? block.id : parentId,
      position: intoChildren ? keyAfter(tree, block.id, null) : keyAfter(tree, parentId, block.id),
      ...(nextType === 'todo' ? { checked: false } : {}),
    },
    now,
  );
  return {
    patch: patchOf([edited(block, { text: head }, now), created]),
    focus: { id: created.id, offset: 0 },
  };
}

/**
 * Text with line breaks typed or pasted into a block: the first line stays in
 * the block and each following line becomes a text block below it.
 */
export function insertLines(
  tree: Tree,
  id: string,
  change: { start: number; inserted: string; removed: number },
  now: number,
): EditResult {
  const block = get(tree, id);
  const tail = block.text.slice(change.start + change.removed);
  const lines = (block.text.slice(0, change.start) + change.inserted + tail).split('\n');
  const parentId = block.parentId!;
  const keys = generateNKeysBetween(block.position, nextSiblingKey(tree, parentId, id), lines.length - 1);
  const created = lines.slice(1).map((text, index) =>
    newBlock({ type: 'text', parentId, position: keys[index], text }, now),
  );
  const last = created[created.length - 1];
  return {
    patch: patchOf([edited(block, { text: lines[0] }, now), ...created]),
    focus: last ? { id: last.id, offset: last.text.length - tail.length } : undefined,
  };
}

/** Backspace pressed with the caret at the start of a block. Null when nothing happens. */
export function backspaceAtStart(tree: Tree, id: string, now: number): EditResult | null {
  const block = get(tree, id);

  if (block.type !== 'text' && !isTextless(block.type)) {
    return {
      patch: updateBlock(tree, id, { type: 'text', checked: undefined, collapsed: undefined }, now),
      focus: { id, offset: 0 },
    };
  }

  const parent = block.parentId ? tree.map.get(block.parentId) : undefined;
  if (parent && !isPageLike(parent.type)) {
    const result = outdent(tree, id, now);
    if (result) return { ...result, focus: { id, offset: 0 } };
  }

  const pageId = containingPageId(tree, id);
  if (!pageId) return null;
  const rows = flattenPage(tree, pageId);
  const index = rows.findIndex((row) => row.block.id === id);
  const previous = rows[index - 1]?.block;

  if (!previous) {
    const title = get(tree, pageId).text;
    if (block.text !== '') return { patch: patchOf([]), focus: { id: 'title', offset: title.length } };
    return { patch: patchOf([], [id]), focus: { id: 'title', offset: title.length } };
  }

  if (previous.type === 'divider') {
    return { patch: patchOf([], [previous.id]), focus: { id, offset: 0 } };
  }

  if (isPageLike(previous.type)) {
    if (block.text !== '') return null;
    const next = rows[index + 1]?.block;
    return {
      patch: patchOf([], [id]),
      focus: next && !isTextless(next.type) ? { id: next.id, offset: 0 } : undefined,
    };
  }

  const moved = appendChildren(tree, childrenOf(tree, id), previous.id, now);
  return {
    patch: patchOf([edited(previous, { text: previous.text + block.text }, now), ...moved], [id]),
    focus: { id: previous.id, offset: previous.text.length },
  };
}

/** Nest a block under its previous sibling. */
export function indent(tree: Tree, id: string, now: number): EditResult | null {
  const block = get(tree, id);
  if (block.parentId === null) return null;
  const siblings = childrenOf(tree, block.parentId).filter((sibling) => !sibling.deletedAt);
  const previous = siblings[siblings.findIndex((sibling) => sibling.id === id) - 1];
  if (!previous || isTextless(previous.type)) return null;

  const put = [edited(block, { parentId: previous.id, position: keyAtEnd(tree, previous.id) }, now)];
  if (previous.type === 'toggle' && previous.collapsed) {
    put.push(edited(previous, { collapsed: false }, now));
  }
  return { patch: patchOf(put) };
}

/**
 * Move a block out of its parent block. Following siblings become its
 * children so the reading order stays the same, as in Notion.
 */
export function outdent(tree: Tree, id: string, now: number): EditResult | null {
  const block = get(tree, id);
  const parent = block.parentId ? tree.map.get(block.parentId) : undefined;
  if (!parent || isPageLike(parent.type) || parent.parentId === null) return null;

  const siblings = childrenOf(tree, parent.id);
  const followers = siblings.slice(siblings.findIndex((sibling) => sibling.id === id) + 1);
  const moved = edited(
    block,
    { parentId: parent.parentId, position: keyAfter(tree, parent.parentId, parent.id) },
    now,
  );
  return { patch: patchOf([moved, ...appendChildren(tree, followers, block.id, now)]) };
}

export function moveBlock(tree: Tree, id: string, direction: 'up' | 'down', now: number): EditResult | null {
  const block = get(tree, id);
  const siblings = childrenOf(tree, block.parentId).filter((sibling) => !sibling.deletedAt);
  const index = siblings.findIndex((sibling) => sibling.id === id);
  let position: string;
  if (direction === 'up') {
    if (index <= 0) return null;
    position = generateKeyBetween(siblings[index - 2]?.position ?? null, siblings[index - 1].position);
  } else {
    if (index === -1 || index >= siblings.length - 1) return null;
    position = generateKeyBetween(siblings[index + 1].position, siblings[index + 2]?.position ?? null);
  }
  return { patch: patchOf([edited(block, { position }, now)]) };
}

/** "Turn into" another block type. */
export function changeType(tree: Tree, id: string, type: BlockType, now: number): EditResult {
  const block = get(tree, id);
  if (type === 'divider') {
    const after = newBlock(
      { type: 'text', parentId: block.parentId, position: keyAfter(tree, block.parentId, id) },
      now,
    );
    return {
      patch: patchOf([edited(block, { type, text: '', checked: undefined }, now), after]),
      focus: { id: after.id, offset: 0 },
    };
  }
  const fields: Partial<Block> = {
    type,
    checked: type === 'todo' ? (block.checked ?? false) : undefined,
    collapsed: type === 'toggle' ? block.collapsed : undefined,
    icon: type === 'callout' ? (block.icon ?? '💡') : type === 'page' ? null : block.icon,
  };
  if (type === 'page') return { patch: patchOf([edited(block, { ...fields, viewedAt: null }, now)]) };
  return { patch: patchOf([edited(block, fields, now)]), focus: { id, offset: block.text.length } };
}

/**
 * Remove a content block and everything inside it. Pages go to the trash
 * instead. Focus moves to the end of the previous row.
 */
export function deleteBlock(tree: Tree, id: string, now: number): EditResult {
  const block = get(tree, id);
  if (isPageLike(block.type)) return { patch: trashPage(tree, id, now) };

  const pageId = containingPageId(tree, id);
  const rows = pageId ? flattenPage(tree, pageId) : [];
  const index = rows.findIndex((row) => row.block.id === id);
  const previous = rows
    .slice(0, Math.max(index, 0))
    .reverse()
    .find((row) => !isTextless(row.block.type))?.block;
  return {
    patch: patchOf([], [id, ...descendantIds(tree, id)]),
    focus: previous ? { id: previous.id, offset: previous.text.length } : undefined,
  };
}

export function trashPage(tree: Tree, id: string, now: number): Patch {
  return patchOf([{ ...get(tree, id), deletedAt: now }]);
}

export function restorePage(tree: Tree, id: string, now: number): Patch {
  const page = get(tree, id);
  const parentExists = page.parentId === null || tree.map.has(page.parentId);
  return patchOf([
    {
      ...page,
      deletedAt: null,
      ...(parentExists ? {} : { parentId: null, position: keyAtEnd(tree, null) }),
      updatedAt: now,
    },
  ]);
}

/** Delete a page and its contents for good. */
export function purgePage(tree: Tree, id: string): Patch {
  return patchOf([], [id, ...descendantIds(tree, id)]);
}

const SHORTCUTS: readonly [string, BlockType][] = [
  ['### ', 'h3'],
  ['## ', 'h2'],
  ['# ', 'h1'],
  ['[] ', 'todo'],
  ['[ ] ', 'todo'],
  ['- ', 'bullet'],
  ['* ', 'bullet'],
  ['+ ', 'bullet'],
  ['1. ', 'numbered'],
  ['> ', 'toggle'],
  ['" ', 'quote'],
];

/**
 * Markdown-style shortcut typed at the start of a text block, such as `# ` or
 * `- `. Returns the new type and the remaining text, or null.
 */
export function markdownShortcut(
  previousText: string,
  text: string,
): { type: BlockType; text: string } | null {
  if (text === '---') return { type: 'divider', text: '' };
  if (text.startsWith('```') && !previousText.startsWith('```')) {
    return { type: 'code', text: text.slice(3) };
  }
  for (const [prefix, type] of SHORTCUTS) {
    if (text.startsWith(prefix) && !previousText.startsWith(prefix)) {
      return { type, text: text.slice(prefix.length) };
    }
  }
  return null;
}

/**
 * Text typed after a `/` that opened the block menu. Null once the command
 * is no longer being typed (the slash was deleted, or a line break was added).
 */
export function slashQuery(text: string, slashIndex: number, caret: number): string | null {
  if (text[slashIndex] !== '/' || caret <= slashIndex) return null;
  const query = text.slice(slashIndex + 1, caret);
  if (query.includes('\n') || query.length > 24 || query.startsWith(' ')) return null;
  return query;
}

/**
 * Apply a block-menu choice made from a `/` command: the command text is
 * removed, then the block becomes the chosen type, or, when it still has
 * other text, a new block of that type is added below.
 */
export function applySlashCommand(
  tree: Tree,
  id: string,
  slashIndex: number,
  caret: number,
  type: BlockType,
  now: number,
): EditResult {
  const block = get(tree, id);
  const text = block.text.slice(0, slashIndex) + block.text.slice(caret);
  const cleaned = edited(block, { text }, now);
  const cleanedTree = withBlock(tree, cleaned);

  if (type === 'page') {
    const page = newBlock(
      { type: 'page', parentId: block.parentId, position: keyAfter(tree, block.parentId, id), viewedAt: now },
      now,
    );
    const put = text === '' ? [page] : [cleaned, page];
    return { patch: patchOf(put, text === '' ? [id] : []), open: page.id };
  }

  if (text === '') {
    const result = changeType(cleanedTree, id, type, now);
    return { ...result, patch: mergePatches(patchOf([cleaned]), result.patch) };
  }
  const result = insertBlock(cleanedTree, { parentId: block.parentId!, after: id, type }, now);
  return { ...result, patch: mergePatches(patchOf([cleaned]), result.patch) };
}

/** A tree with one block replaced; enough for chaining edits in one step. */
export function withBlock(tree: Tree, block: Block): Tree {
  const map = new Map(tree.map);
  map.set(block.id, block);
  const children = new Map(tree.children);
  const replace = (list: readonly Block[]) => list.map((item) => (item.id === block.id ? block : item));
  const siblings = children.get(block.parentId);
  if (siblings) children.set(block.parentId, replace(siblings));
  return { map, children };
}

/** Later puts win over earlier ones for the same id. */
export function mergePatches(...patches: Patch[]): Patch {
  const put = new Map<string, Block>();
  const remove = new Set<string>();
  for (const patch of patches) {
    for (const block of patch.put) {
      put.set(block.id, block);
      remove.delete(block.id);
    }
    for (const id of patch.remove) {
      remove.add(id);
      put.delete(id);
    }
  }
  return { put: [...put.values()], remove: [...remove] };
}
