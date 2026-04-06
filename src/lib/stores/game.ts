import { writable, derived } from 'svelte/store';
import type { ClientGameState } from '$lib/engine/types.js';

// Core game state store
export const gameState = writable<ClientGameState | null>(null);

// Track connection status
export const connectionStatus = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');

// Derived convenience stores
export const currentPlayer = derived(gameState, ($gs) => {
  if (!$gs) return null;
  return $gs.players[$gs.currentPlayerIndex] ?? null;
});

export const isMyTurn = derived(gameState, ($gs) => {
  if (!$gs) return false;
  return $gs.currentPlayerIndex === $gs.yourPlayerIndex;
});

export const myHand = derived(gameState, ($gs) => {
  if (!$gs) return [];
  return $gs.yourHand;
});

export const myPlayer = derived(gameState, ($gs) => {
  if (!$gs) return null;
  return $gs.players[$gs.yourPlayerIndex] ?? null;
});

export const isHost = derived(gameState, ($gs) => {
  if (!$gs) return false;
  return $gs.yourPlayerIndex === 0;
});

// SSE connection management
let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function connectSSE(gameId: string) {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  connectionStatus.set('connecting');

  const es = new EventSource(`/api/games/${gameId}/events`);
  eventSource = es;

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ClientGameState;
      gameState.set(data);
      connectionStatus.set('connected');
      reconnectDelay = 1000; // Reset backoff on success
    } catch (err) {
      console.error('[SSE] Failed to parse message:', err);
    }
  };

  es.onerror = () => {
    es.close();
    eventSource = null;
    connectionStatus.set('disconnected');

    // Auto-reconnect with exponential backoff
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      connectSSE(gameId);
    }, reconnectDelay);
  };
}

export async function connectToGame(gameId: string): Promise<ClientGameState | null> {
  // Fetch initial state via REST
  let initialState: ClientGameState | null = null;

  try {
    const res = await fetch(`/api/games/${gameId}`);
    if (res.ok) {
      const data = await res.json();
      // Only set if it's a full ClientGameState (has yourPlayerIndex)
      if (typeof data.yourPlayerIndex === 'number') {
        gameState.set(data as ClientGameState);
        initialState = data as ClientGameState;
      }
    }
  } catch (err) {
    console.error('[game] Failed to fetch initial state:', err);
  }

  // Open SSE connection for live updates
  connectSSE(gameId);

  return initialState;
}

export function disconnectFromGame() {
  clearReconnectTimer();
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  gameState.set(null);
  connectionStatus.set('disconnected');
  reconnectDelay = 1000;
}
