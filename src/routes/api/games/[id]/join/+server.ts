import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getGame, saveGame } from '$lib/db.js';
import { addPlayer } from '$lib/engine/game.js';
import { assignName } from '$lib/names.js';
import { broadcastGameState } from '$lib/sse.js';
import { cookieName } from '$lib/auth.js';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const state = getGame(params.id);
  if (!state) {
    return json({ error: 'Game not found' }, { status: 404 });
  }

  if (state.phase !== 'waiting') {
    return json({ error: 'Game has already started' }, { status: 409 });
  }

  if (state.players.length >= 5) {
    return json({ error: 'Game is full (max 5 players)' }, { status: 409 });
  }

  const password = body?.password;
  if (typeof password !== 'string' || password !== state.password) {
    return json({ error: 'Invalid password' }, { status: 403 });
  }

  const name = assignName(state.players.map((p) => p.name));
  const token = crypto.randomUUID();
  const newState = addPlayer(state, name, token);
  const playerIndex = newState.players.length - 1;

  saveGame(newState);

  // Set httpOnly cookie scoped to this game
  cookies.set(cookieName(params.id), token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  await broadcastGameState(params.id, newState);

  return json({ name, playerIndex }, { status: 201 });
};
