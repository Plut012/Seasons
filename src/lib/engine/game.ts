import type {
  Action,
  ClientGameState,
  Faction,
  FactionCounts,
  GameState,
  TerritoryId,
} from './types.js';
import {
  ADJACENCY,
  MAP_CONFIG,
  NON_HOMELAND_TERRITORIES,
  TERRITORY_HOMELANDS,
  TERRITORY_IDS,
} from './map.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyFactionCounts(): FactionCounts {
  return { green: 0, blue: 0, purple: 0 };
}

function buildInitialBag(): Faction[] {
  const bag: Faction[] = [];
  const factions: Faction[] = ['green', 'blue', 'purple'];
  for (const f of factions) {
    for (let i = 0; i < 21; i++) bag.push(f);
  }
  return bag;
}

/** Fisher-Yates shuffle (mutates in place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Draw one stone from the bag (mutates bag). Returns stone or null if empty. */
function drawFromBag(bag: Faction[]): Faction | null {
  if (bag.length === 0) return null;
  const idx = Math.floor(Math.random() * bag.length);
  const [stone] = bag.splice(idx, 1);
  return stone;
}

/** Remove one occurrence of a faction from an array (mutates). Returns true if found. */
function removeOne(arr: Faction[], faction: Faction): boolean {
  const idx = arr.indexOf(faction);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  return true;
}

// Deep-clone game state for immutability
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

// ─── Create / Setup ───────────────────────────────────────────────────────────

export function createGame(id: string, password: string): GameState {
  const territories = Object.fromEntries(
    TERRITORY_IDS.map((tid) => [tid, emptyFactionCounts()])
  ) as Record<TerritoryId, FactionCounts>;

  return {
    id,
    phase: 'waiting',
    password,
    map: MAP_CONFIG,
    territories,
    axe: emptyFactionCounts(),
    flag: emptyFactionCounts(),
    bag: [],
    players: [],
    currentPlayerIndex: 0,
    consecutiveNegotiates: 0,
    turnNumber: 0,
    winner: null,
  };
}

export function addPlayer(
  state: GameState,
  name: string,
  token: string
): GameState {
  const s = cloneState(state);
  const index = s.players.length;
  s.players.push({
    index,
    name,
    token,
    hand: [],
    connected: false,
  });
  return s;
}

export function startGame(state: GameState): GameState {
  const s = cloneState(state);

  // Build and shuffle the bag
  const bag = shuffle(buildInitialBag());

  // Step 1: place 2 matching stones in each homeland
  for (const tid of TERRITORY_IDS) {
    const homeland = TERRITORY_HOMELANDS[tid];
    if (homeland !== null) {
      s.territories[tid][homeland] = 2;
      // Remove those 2 stones from the bag
      removeOne(bag, homeland);
      removeOne(bag, homeland);
    }
  }

  // Step 2: for each non-homeland territory, draw 2 random stones from the bag
  for (const tid of NON_HOMELAND_TERRITORIES) {
    for (let i = 0; i < 2; i++) {
      const stone = drawFromBag(bag);
      if (stone !== null) {
        s.territories[tid][stone]++;
      }
    }
  }

  // Step 3: each player draws 8 stones
  for (const player of s.players) {
    player.hand = [];
    for (let i = 0; i < 8; i++) {
      const stone = drawFromBag(bag);
      if (stone !== null) {
        player.hand.push(stone);
      }
    }
  }

  s.bag = bag;
  s.phase = 'playing';
  s.currentPlayerIndex = 0;
  s.consecutiveNegotiates = 0;
  s.turnNumber = 1;

  return s;
}

// ─── Action Execution ─────────────────────────────────────────────────────────

export function executeAction(
  state: GameState,
  playerIndex: number,
  action: Action
): GameState {
  const s = cloneState(state);
  const player = s.players[playerIndex];

  switch (action.type) {
    case 'recruit': {
      removeOne(player.hand, action.stone);
      s.territories[action.territory][action.stone]++;
      s.consecutiveNegotiates = 0;
      break;
    }

    case 'battle': {
      // Place stone on axe permanently
      removeOne(player.hand, action.stone);
      s.axe[action.stone]++;

      // Count matching stones in the territory
      const matchingCount = s.territories[action.territory][action.stone];

      // Remove up to min(matchingCount, 3, targetAvailable) stones of target faction
      const targetAvailable = s.territories[action.territory][action.targetFaction];
      const removals = Math.min(matchingCount, 3, targetAvailable);
      s.territories[action.territory][action.targetFaction] -= removals;
      for (let i = 0; i < removals; i++) {
        s.bag.push(action.targetFaction);
      }

      s.consecutiveNegotiates = 0;
      break;
    }

    case 'march': {
      // Place stone on flag permanently
      removeOne(player.hand, action.stone);
      s.flag[action.stone]++;

      // Move stones from source to destination
      const available = s.territories[action.fromTerritory][action.stone];
      const count = Math.min(action.count, available);
      if (count > 0) {
        s.territories[action.fromTerritory][action.stone] -= count;
        s.territories[action.toTerritory][action.stone] += count;
      }

      s.consecutiveNegotiates = 0;
      break;
    }

    case 'negotiate': {
      // Draw 1 stone from the bag (if not empty)
      const drawn = drawFromBag(s.bag);
      if (drawn !== null) {
        player.hand.push(drawn);
      }

      // Reveal and return a stone to the bag (if player has stones and revealedStone is specified)
      if (action.revealedStone !== null && player.hand.length > 0) {
        removeOne(player.hand, action.revealedStone);
        s.bag.push(action.revealedStone);
      }

      s.consecutiveNegotiates++;

      // Check for game end: all players consecutively negotiated
      if (s.consecutiveNegotiates >= s.players.length) {
        s.phase = 'finished';
        s.winner = computeWinner(s);
      }
      break;
    }
  }

  // Advance to next player
  s.currentPlayerIndex = (playerIndex + 1) % s.players.length;
  s.turnNumber++;

  return s;
}

// ─── Winner Computation ───────────────────────────────────────────────────────

function rulesTerritory(
  counts: FactionCounts,
  axe: FactionCounts,
  flag: FactionCounts
): Faction | null {
  const factions: Faction[] = ['green', 'blue', 'purple'];

  // Find max stones in territory
  const maxStones = Math.max(counts.green, counts.blue, counts.purple);
  let leaders = factions.filter((f) => counts[f] === maxStones);

  if (leaders.length === 1) return leaders[0];

  // Tiebreaker 1: most stones on axe
  const maxAxe = Math.max(...leaders.map((f) => axe[f]));
  leaders = leaders.filter((f) => axe[f] === maxAxe);
  if (leaders.length === 1) return leaders[0];

  // Tiebreaker 2: most stones on flag
  const maxFlag = Math.max(...leaders.map((f) => flag[f]));
  leaders = leaders.filter((f) => flag[f] === maxFlag);
  if (leaders.length === 1) return leaders[0];

  // Still tied: contested
  return null;
}

function computeWinningFaction(
  state: GameState
): Faction | null {
  const factions: Faction[] = ['green', 'blue', 'purple'];

  // Count territories ruled per faction
  const territoryCounts: FactionCounts = emptyFactionCounts();
  for (const tid of TERRITORY_IDS) {
    const ruler = rulesTerritory(
      state.territories[tid],
      state.axe,
      state.flag
    );
    if (ruler !== null) territoryCounts[ruler]++;
  }

  const maxTerritories = Math.max(
    territoryCounts.green,
    territoryCounts.blue,
    territoryCounts.purple
  );
  let candidates = factions.filter(
    (f) => territoryCounts[f] === maxTerritories
  );

  if (candidates.length === 1) return candidates[0];

  // Tiebreaker 1: most stones on axe
  const maxAxe = Math.max(...candidates.map((f) => state.axe[f]));
  candidates = candidates.filter((f) => state.axe[f] === maxAxe);
  if (candidates.length === 1) return candidates[0];

  // Tiebreaker 2: most stones on flag
  const maxFlag = Math.max(...candidates.map((f) => state.flag[f]));
  candidates = candidates.filter((f) => state.flag[f] === maxFlag);
  if (candidates.length === 1) return candidates[0];

  // No faction wins
  return null;
}

function countInHand(hand: Faction[], faction: Faction): number {
  return hand.filter((s) => s === faction).length;
}

function worstFaction(
  hand: Faction[],
  winningFaction: Faction
): { worst: Faction | null; count: number } {
  const others: Faction[] = (['green', 'blue', 'purple'] as Faction[]).filter(
    (f) => f !== winningFaction
  );
  // Worst = losing faction = the other faction with fewer stones across all hands?
  // Rules say: "fewest stones of the losing faction (worst-performing faction)"
  // The losing faction is the one that ruled FEWEST territories. We need to compute that.
  // For tiebreaker purposes within player scoring, we compare how many losing-faction stones a player holds.
  // The "losing faction" here refers to the faction that performed worst overall.
  // Since this function is called per-player for sorting purposes, return counts for each other faction.
  // We'll use this to determine the losing faction at the caller level.
  return { worst: null, count: 0 };
}

export function getWinner(state: GameState): {
  faction: Faction | null;
  playerIndex: number | null;
} {
  const winningFaction = computeWinningFaction(state);

  if (winningFaction === null) {
    return { faction: null, playerIndex: null };
  }

  // Find the losing faction (worst-performing = fewest territories ruled)
  const factions: Faction[] = ['green', 'blue', 'purple'];
  const territoryCounts: FactionCounts = emptyFactionCounts();
  for (const tid of TERRITORY_IDS) {
    const ruler = rulesTerritory(
      state.territories[tid],
      state.axe,
      state.flag
    );
    if (ruler !== null) territoryCounts[ruler]++;
  }

  const losers = factions.filter((f) => f !== winningFaction);
  const minTerritories = Math.min(...losers.map((f) => territoryCounts[f]));
  const losingFaction =
    losers.find((f) => territoryCounts[f] === minTerritories) ?? losers[0];

  // Find the winning player
  // Sort players by:
  // 1. Most stones of winning faction in hand (descending)
  // 2. Fewest stones of losing faction in hand (ascending)
  // 3. Turn order: the next player who would have taken a turn
  //    = first player after currentPlayerIndex in circular order

  const playerCount = state.players.length;
  const nextPlayerIndex = state.currentPlayerIndex % playerCount;

  // Build turn order priority: starting from nextPlayerIndex (circular)
  const turnOrderPriority: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    turnOrderPriority.push((nextPlayerIndex + i) % playerCount);
  }

  let bestPlayerIndex: number | null = null;
  let bestWinningCount = -1;
  let bestLosingCount = Infinity;
  let bestTurnPriority = Infinity;

  for (let i = 0; i < playerCount; i++) {
    const player = state.players[i];
    const winningCount = countInHand(player.hand, winningFaction);
    const losingCount = countInHand(player.hand, losingFaction);
    const turnPriority = turnOrderPriority.indexOf(i);

    const better =
      winningCount > bestWinningCount ||
      (winningCount === bestWinningCount && losingCount < bestLosingCount) ||
      (winningCount === bestWinningCount &&
        losingCount === bestLosingCount &&
        turnPriority < bestTurnPriority);

    if (better) {
      bestPlayerIndex = i;
      bestWinningCount = winningCount;
      bestLosingCount = losingCount;
      bestTurnPriority = turnPriority;
    }
  }

  return { faction: winningFaction, playerIndex: bestPlayerIndex };
}

function computeWinner(
  state: GameState
): GameState['winner'] {
  return getWinner(state);
}

// ─── Client Filtering ─────────────────────────────────────────────────────────

export function filterForClient(
  state: GameState,
  playerIndex: number,
  lastAction?: { playerName: string; action: Action }
): ClientGameState {
  return {
    id: state.id,
    phase: state.phase,
    territories: state.territories,
    axe: state.axe,
    flag: state.flag,
    bagCount: state.bag.length,
    players: state.players.map((p) => ({
      index: p.index,
      name: p.name,
      handCount: p.hand.length,
      connected: p.connected,
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    consecutiveNegotiates: state.consecutiveNegotiates,
    turnNumber: state.turnNumber,
    yourPlayerIndex: playerIndex,
    yourHand: state.players[playerIndex]?.hand ?? [],
    winner: state.winner,
    ...(lastAction ? { lastAction } : {}),
  };
}
