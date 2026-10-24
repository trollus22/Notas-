import { buildTree, containingPageId, type Tree } from '@/lib/tree';
import type { Block, Patch } from '@/lib/types';

/** Durable storage for blocks. Saves receive only what changed. */
export interface Persistence {
  load(): Promise<Block[]>;
  save(put: Block[], remove: string[]): Promise<void>;
  /** Small key/value settings stored next to the blocks. */
  loadMeta(key: string): Promise<string | null>;
  saveMeta(key: string, value: string): Promise<void>;
}

/**
 * The whole workspace lives in memory so every screen reads it synchronously;
 * changes are written to storage in small batches shortly after they happen.
 */
export class Workspace {
  private readonly blocks = new Map<string, Block>();
  private tree: Tree = buildTree(this.blocks);
  private readonly listeners = new Set<() => void>();
  private readonly dirty = new Set<string>();
  private readonly removed = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> = Promise.resolve();

  constructor(
    private readonly persistence: Persistence,
    private readonly flushDelayMs = 400,
  ) {}

  static async open(persistence: Persistence, flushDelayMs?: number): Promise<Workspace> {
    const workspace = new Workspace(persistence, flushDelayMs);
    for (const block of await persistence.load()) workspace.blocks.set(block.id, block);
    workspace.tree = buildTree(workspace.blocks);
    return workspace;
  }

  getTree = (): Tree => this.tree;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Apply a patch. Content edits also mark their page as edited, so "recently
   * edited" lists reflect typing inside a page.
   */
  apply = (patch: Patch, now: number = Date.now()): void => {
    if (patch.put.length === 0 && patch.remove.length === 0) return;

    const touchedPages = new Set<string>();
    for (const id of patch.remove) {
      const pageId = containingPageId(this.tree, id);
      if (pageId) touchedPages.add(pageId);
    }

    for (const id of patch.remove) {
      this.blocks.delete(id);
      this.dirty.delete(id);
      this.removed.add(id);
    }
    for (const block of patch.put) {
      this.blocks.set(block.id, block);
      this.removed.delete(block.id);
      this.dirty.add(block.id);
    }
    this.tree = buildTree(this.blocks);

    for (const block of patch.put) {
      if (block.type === 'page') continue;
      const pageId = containingPageId(this.tree, block.id);
      if (pageId) touchedPages.add(pageId);
    }
    let pagesChanged = false;
    for (const pageId of touchedPages) {
      const page = this.blocks.get(pageId);
      if (!page || page.updatedAt === now) continue;
      this.blocks.set(pageId, { ...page, updatedAt: now });
      this.dirty.add(pageId);
      pagesChanged = true;
    }
    if (pagesChanged) this.tree = buildTree(this.blocks);

    this.scheduleFlush();
    for (const listener of this.listeners) listener();
  };

  /** Replace the whole workspace, for example with a fresh copy of the starting pages. */
  replaceAll = async (patch: Patch): Promise<void> => {
    await this.flush();
    const incoming = new Set(patch.put.map((block) => block.id));
    const remove = [...this.blocks.keys()].filter((id) => !incoming.has(id));
    this.apply({ put: patch.put, remove });
    await this.flush();
  };

  /** Write pending changes now. Resolves once they are stored. */
  flush = (): Promise<void> => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.dirty.size === 0 && this.removed.size === 0) return this.saving;

    const put = [...this.dirty].map((id) => this.blocks.get(id)!).filter(Boolean);
    const remove = [...this.removed];
    this.dirty.clear();
    this.removed.clear();
    this.saving = this.saving
      .then(() => this.persistence.save(put, remove))
      .catch((error: unknown) => {
        // Keep the changes queued so the next flush retries them.
        for (const block of put) if (this.blocks.has(block.id)) this.dirty.add(block.id);
        for (const id of remove) if (!this.blocks.has(id)) this.removed.add(id);
        console.warn('No se pudieron guardar los cambios', error);
      });
    return this.saving;
  };

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.flushDelayMs);
  }
}
