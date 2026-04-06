<script lang="ts">
  import type { Faction, TerritoryId, FactionCounts } from '$lib/engine/types.js';
  import { ADJACENCY, TERRITORY_NAMES } from '$lib/engine/map.js';

  type ActionMode = 'recruit' | 'battle' | 'march' | 'negotiate';

  interface Props {
    gameId: string;
    hand: Faction[];
    selectedStone: number | null;
    selectedTerritory: TerritoryId | null;
    territories: Record<TerritoryId, FactionCounts>;
    isMyTurn: boolean;
    bagCount: number;
    onActionComplete?: () => void;
  }

  let {
    gameId,
    hand,
    selectedStone,
    selectedTerritory,
    territories,
    isMyTurn,
    bagCount,
    onActionComplete,
  }: Props = $props();

  const MODES: ActionMode[] = ['recruit', 'battle', 'march', 'negotiate'];
  const MODE_LABELS: Record<ActionMode, string> = {
    recruit: 'Recruit',
    battle: 'Battle',
    march: 'March',
    negotiate: 'Negotiate',
  };

  const FACTIONS: Faction[] = ['green', 'blue', 'purple'];

  const factionColor: Record<Faction, string> = {
    green: 'var(--green-light)',
    blue: 'var(--blue)',
    purple: 'var(--purple-light)',
  };

  const factionGlow: Record<Faction, string> = {
    green: 'var(--green-glow)',
    blue: 'var(--blue-glow)',
    purple: 'var(--purple-glow)',
  };

  // Local state
  let mode = $state<ActionMode>('recruit');
  let targetFaction = $state<Faction | null>(null);
  let toTerritory = $state<TerritoryId | null>(null);
  let marchCount = $state(1);
  let submitting = $state(false);
  let errorMsg = $state('');
  let errorTimer: ReturnType<typeof setTimeout> | null = null;

  // Derived helpers
  const stone = $derived(selectedStone !== null ? hand[selectedStone] : null);
  const territoryName = $derived(selectedTerritory ? TERRITORY_NAMES[selectedTerritory] : null);
  const toTerritoryName = $derived(toTerritory ? TERRITORY_NAMES[toTerritory] : null);

  const adjacentIds = $derived<TerritoryId[]>(
    selectedTerritory ? ADJACENCY[selectedTerritory] : []
  );

  const stonesInSource = $derived<number>(
    selectedTerritory && stone
      ? (territories[selectedTerritory]?.[stone] ?? 0)
      : 0
  );

  const maxMarchCount = $derived(stonesInSource > 0 ? stonesInSource : 1);

  // Clamp marchCount when maxMarchCount changes
  $effect(() => {
    if (marchCount > maxMarchCount) marchCount = maxMarchCount;
    if (marchCount < 1) marchCount = 1;
  });

  // Reset toTerritory and targetFaction when mode changes
  $effect(() => {
    void mode;
    toTerritory = null;
    targetFaction = null;
    marchCount = 1;
  });

  // Reset toTerritory when selectedTerritory changes (march flow resets destination)
  $effect(() => {
    void selectedTerritory;
    toTerritory = null;
  });

  // Readiness checks
  const recruitReady = $derived(stone !== null && selectedTerritory !== null);
  const battleReady = $derived(stone !== null && selectedTerritory !== null && targetFaction !== null);
  const marchReady = $derived(stone !== null && selectedTerritory !== null && toTerritory !== null && stonesInSource >= 1);
  const negotiateReady = $derived(hand.length === 0 || stone !== null);

  const submitReady = $derived(
    mode === 'recruit' ? recruitReady :
    mode === 'battle' ? battleReady :
    mode === 'march' ? marchReady :
    negotiateReady
  );

  // Status hint text
  const statusText = $derived.by<string>(() => {
    if (mode === 'recruit') {
      if (!stone && !selectedTerritory) return 'Select a stone and territory';
      if (!stone) return 'Select a stone from your hand';
      if (!selectedTerritory) return 'Select a territory on the map';
      return `Place ${stone} stone on ${territoryName}`;
    }
    if (mode === 'battle') {
      if (!stone) return 'Select a stone from your hand';
      if (!selectedTerritory) return 'Select a territory to attack';
      if (!targetFaction) return 'Choose a target faction below';
      return `Attack ${targetFaction} in ${territoryName} with ${stone} stone`;
    }
    if (mode === 'march') {
      if (!stone) return 'Select a stone from your hand';
      if (!selectedTerritory) return 'Select a source territory';
      if (stonesInSource < 1) return `No ${stone} stones in ${territoryName}`;
      if (!toTerritory) return 'Choose a destination below';
      return `Move ${marchCount} ${stone} stone${marchCount !== 1 ? 's' : ''} from ${territoryName} to ${toTerritoryName}`;
    }
    // negotiate
    if (hand.length === 0) return `Draw a stone from the bag (${bagCount} remaining)`;
    if (!stone) return 'Select a stone to reveal and return';
    return `Reveal ${stone} stone and draw from bag`;
  });

  function showError(msg: string) {
    errorMsg = msg;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = setTimeout(() => { errorMsg = ''; }, 3000);
  }

  async function submit() {
    if (submitting) return;

    let body: Record<string, unknown>;

    if (hand.length === 0) {
      body = { type: 'negotiate', revealedStone: null };
    } else if (!submitReady) {
      return;
    } else if (mode === 'recruit') {
      body = { type: 'recruit', stone: stone!, territory: selectedTerritory! };
    } else if (mode === 'battle') {
      body = { type: 'battle', stone: stone!, territory: selectedTerritory!, targetFaction: targetFaction! };
    } else if (mode === 'march') {
      body = { type: 'march', stone: stone!, fromTerritory: selectedTerritory!, toTerritory: toTerritory!, count: marchCount };
    } else {
      body = { type: 'negotiate', revealedStone: stone! };
    }

    submitting = true;
    errorMsg = '';

    try {
      const res = await fetch(`/api/games/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError((data as { error?: string }).error ?? 'Action failed');
        return;
      }

      toTerritory = null;
      targetFaction = null;
      marchCount = 1;
      onActionComplete?.();
    } catch {
      showError('Network error. Please try again.');
    } finally {
      submitting = false;
    }
  }
</script>

<div class="action-panel">
  <div class="panel-header">
    <span class="panel-label">Action</span>
  </div>

  {#if !isMyTurn}
    <div class="waiting-state">
      <span class="waiting-text">Waiting…</span>
    </div>
  {:else if hand.length === 0}
    <!-- Empty hand: can only pass (negotiate with no reveal) -->
    <p class="status-hint">Your hand is empty</p>
    <button
      class="submit-btn"
      onclick={submit}
      disabled={submitting}
    >
      {submitting ? 'Passing…' : 'Pass'}
    </button>
    {#if errorMsg}
      <p class="error-text">{errorMsg}</p>
    {/if}
  {:else}
    <!-- Mode tabs -->
    <div class="mode-tabs">
      {#each MODES as m}
        <button
          class="mode-btn"
          class:active={mode === m}
          onclick={() => { mode = m; }}
          aria-pressed={mode === m}
        >
          {MODE_LABELS[m]}
        </button>
      {/each}
    </div>

    <!-- Per-mode secondary controls -->
    <div class="controls">
      {#if mode === 'battle' && stone}
        <div class="sub-section">
          <span class="sub-label">Target</span>
          <div class="faction-row">
            {#each FACTIONS.filter(f => f !== stone) as f}
              <button
                class="faction-btn"
                class:selected={targetFaction === f}
                onclick={() => { targetFaction = targetFaction === f ? null : f; }}
                style="
                  --f-color: {factionColor[f]};
                  --f-glow: {factionGlow[f]};
                "
              >
                <span class="faction-dot" style="background: {factionColor[f]}; box-shadow: 0 0 6px {factionGlow[f]};"></span>
                {f}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if mode === 'march' && selectedTerritory && stone && stonesInSource >= 1}
        <div class="sub-section">
          <span class="sub-label">Destination</span>
          <div class="territory-row">
            {#each adjacentIds as tid}
              <button
                class="territory-btn"
                class:selected={toTerritory === tid}
                onclick={() => { toTerritory = toTerritory === tid ? null : tid; }}
              >
                {TERRITORY_NAMES[tid]}
              </button>
            {/each}
          </div>
        </div>

        {#if toTerritory}
          <div class="sub-section">
            <span class="sub-label">Count</span>
            <div class="count-row">
              <button
                class="count-btn"
                onclick={() => { if (marchCount > 1) marchCount--; }}
                disabled={marchCount <= 1}
                aria-label="Decrease count"
              >−</button>
              <span class="count-value">{marchCount}</span>
              <button
                class="count-btn"
                onclick={() => { if (marchCount < maxMarchCount) marchCount++; }}
                disabled={marchCount >= maxMarchCount}
                aria-label="Increase count"
              >+</button>
              <span class="count-max">/ {maxMarchCount}</span>
            </div>
          </div>
        {/if}
      {/if}

      {#if mode === 'march' && selectedTerritory && stone && stonesInSource < 1}
        <span class="status-hint warn">No {stone} stones in {territoryName}</span>
      {/if}
    </div>

    <!-- Status hint -->
    <p class="status-hint">{statusText}</p>

    <!-- Submit -->
    <button
      class="submit-btn"
      onclick={submit}
      disabled={!submitReady || submitting}
    >
      {submitting ? 'Submitting…' : 'Submit'}
    </button>

    {#if errorMsg}
      <p class="error-text">{errorMsg}</p>
    {/if}
  {/if}
</div>

<style>
  .action-panel {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.65rem 0.8rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    width: 240px;
    min-width: 200px;
    max-width: 280px;
    flex-shrink: 0;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .panel-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  /* Waiting state */
  .waiting-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 60px;
  }

  .waiting-text {
    font-size: 0.9rem;
    font-style: italic;
    color: var(--text-dim);
  }

  /* Mode tabs */
  .mode-tabs {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .mode-btn {
    flex: 1;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 0.25em 0.4em;
    border-radius: 100px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    text-transform: uppercase;
  }

  .mode-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    color: var(--text);
  }

  .mode-btn.active {
    background: rgba(72, 149, 239, 0.12);
    border-color: rgba(72, 149, 239, 0.5);
    color: var(--blue-light);
    box-shadow: 0 0 8px var(--blue-glow);
  }

  /* Secondary controls */
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .sub-section {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .sub-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }

  /* Faction picker */
  .faction-row {
    display: flex;
    gap: 0.3rem;
  }

  .faction-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: inherit;
    font-size: 0.78rem;
    padding: 0.2em 0.5em;
    border-radius: var(--radius);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
    text-transform: capitalize;
  }

  .faction-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    color: var(--text);
  }

  .faction-btn.selected {
    background: rgba(255, 255, 255, 0.04);
    border-color: var(--f-color);
    color: var(--f-color);
    box-shadow: 0 0 6px var(--f-glow);
  }

  .faction-dot {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Territory picker (march destination) */
  .territory-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .territory-btn {
    font-family: inherit;
    font-size: 0.72rem;
    padding: 0.2em 0.45em;
    border-radius: var(--radius);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
  }

  .territory-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    color: var(--text);
  }

  .territory-btn.selected {
    background: rgba(72, 149, 239, 0.1);
    border-color: rgba(72, 149, 239, 0.45);
    color: var(--blue-light);
  }

  /* Count picker */
  .count-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .count-btn {
    font-family: inherit;
    font-size: 0.9rem;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
  }

  .count-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    color: var(--text);
  }

  .count-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .count-value {
    font-size: 0.9rem;
    font-weight: 600;
    min-width: 1.2ch;
    text-align: center;
    color: var(--text);
  }

  .count-max {
    font-size: 0.72rem;
    color: var(--text-dim);
  }

  /* Status hint */
  .status-hint {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-style: italic;
    line-height: 1.3;
    min-height: 1.3em;
  }

  .status-hint.warn {
    color: #e07070;
  }

  /* Submit button */
  .submit-btn {
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.4em 0.8em;
    border-radius: var(--radius);
    background: rgba(72, 149, 239, 0.15);
    border: 1px solid rgba(72, 149, 239, 0.4);
    color: var(--blue-light);
    cursor: pointer;
    transition: all var(--transition);
    width: 100%;
  }

  .submit-btn:hover:not(:disabled) {
    background: rgba(72, 149, 239, 0.25);
    border-color: var(--blue);
    box-shadow: 0 0 12px var(--blue-glow);
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  /* Error */
  .error-text {
    font-size: 0.78rem;
    color: #e07070;
    line-height: 1.3;
  }
</style>
