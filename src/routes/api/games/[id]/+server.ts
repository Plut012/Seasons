import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getGame } from '$lib/db.js';
import { filterForClient } from '$lib/engine/game.js';
import { getPlayerFromCookie } from '$lib/auth.js';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const state = getGame(params.id);
  if (!state) {
    return json({ error: 'Game not found' }, { status: 404 });
  }

  const auth = getPlayerFromCookie(cookies, state);
  if (auth) {
    return json(filterForClient(state, auth.playerIndex));
  }

  // No valid token: return basic lobby info
  return json({
    id: state.id,
    phase: state.phase,
    playerCount: state.players.length,
  });
};
