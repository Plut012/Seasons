import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createGame as engineCreateGame } from '$lib/engine/game.js';
import { createGame as dbCreateGame } from '$lib/db.js';

export const POST: RequestHandler = async ({ request }) => {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const password = body?.password;
  if (typeof password !== 'string' || password.trim() === '') {
    return json({ error: 'password is required' }, { status: 400 });
  }

  // Generate short game ID (~8 chars)
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);

  const state = engineCreateGame(id, password);
  dbCreateGame(state);

  return json({ id, url: `/game/${id}` }, { status: 201 });
};
