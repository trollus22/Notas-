import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { Tree } from '@/lib/tree';

import { createPersistence } from './persistence';
import { PreferencesStore, type Preferences } from './preferences';
import { seedPatch } from './seed';
import { Workspace } from './workspace';

interface AppStores {
  workspace: Workspace;
  preferences: PreferencesStore;
}

const StoresContext = createContext<AppStores | null>(null);

async function openStores(): Promise<AppStores> {
  const persistence = createPersistence();
  const [workspace, preferences] = await Promise.all([
    Workspace.open(persistence),
    PreferencesStore.open(persistence),
  ]);
  if (workspace.getTree().map.size === 0) {
    workspace.apply(seedPatch(Date.now()));
    await workspace.flush();
  }
  return { workspace, preferences };
}

/** Loads the workspace and settings from storage and renders `fallback` until they are ready. */
export function WorkspaceProvider({
  children,
  fallback = null,
  onReady,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onReady?: () => void;
}) {
  const [stores, setStores] = useState<AppStores | null>(null);

  useEffect(() => {
    let cancelled = false;
    openStores()
      .then((opened) => {
        if (!cancelled) setStores(opened);
      })
      .catch((error: unknown) => console.error('No se pudo abrir el espacio de trabajo', error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!stores) return;
    onReady?.();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void stores.workspace.flush();
    });
    return () => subscription.remove();
  }, [stores, onReady]);

  if (!stores) return fallback;
  return <StoresContext.Provider value={stores}>{children}</StoresContext.Provider>;
}

function useStores(): AppStores {
  const stores = useContext(StoresContext);
  if (!stores) throw new Error('Workspace hooks must be used inside WorkspaceProvider');
  return stores;
}

export function useWorkspace(): Workspace {
  return useStores().workspace;
}

/** The current workspace tree; re-renders when anything changes. */
export function useTree(): Tree {
  const workspace = useWorkspace();
  return useSyncExternalStore(workspace.subscribe, workspace.getTree, workspace.getTree);
}

export function usePreferences(): [Preferences, PreferencesStore['set']] {
  const { preferences } = useStores();
  const value = useSyncExternalStore(preferences.subscribe, preferences.get, preferences.get);
  return [value, preferences.set];
}
