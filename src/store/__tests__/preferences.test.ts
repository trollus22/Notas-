import { MemoryPersistence } from '../memory-persistence';
import { DEFAULT_PREFERENCES, PreferencesStore } from '../preferences';

describe('PreferencesStore', () => {
  it('starts from the defaults and saves changes', async () => {
    const storage = new MemoryPersistence();
    const store = await PreferencesStore.open(storage);
    expect(store.get()).toEqual(DEFAULT_PREFERENCES);

    const listener = jest.fn();
    store.subscribe(listener);
    store.set('theme', 'dark');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get().theme).toBe('dark');
    await Promise.resolve();

    const reopened = await PreferencesStore.open(storage);
    expect(reopened.get().theme).toBe('dark');
  });

  it('ignores unreadable stored settings', async () => {
    const storage = new MemoryPersistence();
    await storage.saveMeta('preferences', '{oops');
    expect((await PreferencesStore.open(storage)).get()).toEqual(DEFAULT_PREFERENCES);
  });
});
