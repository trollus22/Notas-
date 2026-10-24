import { pageToText } from '../export';
import { n, treeOf } from './helpers';

describe('pageToText', () => {
  it('writes a page as Markdown-like text', () => {
    const tree = treeOf(
      n('p', 'page', 'Plan', [
        n('a', 'h2', 'Hoy'),
        n('b', 'todo', 'Correo', [], { checked: true }),
        n('c', 'numbered', 'Uno', [n('c1', 'bullet', 'Detalle')]),
        n('d', 'divider'),
        n('e', 'page', ''),
      ]),
    );
    expect(pageToText(tree, 'p')).toBe(['# Plan', '', '## Hoy', '- [x] Correo', '1. Uno', '  - Detalle', '---', '📄 Sin título'].join('\n'));
  });

  it('returns nothing for unknown pages', () => {
    expect(pageToText(treeOf(), 'x')).toBe('');
  });
});
