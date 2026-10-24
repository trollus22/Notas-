import { filterBlockMenu } from '../block-menu';
import {
  applySlashCommand,
  backspaceAtStart,
  changeType,
  createPage,
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
} from '../editing';
import { childrenOf, privatePages, trashedPages } from '../tree';
import type { Block } from '../types';
import { applyPatch, n, outline, treeOf } from './helpers';

const NOW = 1_000;

describe('splitBlock (Enter)', () => {
  it('moves the text after the caret into a new block and focuses it', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'holamundo'), n('b', 'text', 'fin')]));
    const result = splitBlock(tree, 'a', 4, NOW);
    const next = applyPatch(tree, result.patch);
    expect(outline(next, 'p')).toEqual(['text:hola', 'text:mundo', 'text:fin']);
    expect(result.focus).toEqual({ id: next.children.get('p')![1].id, offset: 0 });
  });

  it('continues lists and to-dos, unchecked', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'todo', 'hecho', [], { checked: true })]));
    const next = applyPatch(tree, splitBlock(tree, 'a', 5, NOW).patch);
    const created = next.children.get('p')![1];
    expect(created).toMatchObject({ type: 'todo', text: '', checked: false });
  });

  it('turns headings into plain text on the next line', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'h1', 'Título')]));
    const next = applyPatch(tree, splitBlock(tree, 'a', 6, NOW).patch);
    expect(outline(next, 'p')).toEqual(['h1:Título', 'text:']);
  });

  it('opens an empty block above when the caret is at the start', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'h2', 'Título')]));
    const result = splitBlock(tree, 'a', 0, NOW);
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['text:', 'h2:Título']);
    expect(result.focus).toEqual({ id: 'a', offset: 0 });
  });

  it('ends a list when Enter is pressed on an empty item', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'bullet', '')]));
    expect(outline(applyPatch(tree, splitBlock(tree, 'a', 0, NOW).patch), 'p')).toEqual(['text:']);
  });

  it('outdents an empty nested item instead of converting it', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'bullet', 'padre', [n('b', 'bullet', '')])]));
    expect(outline(applyPatch(tree, splitBlock(tree, 'b', 0, NOW).patch), 'p')).toEqual(['bullet:padre', 'bullet:']);
  });

  it('puts the new block inside an open toggle', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('t', 'toggle', 'abre', [n('c', 'text', 'hijo')])]));
    expect(outline(applyPatch(tree, splitBlock(tree, 't', 4, NOW).patch), 'p')).toEqual([
      'toggle:abre',
      '  text:',
      '  text:hijo',
    ]);
  });
});

describe('insertLines (paste)', () => {
  it('turns each pasted line into a block and keeps the caret before the old tail', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'inicio|fin'), n('z', 'text', 'después')]));
    const result = insertLines(tree, 'a', { start: 7, inserted: 'uno\ndos\ntres', removed: 0 }, NOW);
    const next = applyPatch(tree, result.patch);
    expect(outline(next, 'p')).toEqual(['text:inicio|uno', 'text:dos', 'text:tresfin', 'text:después']);
    expect(result.focus).toEqual({ id: next.children.get('p')![2].id, offset: 4 });
  });

  it('replaces a selection that was pasted over', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'aXXb')]));
    const result = insertLines(tree, 'a', { start: 1, inserted: '1\n2', removed: 2 }, NOW);
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['text:a1', 'text:2b']);
  });
});

describe('backspaceAtStart', () => {
  it('turns a formatted block back into text first', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'h1', 'Título')]));
    const result = backspaceAtStart(tree, 'a', NOW)!;
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['text:Título']);
  });

  it('outdents a nested text block', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'bullet', 'padre', [n('b', 'text', 'hijo')])]));
    const result = backspaceAtStart(tree, 'b', NOW)!;
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['bullet:padre', 'text:hijo']);
  });

  it('merges into the previous row and keeps the caret at the join', () => {
    const tree = treeOf(
      n('p', 'page', 'P', [n('a', 'bullet', 'uno', [n('a1', 'text', 'dos')]), n('b', 'text', 'tres', [n('b1', 'text', 'hijo')])]),
    );
    const result = backspaceAtStart(tree, 'b', NOW)!;
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['bullet:uno', '  text:dostres', '    text:hijo']);
    expect(result.focus).toEqual({ id: 'a1', offset: 3 });
  });

  it('removes a divider above instead of merging', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('d', 'divider'), n('a', 'text', 'texto')]));
    expect(outline(applyPatch(tree, backspaceAtStart(tree, 'a', NOW)!.patch), 'p')).toEqual(['text:texto']);
  });

  it('moves to the title from the first block', () => {
    const tree = treeOf(n('p', 'page', 'Mi página', [n('a', 'text', '')]));
    const result = backspaceAtStart(tree, 'a', NOW)!;
    expect(result.focus).toEqual({ id: 'title', offset: 9 });
    expect(result.patch.remove).toEqual(['a']);
  });
});

describe('indent and outdent', () => {
  it('nests under the previous sibling and opens a closed toggle', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('t', 'toggle', 't', [], { collapsed: true }), n('a', 'text', 'a')]));
    const next = applyPatch(tree, indent(tree, 'a', NOW)!.patch);
    expect(outline(next, 'p')).toEqual(['toggle:t', '  text:a']);
  });

  it('does nothing without a previous sibling or under a page', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('s', 'page', 'Sub'), n('a', 'text', 'a')]));
    expect(indent(tree, 's', NOW)).toBeNull();
    expect(indent(tree, 'a', NOW)).toBeNull();
    expect(outdent(tree, 'a', NOW)).toBeNull();
  });

  it('keeps the reading order when outdenting from the middle', () => {
    const tree = treeOf(
      n('p', 'page', 'P', [n('x', 'bullet', 'x', [n('a', 'bullet', 'a'), n('b', 'bullet', 'b'), n('c', 'bullet', 'c')]), n('y', 'text', 'y')]),
    );
    const next = applyPatch(tree, outdent(tree, 'b', NOW)!.patch);
    expect(outline(next, 'p')).toEqual(['bullet:x', '  bullet:a', 'bullet:b', '  bullet:c', 'text:y']);
  });
});

describe('other block operations', () => {
  it('moves blocks among their siblings', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'a'), n('b', 'text', 'b'), n('c', 'text', 'c')]));
    expect(outline(applyPatch(tree, moveBlock(tree, 'c', 'up', NOW)!.patch), 'p')).toEqual(['text:a', 'text:c', 'text:b']);
    expect(outline(applyPatch(tree, moveBlock(tree, 'a', 'down', NOW)!.patch), 'p')).toEqual(['text:b', 'text:a', 'text:c']);
    expect(moveBlock(tree, 'a', 'up', NOW)).toBeNull();
    expect(moveBlock(tree, 'c', 'down', NOW)).toBeNull();
  });

  it('adds a text block after a new divider and focuses it', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'a')]));
    const result = insertBlock(tree, { parentId: 'p', after: 'a', type: 'divider' }, NOW);
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['text:a', 'divider:', 'text:']);
    expect(result.focus?.id).toBe(result.patch.put[1].id);
  });

  it('converts block types, giving callouts an icon', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'aviso')]));
    const block = changeType(tree, 'a', 'callout', NOW).patch.put[0];
    expect(block).toMatchObject({ type: 'callout', text: 'aviso', icon: '💡' });
  });

  it('deletes a block with its children and focuses the row above', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'arriba'), n('b', 'bullet', 'b', [n('b1', 'text', 'hijo')])]));
    const result = deleteBlock(tree, 'b', NOW);
    expect(result.patch.remove.sort()).toEqual(['b', 'b1']);
    expect(result.focus).toEqual({ id: 'a', offset: 6 });
  });

  it('sends pages to the trash, restores them and purges them', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('c', 'text', 'contenido')]), n('q', 'page', 'Q'));
    const trashed = applyPatch(tree, deleteBlock(tree, 'p', NOW).patch);
    expect(privatePages(trashed).map((page) => page.id)).toEqual(['q']);
    expect(trashedPages(trashed).map((page) => page.id)).toEqual(['p']);

    const restored = applyPatch(trashed, restorePage(trashed, 'p', NOW));
    expect(privatePages(restored).map((page) => page.id)).toEqual(['p', 'q']);

    const purged = applyPatch(trashed, purgePage(trashed, 'p'));
    expect([...purged.map.keys()]).toEqual(['q']);
  });

  it('restores a page to the top level when its parent is gone', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('s', 'page', 'Sub')]));
    const withoutParent = applyPatch(applyPatch(tree, trashPage(tree, 's', NOW)), purgePage(tree, 'p'));
    // purgePage(p) also removed s; re-add s as trashed to model an orphan.
    const orphan = applyPatch(withoutParent, { put: [{ ...tree.map.get('s')!, deletedAt: NOW }], remove: [] });
    const restored = applyPatch(orphan, restorePage(orphan, 's', NOW));
    expect(restored.map.get('s')).toMatchObject({ parentId: null, deletedAt: null });
  });

  it('creates top-level pages at the end and focuses the title', () => {
    const tree = treeOf(n('p', 'page', 'P'));
    const result = createPage(tree, null, NOW);
    const next = applyPatch(tree, result.patch);
    expect(privatePages(next).map((page) => page.text)).toEqual(['P', '']);
    expect(result.focus).toEqual({ id: 'title', offset: 0 });
  });
});

describe('typing helpers', () => {
  it('recognises markdown shortcuts once', () => {
    expect(markdownShortcut('#', '# ')).toEqual({ type: 'h1', text: '' });
    expect(markdownShortcut('##', '## Hola')).toEqual({ type: 'h2', text: 'Hola' });
    expect(markdownShortcut('[]', '[] ')).toEqual({ type: 'todo', text: '' });
    expect(markdownShortcut('--', '---')).toEqual({ type: 'divider', text: '' });
    expect(markdownShortcut('- ', '- a')).toBeNull();
    expect(markdownShortcut('', 'hola')).toBeNull();
  });

  it('reads the query typed after a slash', () => {
    expect(slashQuery('hola /tar', 5, 9)).toBe('tar');
    expect(slashQuery('/', 0, 1)).toBe('');
    expect(slashQuery('hola', 2, 4)).toBeNull();
    expect(slashQuery('/a\nb', 0, 4)).toBeNull();
    expect(slashQuery('/ x', 0, 3)).toBeNull();
  });

  it('filters the block menu by Spanish and English names', () => {
    expect(filterBlockMenu('tar')[0].type).toBe('todo');
    expect(filterBlockMenu('todo')[0].type).toBe('todo');
    expect(filterBlockMenu('codigo')[0].type).toBe('code');
    expect(filterBlockMenu('código')[0].type).toBe('code');
    expect(filterBlockMenu('zzz')).toEqual([]);
    expect(filterBlockMenu('')).toHaveLength(13);
  });

  it('applies a slash command to an empty block', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', '/enc')]));
    const result = applySlashCommand(tree, 'a', 0, 4, 'h2', NOW);
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['h2:']);
  });

  it('adds a new block when the line already has text', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', 'hola /tar')]));
    const result = applySlashCommand(tree, 'a', 5, 9, 'todo', NOW);
    expect(outline(applyPatch(tree, result.patch), 'p')).toEqual(['text:hola ', 'todo:']);
  });

  it('creates and opens a sub-page from /página', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'text', '/pag')]));
    const result = applySlashCommand(tree, 'a', 0, 4, 'page', NOW);
    const next = applyPatch(tree, result.patch);
    expect(outline(next, 'p')).toEqual(['page:']);
    expect(result.open).toBe(childrenOf(next, 'p')[0].id);
  });

  it('merges patches with later changes winning', () => {
    const block = { id: 'x', text: 'a' } as Block;
    expect(mergePatches({ put: [block], remove: [] }, { put: [], remove: ['x'] })).toEqual({ put: [], remove: ['x'] });
    expect(mergePatches({ put: [], remove: ['x'] }, { put: [block], remove: [] })).toEqual({ put: [block], remove: [] });
  });
});
