# Data Model

## TypeScript Types

```typescript
// Core types
type Faction = 'green' | 'blue' | 'purple'
type TerritoryId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7' | 't8' | 't9' | 't10' | 't11'

// Full server-side game state
type GameState = {
  id: string
  phase: 'waiting' | 'playing' | 'finished'
  password: string                              // hashed
  map: MapConfig
  territories: Record<TerritoryId, FactionCounts>
  axe: FactionCounts
  flag: FactionCounts
  bag: Faction[]                                // server-only, shuffled
  players: Player[]
  currentPlayerIndex: number
  consecutiveNegotiates: number
  turnNumber: number
  winner: {
    faction: Faction | null
    playerIndex: number | null
  } | null
}

type FactionCounts = Record<Faction, number>

type Player = {
  index: number
  name: string          // random nature name
  token: string         // auth token (server-only)
  hand: Faction[]       // server-only
  connected: boolean    // SSE connection active
}

type ChatMessage = {
  id: string
  gameId: string
  playerName: string
  text: string
  timestamp: number
}

// Player actions
type Action =
  | { type: 'recruit'; stone: Faction; territory: TerritoryId }
  | { type: 'battle'; stone: Faction; territory: TerritoryId; targetFaction: Faction }
  | { type: 'march'; stone: Faction; fromTerritory: TerritoryId; toTerritory: TerritoryId; count: number }
  | { type: 'negotiate'; revealedStone: Faction }

// Client-filtered view (sent via SSE)
type ClientGameState = {
  id: string
  phase: GameState['phase']
  territories: GameState['territories']
  axe: FactionCounts
  flag: FactionCounts
  bagCount: number                              // count only, not contents
  players: ClientPlayer[]
  currentPlayerIndex: number
  consecutiveNegotiates: number
  turnNumber: number
  yourPlayerIndex: number
  yourHand: Faction[]                           // full hand for requesting player
  winner: GameState['winner']
  lastAction?: { playerName: string; action: Action }
}

type ClientPlayer = {
  index: number
  name: string
  handCount: number                             // count only
  connected: boolean
}
```

## SQLite Schema

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,          -- JSON blob of GameState
  created_at INTEGER NOT NULL,  -- unix timestamp
  updated_at INTEGER NOT NULL   -- unix timestamp
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  player_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_chat_game ON chat_messages(game_id, created_at);
```

## State Transitions

### Recruit
- **Preconditions**: player has stone of chosen color in hand, territory exists
- **Effects**: remove stone from hand, increment territory faction count

### Battle
- **Preconditions**: player has stone of chosen color in hand, territory exists, target faction != stone color
- **Effects**: place stone on axe (increment axe count), for each matching stone in territory (up to 3): decrement target faction in territory, add to bag

### March
- **Preconditions**: player has stone of chosen color in hand, fromTerritory has >= count matching stones, toTerritory is adjacent to fromTerritory
- **Effects**: place stone on flag (increment flag count), move count stones of that faction from source to destination

### Negotiate
- **Preconditions**: bag is not empty (for draw), player has at least 1 stone (for return)
- **Effects**: draw random stone from bag → hand, remove revealed stone from hand → bag, increment consecutiveNegotiates. If consecutiveNegotiates == player count → end game

### Any non-Negotiate action
- **Effects**: reset consecutiveNegotiates to 0
