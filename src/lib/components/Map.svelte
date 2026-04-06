<script lang="ts">
  import { POSITIONS, ADJACENCY, TERRITORY_IDS, TERRITORY_NAMES, TERRITORY_HOMELANDS } from '$lib/engine/map.js';
  import type { TerritoryId, FactionCounts } from '$lib/engine/types.js';
  import Territory from './Territory.svelte';

  interface Props {
    territories: Record<TerritoryId, FactionCounts>;
    selectedTerritory?: TerritoryId | null;
    onSelectTerritory?: (id: TerritoryId | null) => void;
  }

  let {
    territories,
    selectedTerritory = null,
    onSelectTerritory,
  }: Props = $props();

  let hoveredTerritory = $state<TerritoryId | null>(null);

  // Compute which territories to highlight (adjacent to hovered)
  const highlightedTerritories = $derived.by<Set<TerritoryId>>(() => {
    const set = new Set<TerritoryId>();
    if (hoveredTerritory) {
      const adj = ADJACENCY[hoveredTerritory] ?? [];
      for (const id of adj) set.add(id);
    }
    return set;
  });

  // Build adjacency edge list (deduplicated)
  const edges = $derived.by<Array<{ from: TerritoryId; to: TerritoryId }>>(() => {
    const seen = new Set<string>();
    const result: Array<{ from: TerritoryId; to: TerritoryId }> = [];
    for (const from of TERRITORY_IDS) {
      for (const to of ADJACENCY[from]) {
        const key = [from, to].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ from, to });
        }
      }
    }
    return result;
  });

  function midpoint(id1: TerritoryId, id2: TerritoryId) {
    const p1 = POSITIONS[id1];
    const p2 = POSITIONS[id2];
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  function curvePath(from: TerritoryId, to: TerritoryId): string {
    const p1 = POSITIONS[from];
    const p2 = POSITIONS[to];
    const mid = midpoint(from, to);

    // Add a slight curve by offsetting the control point perpendicular to the line
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    // Perpendicular offset scaled to distance — gentle curve
    const offset = len * 0.08;
    const perpX = (-dy / len) * offset;
    const perpY = (dx / len) * offset;

    const cx = mid.x + perpX;
    const cy = mid.y + perpY;

    return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
  }

  function isEdgeHighlighted(from: TerritoryId, to: TerritoryId): boolean {
    if (!hoveredTerritory) return false;
    return (from === hoveredTerritory && ADJACENCY[from].includes(to)) ||
           (to === hoveredTerritory && ADJACENCY[to].includes(from));
  }

  function handleTerritoryClick(id: TerritoryId) {
    if (selectedTerritory === id) {
      onSelectTerritory?.(null);
    } else {
      onSelectTerritory?.(id);
    }
  }

  function handleHover(id: TerritoryId | null) {
    hoveredTerritory = id;
  }
</script>

<svg
  viewBox="0 0 1000 820"
  xmlns="http://www.w3.org/2000/svg"
  class="map-svg"
  role="img"
  aria-label="Game map"
>
  <!-- Background texture gradient -->
  <defs>
    <radialGradient id="map-bg-gradient" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="rgba(30, 20, 50, 0.3)" />
      <stop offset="100%" stop-color="rgba(10, 8, 20, 0.6)" />
    </radialGradient>
    <filter id="glow-green">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="glow-blue">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="glow-purple">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  <!-- Map background -->
  <rect width="1000" height="820" fill="url(#map-bg-gradient)" rx="12" />

  <!-- Blank center indicator (very subtle) -->
  <circle
    cx="500"
    cy="420"
    r="50"
    fill="none"
    stroke="rgba(224, 216, 200, 0.04)"
    stroke-width="1"
    stroke-dasharray="6 6"
  />

  <!-- Roads (always visible) -->
  <g class="roads">
    {#each edges as edge}
      <path
        d={curvePath(edge.from, edge.to)}
        fill="none"
        stroke="rgba(139, 105, 65, 0.25)"
        stroke-width="4"
        stroke-linecap="round"
        class="road"
        class:road-highlighted={isEdgeHighlighted(edge.from, edge.to)}
      />
    {/each}
  </g>

  <!-- Territories -->
  <g class="territories">
    {#each TERRITORY_IDS as id}
      <Territory
        territoryId={id}
        name={TERRITORY_NAMES[id]}
        x={POSITIONS[id].x}
        y={POSITIONS[id].y}
        stones={territories[id] ?? { green: 0, blue: 0, purple: 0 }}
        isHomeland={TERRITORY_HOMELANDS[id] !== null}
        homelandFaction={TERRITORY_HOMELANDS[id]}
        isSelected={selectedTerritory === id}
        isHighlighted={highlightedTerritories.has(id)}
        onclick={handleTerritoryClick}
        onhover={handleHover}
      />
    {/each}
  </g>
</svg>

<style>
  .map-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .road {
    transition: stroke 200ms ease, stroke-width 200ms ease;
  }

  .road-highlighted {
    stroke: rgba(139, 105, 65, 0.5);
    stroke-width: 5;
  }
</style>
