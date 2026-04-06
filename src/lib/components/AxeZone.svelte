<script lang="ts">
  import type { FactionCounts } from '$lib/engine/types.js';

  interface Props {
    axe: FactionCounts;
  }

  let { axe }: Props = $props();

  const factions = ['green', 'blue', 'purple'] as const;

  const factionColor = {
    green: 'var(--green-light)',
    blue: 'var(--blue)',
    purple: 'var(--purple-light)',
  };

  const total = $derived(factions.reduce((s, f) => s + (axe[f] ?? 0), 0));
</script>

<div class="axe-zone">
  <div class="zone-header">
    <span class="zone-icon" aria-hidden="true">⚔</span>
    <span class="zone-label">Axe</span>
  </div>

  <div class="stone-counts">
    {#each factions as faction}
      {#if (axe[faction] ?? 0) > 0}
        <div class="faction-row">
          <span class="dot" style="background: {factionColor[faction]}; box-shadow: 0 0 6px {factionColor[faction]}40;"></span>
          <span class="count">{axe[faction]}</span>
        </div>
      {/if}
    {/each}
    {#if total === 0}
      <span class="empty">—</span>
    {/if}
  </div>
</div>

<style>
  .axe-zone {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem 0.8rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-width: 80px;
  }

  .zone-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .zone-icon {
    font-size: 1.1rem;
    opacity: 0.6;
  }

  .zone-label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    font-family: 'Crimson Text', serif;
  }

  .stone-counts {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .faction-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .dot {
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .count {
    font-size: 1rem;
    color: var(--text);
  }

  .empty {
    color: var(--text-dim);
    font-size: 0.85rem;
  }
</style>
