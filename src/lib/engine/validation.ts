import type { Action, Faction, GameState, TerritoryId } from './types.js';
import { ADJACENCY, TERRITORY_IDS } from './map.js';

function countInHand(hand: Faction[], faction: Faction): number {
  return hand.filter((s) => s === faction).length;
}

function isValidTerritory(id: string): id is TerritoryId {
  return (TERRITORY_IDS as string[]).includes(id);
}

/**
 * Validate an action for the given player.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateAction(
  state: GameState,
  playerIndex: number,
  action: Action
): string | null {
  if (state.phase !== 'playing') {
    return 'Game is not in progress';
  }

  if (state.currentPlayerIndex !== playerIndex) {
    return 'It is not your turn';
  }

  if (playerIndex < 0 || playerIndex >= state.players.length) {
    return 'Invalid player index';
  }

  const player = state.players[playerIndex];

  switch (action.type) {
    case 'recruit': {
      if (!isValidTerritory(action.territory)) {
        return `Invalid territory: ${action.territory}`;
      }
      if (player.hand.length === 0) {
        return 'Your hand is empty';
      }
      if (countInHand(player.hand, action.stone) === 0) {
        return `You do not have a ${action.stone} stone in your hand`;
      }
      return null;
    }

    case 'battle': {
      if (!isValidTerritory(action.territory)) {
        return `Invalid territory: ${action.territory}`;
      }
      if (player.hand.length === 0) {
        return 'Your hand is empty';
      }
      if (countInHand(player.hand, action.stone) === 0) {
        return `You do not have a ${action.stone} stone in your hand`;
      }
      if (action.targetFaction === action.stone) {
        return 'Target faction must be different from the placed stone color';
      }
      return null;
    }

    case 'march': {
      if (!isValidTerritory(action.fromTerritory)) {
        return `Invalid source territory: ${action.fromTerritory}`;
      }
      if (!isValidTerritory(action.toTerritory)) {
        return `Invalid destination territory: ${action.toTerritory}`;
      }
      if (player.hand.length === 0) {
        return 'Your hand is empty';
      }
      if (countInHand(player.hand, action.stone) === 0) {
        return `You do not have a ${action.stone} stone in your hand`;
      }
      if (action.fromTerritory === action.toTerritory) {
        return 'Source and destination territories must be different';
      }
      if (!ADJACENCY[action.fromTerritory].includes(action.toTerritory)) {
        return `${action.toTerritory} is not adjacent to ${action.fromTerritory}`;
      }
      if (action.count < 1) {
        return 'Must move at least 1 stone';
      }
      // Note: if there are 0 matching stones in fromTerritory, the action is legal
      // (places stone on flag but no movement happens — per rules 8.4)
      return null;
    }

    case 'negotiate': {
      // Negotiate is always legal (even with empty hand or empty bag)
      // If hand is empty: draw only, no return (revealedStone must be null)
      // If bag is empty: no draw, but still return if hand non-empty
      if (player.hand.length === 0) {
        // Must not try to reveal a stone from an empty hand
        if (action.revealedStone !== null) {
          return 'Cannot reveal a stone when your hand is empty';
        }
      } else {
        // Player has stones — they must reveal one
        if (action.revealedStone === null) {
          return 'You must reveal a stone when your hand is not empty';
        }
        if (countInHand(player.hand, action.revealedStone) === 0) {
          return `You do not have a ${action.revealedStone} stone in your hand to reveal`;
        }
      }
      return null;
    }
  }
}
