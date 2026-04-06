<script lang="ts">
  import type { FactionCounts, Faction, TerritoryId } from '$lib/engine/types.js';

  interface Props {
    territoryId: TerritoryId;
    name: string;
    x: number;
    y: number;
    stones: FactionCounts;
    isHomeland?: boolean;
    homelandFaction?: Faction | null;
    isSelected?: boolean;
    isHighlighted?: boolean;
    onclick?: (id: TerritoryId) => void;
    onhover?: (id: TerritoryId | null) => void;
  }

  let {
    territoryId,
    name,
    x,
    y,
    stones,
    isHomeland = false,
    homelandFaction = null,
    isSelected = false,
    isHighlighted = false,
    onclick,
    onhover,
  }: Props = $props();

  const RADIUS = 38;
  const STONE_RADIUS = 5;
  const FACTIONS: Faction[] = ['green', 'blue', 'purple'];

  // Build list of stone dots to render
  type StoneDot = { faction: Faction; cx: number; cy: number };

  const stoneDots = $derived.by<StoneDot[]>(() => {
    const dots: StoneDot[] = [];
    for (const faction of FACTIONS) {
      const count = stones[faction] ?? 0;
      for (let i = 0; i < count; i++) {
        dots.push({ faction, cx: 0, cy: 0 }); // positions computed below
      }
    }

    // Arrange dots in a small circle pattern inside the territory
    const n = dots.length;
    if (n === 0) return [];

    const innerR = Math.min(16, 6 * n);
    return dots.map((dot, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = n === 1 ? 0 : innerR;
      return {
        ...dot,
        cx: x + Math.cos(angle) * r,
        cy: y + Math.sin(angle) * r,
      };
    });
  });

  const factionColor: Record<Faction, string> = {
    green: 'var(--green-light)',
    blue: 'var(--blue)',
    purple: 'var(--purple-light)',
  };

  const homelandGlow: Record<Faction, string> = {
    green: 'var(--green)',
    blue: 'var(--blue)',
    purple: 'var(--purple)',
  };

  const homelandGlowFilter: Record<Faction, string> = {
    green: 'drop-shadow(0 0 10px var(--green-glow))',
    blue: 'drop-shadow(0 0 10px var(--blue-glow))',
    purple: 'drop-shadow(0 0 10px var(--purple-glow))',
  };

  function handleClick() {
    onclick?.(territoryId);
  }

  function handleMouseEnter() {
    onhover?.(territoryId);
  }

  function handleMouseLeave() {
    onhover?.(null);
  }

  const totalStones = $derived(
    FACTIONS.reduce((sum, f) => sum + (stones[f] ?? 0), 0)
  );
</script>

<g
  class="territory"
  class:selected={isSelected}
  class:highlighted={isHighlighted}
  class:homeland={isHomeland}
  role="button"
  tabindex="0"
  aria-label="{name} territory"
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Homeland glow ring -->
  {#if isHomeland && homelandFaction}
    <circle
      cx={x}
      cy={y}
      r={RADIUS + 8}
      fill="none"
      stroke={homelandGlow[homelandFaction]}
      stroke-width="1.5"
      opacity="0.4"
      class="homeland-ring"
      style="filter: {homelandGlowFilter[homelandFaction]}"
    />
    <circle
      cx={x}
      cy={y}
      r={RADIUS + 14}
      fill="none"
      stroke={homelandGlow[homelandFaction]}
      stroke-width="0.5"
      opacity="0.15"
    />
  {/if}

  <!-- Selection ring -->
  {#if isSelected}
    <circle
      cx={x}
      cy={y}
      r={RADIUS + 6}
      fill="none"
      stroke="var(--text)"
      stroke-width="2"
      opacity="0.6"
      stroke-dasharray="4 3"
    />
  {/if}

  <!-- Main territory circle -->
  <circle
    cx={x}
    cy={y}
    r={RADIUS}
    class="territory-bg"
    fill={isHighlighted ? 'rgba(224, 216, 200, 0.07)' : 'rgba(26, 26, 46, 0.85)'}
    stroke={isSelected
      ? 'rgba(224, 216, 200, 0.5)'
      : isHighlighted
        ? 'rgba(224, 216, 200, 0.25)'
        : 'rgba(224, 216, 200, 0.12)'}
    stroke-width={isSelected ? 1.5 : 1}
  />

  <!-- Stone dots -->
  {#each stoneDots as dot}
    <circle
      cx={dot.cx}
      cy={dot.cy}
      r={STONE_RADIUS}
      fill={factionColor[dot.faction]}
      opacity="0.9"
      class="stone-dot"
    />
  {/each}

  <!-- Stone count (for > 5 stones total) -->
  {#if totalStones > 5}
    <text
      x={x}
      y={y + RADIUS - 8}
      text-anchor="middle"
      fill="var(--text-muted)"
      font-size="9"
      font-family="'Crimson Text', serif"
    >{totalStones}</text>
  {/if}

  <!-- Territory name -->
  <text
    x={x}
    y={y + RADIUS + 16}
    text-anchor="middle"
    fill={isHighlighted || isSelected ? 'var(--text)' : 'var(--text-muted)'}
    font-size="11"
    font-family="'Crimson Text', serif"
    letter-spacing="0.04em"
    class="territory-name"
  >{name}</text>
</g>

<style>
  .territory {
    cursor: pointer;
  }

  .territory:focus {
    outline: none;
  }

  .territory-bg {
    transition: fill 200ms ease, stroke 200ms ease;
  }

  .territory {
    transition: transform 200ms ease;
    transform-origin: center;
  }

  .territory:hover .territory-bg,
  .territory.highlighted .territory-bg {
    fill: rgba(224, 216, 200, 0.06);
  }

  .stone-dot {
    transition: opacity 150ms ease;
  }

  .homeland-ring {
    animation: homeland-pulse 3s ease-in-out infinite;
  }

  @keyframes homeland-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }

  .territory-name {
    pointer-events: none;
    user-select: none;
  }
</style>
