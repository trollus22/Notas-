import { generateNKeysBetween } from 'fractional-indexing';

import { buildTree, flattenPage, type Tree } from '../tree';
import type { Block, BlockType, Patch } from '../types';

export interface Node {
  id: string;
  type: BlockType;
  text?: string;
  children?: Node[];
  extra?: Partial<Block>;
}

export const n = (id: string, type: BlockType, text = '', children?: Node[], extra?: Partial<Block>): Node => ({
  id,
  type,
  text,
  children,
  extra,
});

/** Builds a tree with readable ids from nested nodes. Top-level nodes are root pages. */
export function treeOf(...roots: Node[]): Tree {
  const map = new Map<string, Block>();
  const add = (nodes: Node[], parentId: string | null) => {
    const keys = generateNKeysBetween(null, null, nodes.length);
    nodes.forEach((node, index) => {
      map.set(node.id, {
        id: node.id,
        type: node.type,
        parentId,
        position: keys[index],
        text: node.text ?? '',
        createdAt: 0,
        updatedAt: 0,
        ...node.extra,
      });
      if (node.children) add(node.children, node.id);
    });
  };
  add(roots, null);
  return buildTree(map);
}

export function applyPatch(tree: Tree, patch: Patch): Tree {
  const map = new Map(tree.map);
  for (const id of patch.remove) map.delete(id);
  for (const block of patch.put) map.set(block.id, block);
  return buildTree(map);
}

/** Page content as `depth:type:text` lines, which reads well in assertions. */
export function outline(tree: Tree, pageId: string): string[] {
  return flattenPage(tree, pageId).map(
    ({ block, depth, number }) =>
      `${'  '.repeat(depth)}${block.type}${number ? `#${number}` : ''}:${block.text}`,
  );
}
