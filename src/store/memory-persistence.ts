import type { Block } from '@/lib/types';

import type { Persistence } from './workspace';

/** Keeps blocks in memory. Used by tests and as the base of the web store. */
export class MemoryPersistence implements Persistence {
  readonly rows = new Map<string, Block>();
  readonly meta = new Map<string, string>();

  constructor(initial: Block[] = []) {
    for (const block of initial) this.rows.set(block.id, block);
  }

  async load(): Promise<Block[]> {
    return [...this.rows.values()];
  }

  async save(put: Block[], remove: string[]): Promise<void> {
    for (const block of put) this.rows.set(block.id, block);
    for (const id of remove) this.rows.delete(id);
  }

  async loadMeta(key: string): Promise<string | null> {
    return this.meta.get(key) ?? null;
  }

  async saveMeta(key: string, value: string): Promise<void> {
    this.meta.set(key, value);
  }
}
