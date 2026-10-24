import type { Block } from '@/lib/types';

import { MemoryPersistence } from './memory-persistence';
import type { Persistence } from './workspace';

const STORAGE_KEY = 'notas:blocks:v1';
const META_PREFIX = 'notas:meta:';

/** Browser storage for the web build. Falls back to memory when storage is unavailable. */
export function createPersistence(): Persistence {
  const memory = new MemoryPersistence(readStored());
  return {
    load: () => memory.load(),
    async save(put, remove) {
      await memory.save(put, remove);
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...memory.rows.values()]));
      } catch {
        // Private mode or full storage: keep working in memory.
      }
    },
    async loadMeta(key) {
      try {
        return globalThis.localStorage?.getItem(META_PREFIX + key) ?? (await memory.loadMeta(key));
      } catch {
        return memory.loadMeta(key);
      }
    },
    async saveMeta(key, value) {
      await memory.saveMeta(key, value);
      try {
        globalThis.localStorage?.setItem(META_PREFIX + key, value);
      } catch {
        // Keep the value in memory only.
      }
    },
  };
}

function readStored(): Block[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Block[]) : [];
  } catch {
    return [];
  }
}
