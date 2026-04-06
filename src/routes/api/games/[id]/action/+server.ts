import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getGame, saveGame } from '$lib/db.js';
import { executeAction } from '$lib/engine/game.js';
import { validateAction } from '$lib/engine/validation.js';
import { broadcastGameState } from '$lib/sse.js';
import { getPlayerFromCookie } from '$lib/auth.js';
import type { Action } from '$lib/engine/types.js';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const state = getGame(params.id);
  if (!state) {
    return json({ error: 'Game not found' }, { status: 404 });
  }

  const auth = getPlayerFromCookie(cookies, state);
  if (!auth) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  let action: Action;
  try {
    action = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!action?.type) {
    return json({ error: 'Action type is required' }, { status: 400 });
  }

  const validationError = validateAction(state, auth.playerIndex, action);
  if (validationError !== null) {
    return json({ error: validationError }, { status: 400 });
  }

  const newState = executeAction(state, auth.playerIndex, action);
  saveGame(newState);

  const lastAction = { playerName: auth.player.name, action };
  await broadcastGameState(params.id, newState, lastAction);

  return json({ ok: true });
};
