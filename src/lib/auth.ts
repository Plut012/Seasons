import type { Cookies } from '@sveltejs/kit';
import type { GameState, Player } from './engine/types.js';

export function cookieName(gameId: string): string {
  return `turncoats_token_${gameId}`;
}

export function getPlayerFromCookie(
  cookies: Cookies,
  gameState: GameState
): { player: Player; playerIndex: number } | null {
  const token = cookies.get(cookieName(gameState.id));
  if (!token) return null;

  const playerIndex = gameState.players.findIndex((p) => p.token === token);
  if (playerIndex === -1) return null;

  return { player: gameState.players[playerIndex], playerIndex };
}
