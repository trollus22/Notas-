import * as SQLite from 'expo-sqlite';

import type { Block } from '@/lib/types';

import type { Persistence } from './workspace';

/** SQLite storage on iOS and Android: one row per block, stored as JSON. */
export function createPersistence(): Persistence {
  let database: Promise<SQLite.SQLiteDatabase> | null = null;

  const open = () => {
    database ??= (async () => {
      const db = await SQLite.openDatabaseAsync('notas.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS blocks (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      `);
      return db;
    })();
    return database;
  };

  return {
    async load() {
      const db = await open();
      const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM blocks');
      return rows.map((row) => JSON.parse(row.data) as Block);
    },
    async save(put, remove) {
      const db = await open();
      await db.withTransactionAsync(async () => {
        for (const block of put) {
          await db.runAsync('INSERT OR REPLACE INTO blocks (id, data) VALUES (?, ?)', block.id, JSON.stringify(block));
        }
        for (const id of remove) {
          await db.runAsync('DELETE FROM blocks WHERE id = ?', id);
        }
      });
    },
    async loadMeta(key) {
      const db = await open();
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
      return row?.value ?? null;
    },
    async saveMeta(key, value) {
      const db = await open();
      await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
    },
  };
}
