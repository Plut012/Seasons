import type { RequestHandler } from '@sveltejs/kit';
import { getGame } from '$lib/db.js';
import { filterForClient } from '$lib/engine/game.js';
import { addClient, removeClient } from '$lib/sse.js';
import { getPlayerFromCookie } from '$lib/auth.js';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const state = getGame(params.id);
  if (!state) {
    return new Response(JSON.stringify({ error: 'Game not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const auth = getPlayerFromCookie(cookies, state);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { playerIndex } = auth;
  const gameId = params.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Build a writable-stream-like writer backed by the ReadableStream controller
      const writer: WritableStreamDefaultWriter<Uint8Array> = {
        write(chunk: Uint8Array) {
          try {
            controller.enqueue(chunk);
          } catch {
            // Stream already closed
          }
          return Promise.resolve();
        },
        close() {
          try {
            controller.close();
          } catch {
            // Already closed
          }
          return Promise.resolve();
        },
        abort(reason?: unknown) {
          try {
            controller.error(reason);
          } catch {
            // Already closed
          }
          return Promise.resolve();
        },
        get closed(): Promise<undefined> {
          return new Promise(() => {
            // Never resolves — lifecycle managed externally
          });
        },
        get desiredSize(): number | null {
          return controller.desiredSize;
        },
        get ready(): Promise<undefined> {
          return Promise.resolve(undefined);
        },
        releaseLock() {
          // no-op
        },
      };

      addClient(gameId, playerIndex, writer);

      // Send initial state immediately
      const currentState = getGame(gameId);
      if (currentState) {
        const clientState = filterForClient(currentState, playerIndex);
        const initial = `data: ${JSON.stringify(clientState)}\n\n`;
        controller.enqueue(encoder.encode(initial));
      }
    },
    cancel() {
      removeClient(gameId, playerIndex);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
