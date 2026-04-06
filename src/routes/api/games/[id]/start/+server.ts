import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getGame, saveGame } from '$lib/db.js';
import { startGame } from '$lib/engine/game.js';
import { broadcastGameState } from '$lib/sse.js';
import { getPlayerFromCookie } from '$lib/auth.js';

export const POST: RequestHandler = async ({ params, cookies }) => {
  const state = getGame(params.id);
  if (!state) {
    return json({ error: 'Game not found' }, { status: 404 });
  }

  const auth = getPlayerFromCookie(cookies, state);
  if (!auth) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.playerIndex !== 0) {
    return json({ error: 'Only the host (first player) can start the game' }, { status: 403 });
  }

  if (state.phase !== 'waiting') {
    return json({ error: 'Game has already started' }, { status: 409 });
  }

  if (state.players.length < 2) {
    return json({ error: 'Need at least 2 players to start' }, { status: 409 });
  }

  const newState = startGame(state);
  saveGame(newState);

  await broadcastGameState(params.id, newState);

  return json({ ok: true });
};
