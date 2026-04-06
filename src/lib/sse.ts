import { filterForClient } from './engine/game.js';
import type { Action, GameState } from './engine/types.js';

type Writer = WritableStreamDefaultWriter<Uint8Array>;

// Map<gameId, Map<playerIndex, writer>>
const clients = new Map<string, Map<number, Writer>>();

// Map<gameId, Map<playerIndex, intervalId>>
const keepaliveTimers = new Map<string, Map<number, ReturnType<typeof setInterval>>>();

export function addClient(gameId: string, playerIndex: number, writer: Writer): void {
  if (!clients.has(gameId)) {
    clients.set(gameId, new Map());
  }
  if (!keepaliveTimers.has(gameId)) {
    keepaliveTimers.set(gameId, new Map());
  }

  clients.get(gameId)!.set(playerIndex, writer);

  // Send keepalive ping every 30 seconds
  const timer = setInterval(async () => {
    const w = clients.get(gameId)?.get(playerIndex);
    if (!w) {
      clearInterval(timer);
      return;
    }
    try {
      await w.write(new TextEncoder().encode(': ping\n\n'));
    } catch {
      clearInterval(timer);
      removeClient(gameId, playerIndex);
    }
  }, 30_000);

  keepaliveTimers.get(gameId)!.set(playerIndex, timer);
}

export function removeClient(gameId: string, playerIndex: number): void {
  clients.get(gameId)?.delete(playerIndex);
  if (clients.get(gameId)?.size === 0) {
    clients.delete(gameId);
  }

  const timer = keepaliveTimers.get(gameId)?.get(playerIndex);
  if (timer !== undefined) {
    clearInterval(timer);
  }
  keepaliveTimers.get(gameId)?.delete(playerIndex);
  if (keepaliveTimers.get(gameId)?.size === 0) {
    keepaliveTimers.delete(gameId);
  }
}

export async function broadcastGameState(
  gameId: string,
  state: GameState,
  lastAction?: { playerName: string; action: Action }
): Promise<void> {
  const gameClients = clients.get(gameId);
  if (!gameClients) return;

  const encoder = new TextEncoder();

  for (const [playerIndex, writer] of gameClients) {
    const clientState = filterForClient(state, playerIndex, lastAction);
    const message = `data: ${JSON.stringify(clientState)}\n\n`;
    try {
      await writer.write(encoder.encode(message));
    } catch {
      removeClient(gameId, playerIndex);
    }
  }
}

export async function broadcastChatUpdate(gameId: string, state: GameState): Promise<void> {
  await broadcastGameState(gameId, state);
}
