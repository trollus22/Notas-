import {
  containingPageId,
  flattenPage,
  favoritePages,
  isAlive,
  pageAncestors,
  recentPages,
  privatePages,
  searchPages,
  subPages,
  trashedPages,
} from '../tree';
import { n, outline, treeOf } from './helpers';

describe('flattenPage', () => {
  it('lists content in reading order with depth and list numbers', () => {
    const tree = treeOf(
      n('p', 'page', 'Página', [
        n('a', 'numbered', 'uno'),
        n('b', 'numbered', 'dos', [n('b1', 'bullet', 'dentro')]),
        n('c', 'text', 'corte'),
        n('d', 'numbered', 'otra vez'),
      ]),
    );
    expect(outline(tree, 'p')).toEqual([
      'numbered#1:uno',
      'numbered#2:dos',
      '  bullet:dentro',
      'text:corte',
      'numbered#1:otra vez',
    ]);
  });

  it('counts list nesting for bullet styles', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('a', 'bullet', 'a', [n('b', 'bullet', 'b', [n('c', 'bullet', 'c')])]), n('t', 'toggle', 't', [n('d', 'bullet', 'd')])]));
    expect(flattenPage(tree, 'p').map((row) => [row.block.id, row.listLevel])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
      ['t', 0],
      ['d', 0],
    ]);
  });

  it('hides the children of closed toggles and the content of sub-pages', () => {
    const tree = treeOf(
      n('p', 'page', 'Página', [
        n('t', 'toggle', 'cerrado', [n('t1', 'text', 'oculto')], { collapsed: true }),
        n('o', 'toggle', 'abierto', [n('o1', 'text', 'visible')]),
        n('s', 'page', 'Sub', [n('s1', 'text', 'en la subpágina')]),
      ]),
    );
    expect(outline(tree, 'p')).toEqual(['toggle:cerrado', 'toggle:abierto', '  text:visible', 'page:Sub']);
  });

  it('skips trashed sub-pages', () => {
    const tree = treeOf(n('p', 'page', 'Página', [n('s', 'page', 'Sub', [], { deletedAt: 5 })]));
    expect(outline(tree, 'p')).toEqual([]);
  });
});

describe('page queries', () => {
  const tree = treeOf(
    n('a', 'page', 'Alfa', [n('a1', 'toggle', '', [n('a2', 'page', 'Anidada', [n('a3', 'text', 'café con leche')])])], {
      favorite: true,
      viewedAt: 10,
      updatedAt: 1,
    }),
    n('b', 'page', 'Beta', [n('b1', 'text', 'nada')], { viewedAt: 20, updatedAt: 2 }),
    n('c', 'page', 'Café', [n('c1', 'page', 'Hija')], { deletedAt: 30 }),
  );

  it('finds the page that contains a block', () => {
    expect(containingPageId(tree, 'a3')).toBe('a2');
    expect(containingPageId(tree, 'a2')).toBe('a');
    expect(containingPageId(tree, 'a')).toBeNull();
    expect(pageAncestors(tree, 'a2').map((page) => page.id)).toEqual(['a']);
  });

  it('treats everything inside a trashed page as gone', () => {
    expect(isAlive(tree, 'c1')).toBe(false);
    expect(isAlive(tree, 'a3')).toBe(true);
    expect(privatePages(tree).map((page) => page.id)).toEqual(['a', 'b']);
    expect(trashedPages(tree).map((page) => page.id)).toEqual(['c']);
  });

  it('finds sub-pages nested inside content blocks', () => {
    expect(subPages(tree, 'a').map((page) => page.id)).toEqual(['a2']);
  });

  it('orders recents by last visit and keeps favourites', () => {
    expect(recentPages(tree, 5).map((page) => page.id)).toEqual(['b', 'a']);
    expect(favoritePages(tree).map((page) => page.id)).toEqual(['a']);
  });

  it('searches titles and content, ignoring accents and trashed pages', () => {
    const results = searchPages(tree, 'cafe');
    expect(results).toEqual([{ page: expect.objectContaining({ id: 'a2' }), snippet: 'café con leche' }]);
    expect(searchPages(tree, 'ANIDADA').map((result) => result.page.id)).toEqual(['a2']);
    expect(searchPages(tree, '   ')).toEqual([]);
  });
});
