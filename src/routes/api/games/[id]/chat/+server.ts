import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getGame } from '$lib/db.js';
import { getPlayerFromCookie } from '$lib/auth.js';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH ?? 'games.db';
let _sqlite: Database.Database | null = null;

function getSqlite(): Database.Database {
  if (!_sqlite) {
    _sqlite = new Database(DB_PATH);
  }
  return _sqlite;
}

export const GET: RequestHandler = async ({ params }) => {
  const state = getGame(params.id);
  if (!state) {
    return json({ error: 'Game not found' }, { status: 404 });
  }

  const sqlite = getSqlite();
  const rows = sqlite
    .prepare(
      'SELECT id, game_id as gameId, player_name as playerName, text, created_at as timestamp FROM chat_messages WHERE game_id = ? ORDER BY created_at ASC'
    )
    .all(params.id);

  return json(rows);
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const state = getGame(params.id);
  if (!state) {
    return json({ error: 'Game not found' }, { status: 404 });
  }

  const auth = getPlayerFromCookie(cookies, state);
  if (!auth) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = body?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    return json({ error: 'text is required' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  const sqlite = getSqlite();
  sqlite
    .prepare(
      'INSERT INTO chat_messages (id, game_id, player_name, text, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, params.id, auth.player.name, text.trim(), now);

  return json({ ok: true }, { status: 201 });
};
