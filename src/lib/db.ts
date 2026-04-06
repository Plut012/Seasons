import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import type { GameState } from './engine/types.js';

// ─── Schema ───────────────────────────────────────────────────────────────────

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  state: text('state').notNull(), // JSON blob of GameState
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id').notNull().references(() => games.id),
    playerName: text('player_name').notNull(),
    text: text('text').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_chat_game').on(table.gameId, table.createdAt)]
);

// ─── Database setup ───────────────────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH ?? 'games.db';

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

function getDb() {
  if (!_db) {
    _sqlite = new Database(DB_PATH);
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('foreign_keys = ON');
    _db = drizzle(_sqlite);

    // Create tables if they don't exist
    _sqlite.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id),
        player_name TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chat_game ON chat_messages(game_id, created_at);
    `);
  }
  return { db: _db, sqlite: _sqlite! };
}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getGame(id: string): GameState | null {
  const { sqlite } = getDb();
  const row = sqlite.prepare('SELECT state FROM games WHERE id = ?').get(id) as
    | { state: string }
    | undefined;
  if (!row) return null;
  return JSON.parse(row.state) as GameState;
}

export function saveGame(state: GameState): void {
  const { sqlite } = getDb();
  const now = Date.now();
  sqlite
    .prepare(
      'UPDATE games SET state = ?, updated_at = ? WHERE id = ?'
    )
    .run(JSON.stringify(state), now, state.id);
}

export function createGame(state: GameState): void {
  const { sqlite } = getDb();
  const now = Date.now();
  sqlite
    .prepare(
      'INSERT INTO games (id, state, created_at, updated_at) VALUES (?, ?, ?, ?)'
    )
    .run(state.id, JSON.stringify(state), now, now);
}

export type { GameState };
