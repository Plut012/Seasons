<script lang="ts">
  import type { Faction } from '$lib/engine/types.js';

  interface Props {
    hand: Faction[];
    selectedStone?: number | null;
    onSelectStone?: (index: number | null) => void;
  }

  let {
    hand,
    selectedStone = null,
    onSelectStone,
  }: Props = $props();

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

  function handleClick(index: number) {
    if (selectedStone === index) {
      onSelectStone?.(null);
    } else {
      onSelectStone?.(index);
    }
  }
</script>

<div class="hand-panel">
  <div class="hand-header">
    <span class="hand-label">Your Hand</span>
    <span class="hand-count">{hand.length} stone{hand.length !== 1 ? 's' : ''}</span>
  </div>

  <div class="stones-row">
    {#each hand as faction, i}
      <button
        class="stone"
        class:selected={selectedStone === i}
        onclick={() => handleClick(i)}
        aria-label="{faction} stone"
        title="{faction}"
        style="
          background: {factionColor[faction]};
          box-shadow: 0 0 {selectedStone === i ? '14px' : '6px'} {factionGlow[faction]};
        "
      >
      </button>
    {/each}

    {#if hand.length === 0}
      <span class="empty">Empty hand</span>
    {/if}
  </div>
</div>

<style>
  .hand-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    min-height: 80px;
    flex: 1;
  }

  .hand-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .hand-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .hand-count {
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  .stones-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    min-height: 32px;
  }

  .stone {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: transform 150ms ease, box-shadow 150ms ease;
    outline: none;
    position: relative;
  }

  .stone:hover {
    transform: scale(1.15);
  }

  .stone.selected {
    transform: scale(1.2);
    outline: 2px solid rgba(224, 216, 200, 0.5);
    outline-offset: 2px;
  }

  .stone::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
  }

  .empty {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-style: italic;
  }
</style>
