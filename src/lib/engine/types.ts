// Core types
export type Faction = 'green' | 'blue' | 'purple';
export type TerritoryId =
  | 't1'
  | 't2'
  | 't3'
  | 't4'
  | 't5'
  | 't6'
  | 't7'
  | 't8'
  | 't9'
  | 't10'
  | 't11'
  | 't12';

export type FactionCounts = Record<Faction, number>;

// Full server-side game state
export type GameState = {
  id: string;
  phase: 'waiting' | 'playing' | 'finished';
  password: string; // hashed
  map: MapConfig;
  territories: Record<TerritoryId, FactionCounts>;
  axe: FactionCounts;
  flag: FactionCounts;
  bag: Faction[]; // server-only, shuffled
  players: Player[];
  currentPlayerIndex: number;
  consecutiveNegotiates: number;
  turnNumber: number;
  winner: {
    faction: Faction | null;
    playerIndex: number | null;
  } | null;
};

export type Player = {
  index: number;
  name: string; // random nature name
  token: string; // auth token (server-only)
  hand: Faction[]; // server-only
  connected: boolean; // SSE connection active
};

export type ChatMessage = {
  id: string;
  gameId: string;
  playerName: string;
  text: string;
  timestamp: number;
};

// Player actions
export type Action =
  | { type: 'recruit'; stone: Faction; territory: TerritoryId }
  | {
      type: 'battle';
      stone: Faction;
      territory: TerritoryId;
      targetFaction: Faction;
    }
  | {
      type: 'march';
      stone: Faction;
      fromTerritory: TerritoryId;
      toTerritory: TerritoryId;
      count: number;
    }
  | { type: 'negotiate'; revealedStone: Faction | null };

// Client-filtered view (sent via SSE)
export type ClientGameState = {
  id: string;
  phase: GameState['phase'];
  territories: GameState['territories'];
  axe: FactionCounts;
  flag: FactionCounts;
  bagCount: number; // count only, not contents
  players: ClientPlayer[];
  currentPlayerIndex: number;
  consecutiveNegotiates: number;
  turnNumber: number;
  yourPlayerIndex: number;
  yourHand: Faction[]; // full hand for requesting player
  winner: GameState['winner'];
  lastAction?: { playerName: string; action: Action };
};

export type ClientPlayer = {
  index: number;
  name: string;
  handCount: number; // count only
  connected: boolean;
};

// Map configuration
export type MapConfig = {
  territories: Record<
    TerritoryId,
    {
      name: string;
      homeland: Faction | null;
      position: { x: number; y: number };
      adjacency: TerritoryId[];
    }
  >;
};
