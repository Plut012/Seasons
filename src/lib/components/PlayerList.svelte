<script lang="ts">
  import type { ClientPlayer } from '$lib/engine/types.js';

  interface Props {
    players: ClientPlayer[];
    currentPlayerIndex: number;
    yourPlayerIndex: number;
  }

  let { players, currentPlayerIndex, yourPlayerIndex }: Props = $props();
</script>

<div class="player-list">
  <div class="list-header">
    <span class="list-label">Players</span>
  </div>

  <ul class="players">
    {#each players as player}
      <li
        class="player-row"
        class:is-current={player.index === currentPlayerIndex}
        class:is-you={player.index === yourPlayerIndex}
      >
        <!-- Connection status dot -->
        <span
          class="connection-dot"
          class:connected={player.connected}
          title={player.connected ? 'Connected' : 'Disconnected'}
        ></span>

        <!-- Player name -->
        <span class="player-name">
          {player.name}
          {#if player.index === yourPlayerIndex}
            <span class="you-tag">(you)</span>
          {/if}
        </span>

        <!-- Turn indicator -->
        {#if player.index === currentPlayerIndex}
          <span class="turn-pip" title="Current turn"></span>
        {/if}

        <!-- Hand count -->
        <span class="hand-count">{player.handCount}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .player-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.75rem 1rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    min-width: 160px;
  }

  .list-header {
    margin-bottom: 0.2rem;
  }

  .list-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .players {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .player-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.4rem;
    border-radius: var(--radius);
    transition: background 150ms ease;
    font-size: 0.9rem;
  }

  .player-row.is-current {
    background: rgba(224, 216, 200, 0.05);
  }

  .player-row.is-you {
    /* subtle self-highlight */
  }

  .connection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-dim);
    flex-shrink: 0;
    transition: background 300ms ease;
  }

  .connection-dot.connected {
    background: var(--green-light);
    box-shadow: 0 0 4px var(--green-glow);
  }

  .player-name {
    flex: 1;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .you-tag {
    color: var(--text-muted);
    font-size: 0.8em;
    margin-left: 0.2em;
  }

  .turn-pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--blue);
    box-shadow: 0 0 6px var(--blue-glow);
    flex-shrink: 0;
    animation: turn-pulse 1.5s ease-in-out infinite;
  }

  .hand-count {
    color: var(--text-muted);
    font-size: 0.8rem;
    min-width: 1.2em;
    text-align: right;
    flex-shrink: 0;
  }

  @keyframes turn-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
</style>
