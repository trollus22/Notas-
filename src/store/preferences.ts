import type { Persistence } from './workspace';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Preferences {
  theme: ThemePreference;
  pushNotifications: boolean;
  upcomingMeetings: boolean;
  workspaceActivity: boolean;
  alwaysEmail: boolean;
  pageUpdates: boolean;
  workspaceDigest: boolean;
  weekStartsMonday: boolean;
  /** When off, opening a page does not record it in "Recientes". */
  recordVisits: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  pushNotifications: true,
  upcomingMeetings: false,
  workspaceActivity: true,
  alwaysEmail: true,
  pageUpdates: true,
  workspaceDigest: true,
  weekStartsMonday: false,
  recordVisits: true,
};

const KEY = 'preferences';

/** App settings, kept in memory for synchronous reads and saved on every change. */
export class PreferencesStore {
  private value: Preferences;
  private readonly listeners = new Set<() => void>();

  private constructor(
    private readonly persistence: Persistence,
    initial: Preferences,
  ) {
    this.value = initial;
  }

  static async open(persistence: Persistence): Promise<PreferencesStore> {
    let stored: Partial<Preferences> = {};
    try {
      const raw = await persistence.loadMeta(KEY);
      if (raw) stored = JSON.parse(raw) as Partial<Preferences>;
    } catch {
      // Corrupt or unreadable settings fall back to the defaults.
    }
    return new PreferencesStore(persistence, { ...DEFAULT_PREFERENCES, ...stored });
  }

  get = (): Preferences => this.value;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  set = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    this.value = { ...this.value, [key]: value };
    for (const listener of this.listeners) listener();
    this.persistence.saveMeta(KEY, JSON.stringify(this.value)).catch((error: unknown) => {
      console.warn('No se pudo guardar la configuración', error);
    });
  };
}
