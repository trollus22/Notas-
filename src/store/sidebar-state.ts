import { useSyncExternalStore } from 'react';

/** Which sidebar rows and sections are open. Kept for the life of the app, like Notion. */
const open = new Map<string, boolean>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function isExpanded(key: string, fallback: boolean): boolean {
  return open.get(key) ?? fallback;
}

export function toggleExpanded(key: string, fallback: boolean): void {
  open.set(key, !isExpanded(key, fallback));
  for (const listener of listeners) listener();
}

/**
 * Whether a row or section is open; `fallback` applies until it is toggled.
 * The value itself is the store snapshot, so memoizing compilers re-read it on change.
 */
export function useExpanded(key: string, fallback = false): boolean {
  const read = () => isExpanded(key, fallback);
  return useSyncExternalStore(subscribe, read, read);
}
