import { isPageLike, type Block, type BlockColor, type BlockMap } from './types';

/** Read-only view of the workspace with a parent → children index. */
export interface Tree {
  map: BlockMap;
  children: ReadonlyMap<string | null, readonly Block[]>;
}

export interface Row {
  block: Block;
  depth: number;
  /** 1-based index within a run of numbered siblings. */
  number?: number;
  /** How many bulleted list items this row sits inside (bullet style alternates by it). */
  listLevel: number;
  /** Rows drawn inside a callout's coloured box. */
  container?: { color: BlockColor; first: boolean; last: boolean };
}

export function comparePosition(a: Block, b: Block): number {
  // Fractional index keys are ordered by plain code-unit comparison.
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function buildTree(map: BlockMap): Tree {
  const children = new Map<string | null, Block[]>();
  for (const block of map.values()) {
    const list = children.get(block.parentId);
    if (list) list.push(block);
    else children.set(block.parentId, [block]);
  }
  for (const list of children.values()) list.sort(comparePosition);
  return { map, children };
}

const NO_CHILDREN: readonly Block[] = [];

export function childrenOf(tree: Tree, parentId: string | null): readonly Block[] {
  return tree.children.get(parentId) ?? NO_CHILDREN;
}

/** False when the block or any ancestor is in the trash, or the block does not exist. */
export function isAlive(tree: Tree, id: string): boolean {
  let current = tree.map.get(id);
  while (current) {
    if (current.deletedAt) return false;
    if (current.parentId === null) return true;
    current = tree.map.get(current.parentId);
  }
  return false;
}

/** Nearest ancestor page or database (excluding the block itself), or null. */
export function containingPageId(tree: Tree, id: string): string | null {
  let parentId = tree.map.get(id)?.parentId ?? null;
  while (parentId !== null) {
    const parent = tree.map.get(parentId);
    if (!parent) return null;
    if (isPageLike(parent.type)) return parent.id;
    parentId = parent.parentId;
  }
  return null;
}

/** Teamspaces, pages and databases from the top level down to (not including) the given block. */
export function pageAncestors(tree: Tree, id: string): Block[] {
  const result: Block[] = [];
  let parentId = tree.map.get(id)?.parentId ?? null;
  while (parentId !== null) {
    const parent = tree.map.get(parentId);
    if (!parent) break;
    if (isPageLike(parent.type) || parent.type === 'teamspace') result.unshift(parent);
    parentId = parent.parentId;
  }
  return result;
}

/**
 * The visible rows of a page's content in reading order. Sub-pages and
 * databases appear as a single row; closed toggles hide their children.
 */
export function flattenPage(tree: Tree, pageId: string): Row[] {
  const rows: Row[] = [];
  const walk = (parentId: string, depth: number, container: Row['container'], listLevel: number) => {
    let number = 0;
    for (const block of childrenOf(tree, parentId)) {
      if (block.deletedAt) continue;
      number = block.type === 'numbered' ? number + 1 : 0;
      const row: Row = { block, depth, listLevel };
      const childLevel = block.type === 'bullet' || block.type === 'numbered' ? listLevel + 1 : listLevel;
      if (block.type === 'numbered') row.number = number;
      if (container) row.container = { ...container, first: false, last: false };
      rows.push(row);

      if (isPageLike(block.type)) continue;
      if (block.type === 'toggle' && block.collapsed) continue;
      if (block.type === 'callout' && !container) {
        const color = block.color && block.color !== 'default' ? block.color : 'gray';
        row.container = { color, first: true, last: false };
        walk(block.id, depth + 1, row.container, childLevel);
        rows[rows.length - 1].container!.last = true;
      } else {
        walk(block.id, depth + 1, container, childLevel);
      }
    }
  };
  walk(pageId, 0, undefined, 0);
  return rows;
}

const alivePageLike = (blocks: readonly Block[]) =>
  blocks.filter((block) => isPageLike(block.type) && !block.deletedAt);

/** Top-level pages and databases: the "Privado" section. */
export function privatePages(tree: Tree): Block[] {
  return alivePageLike(childrenOf(tree, null));
}

export function teamspaces(tree: Tree): Block[] {
  return childrenOf(tree, null).filter((block) => block.type === 'teamspace' && !block.deletedAt);
}

/** Chats with the assistant, most recent first. */
export function chats(tree: Tree): Block[] {
  return childrenOf(tree, null)
    .filter((block) => block.type === 'chat' && !block.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Pages shown under a sidebar entry: a teamspace's pages, or the sub-pages
 * nested anywhere in a page's content. Database rows are not listed.
 */
export function subPages(tree: Tree, id: string): Block[] {
  const parent = tree.map.get(id);
  if (!parent || parent.type === 'database') return [];
  if (parent.type === 'teamspace') return alivePageLike(childrenOf(tree, id));
  const result: Block[] = [];
  const walk = (parentId: string) => {
    for (const block of childrenOf(tree, parentId)) {
      if (block.deletedAt) continue;
      if (isPageLike(block.type)) result.push(block);
      else walk(block.id);
    }
  };
  walk(id);
  return result;
}

function allAlivePages(tree: Tree): Block[] {
  const result: Block[] = [];
  for (const block of tree.map.values()) {
    if (isPageLike(block.type) && isAlive(tree, block.id)) result.push(block);
  }
  return result;
}

export function favoritePages(tree: Tree): Block[] {
  return allAlivePages(tree)
    .filter((page) => page.favorite)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function recentPages(tree: Tree, limit: number): Block[] {
  return allAlivePages(tree)
    .filter((page) => page.viewedAt)
    .sort((a, b) => (b.viewedAt ?? 0) - (a.viewedAt ?? 0))
    .slice(0, limit);
}

export function recentlyEditedPages(tree: Tree, limit: number): Block[] {
  return allAlivePages(tree)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

/** Pages moved to the trash, excluding ones already inside a trashed page. */
export function trashedPages(tree: Tree): Block[] {
  return [...tree.map.values()]
    .filter(
      (block) =>
        isPageLike(block.type) &&
        block.deletedAt &&
        (block.parentId === null || isAlive(tree, block.parentId)),
    )
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

export function normalizeForSearch(text: string): string {
  const decomposed = typeof text.normalize === 'function' ? text.normalize('NFD') : text;
  return decomposed.replace(/[̀-ͯ]/g, '').toLowerCase();
}

export interface SearchResult {
  page: Block;
  /** Text of the first matching content block, when the title did not match. */
  snippet?: string;
}

export function searchPages(tree: Tree, query: string, limit = 50): SearchResult[] {
  const needle = normalizeForSearch(query.trim());
  if (!needle) return [];

  const titleMatches: Block[] = [];
  const contentMatches = new Map<string, string>();

  for (const block of tree.map.values()) {
    if (!normalizeForSearch(block.text).includes(needle)) continue;
    if (!isAlive(tree, block.id)) continue;
    if (isPageLike(block.type)) {
      titleMatches.push(block);
    } else if (block.type !== 'teamspace') {
      const pageId = containingPageId(tree, block.id);
      if (pageId && !contentMatches.has(pageId)) contentMatches.set(pageId, block.text);
    }
  }

  const byEdited = (a: Block, b: Block) => b.updatedAt - a.updatedAt;
  const titled = new Set(titleMatches.map((page) => page.id));
  const results: SearchResult[] = titleMatches.sort(byEdited).map((page) => ({ page }));
  const others = [...contentMatches.entries()]
    .filter(([pageId]) => !titled.has(pageId))
    .map(([pageId, snippet]) => ({ page: tree.map.get(pageId)!, snippet }))
    .sort((a, b) => byEdited(a.page, b.page));
  return [...results, ...others].slice(0, limit);
}
