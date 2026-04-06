<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    gameState,
    connectToGame,
    disconnectFromGame,
    connectionStatus,
    isMyTurn,
    myHand,
    myPlayer,
    isHost,
  } from '$lib/stores/game.js';
  import Map from '$lib/components/Map.svelte';
  import AxeZone from '$lib/components/AxeZone.svelte';
  import FlagZone from '$lib/components/FlagZone.svelte';
  import Hand from '$lib/components/Hand.svelte';
  import PlayerList from '$lib/components/PlayerList.svelte';
  import ActionPanel from '$lib/components/ActionPanel.svelte';
  import Chat from '$lib/components/Chat.svelte';
  import { TERRITORY_NAMES } from '$lib/engine/map.js';
  import type { TerritoryId } from '$lib/engine/types.js';

  interface Props {
    data: {
      gameId: string;
      initialData: Record<string, unknown> | null;
      notFound: boolean;
    };
  }

  let { data }: Props = $props();

  // Join form state
  let joinPassword = $state('');
  let joinError = $state('');
  let joining = $state(false);

  // Start game state
  let starting = $state(false);
  let startError = $state('');

  // Game board interaction
  let selectedTerritory = $state<TerritoryId | null>(null);
  let selectedStone = $state<number | null>(null);

  const gs = $derived($gameState);
  const joined = $derived(gs !== null && typeof gs.yourPlayerIndex === 'number');
  const phase = $derived(gs?.phase ?? (data.initialData as {phase?: string} | null)?.phase ?? null);

  onMount(async () => {
    await connectToGame(data.gameId);
  });

  onDestroy(() => {
    disconnectFromGame();
  });

  async function joinGame() {
    if (!joinPassword.trim()) return;
    joining = true;
    joinError = '';

    try {
      const res = await fetch(`/api/games/${data.gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: joinPassword }),
      });

      const body = await res.json();

      if (!res.ok) {
        joinError = body.error ?? 'Failed to join game';
        return;
      }

      // Reconnect to SSE with new token
      await connectToGame(data.gameId);
    } catch {
      joinError = 'Network error. Please try again.';
    } finally {
      joining = false;
    }
  }

  async function startGame() {
    starting = true;
    startError = '';

    try {
      const res = await fetch(`/api/games/${data.gameId}/start`, {
        method: 'POST',
      });

      const body = await res.json();

      if (!res.ok) {
        startError = body.error ?? 'Failed to start game';
      }
    } catch {
      startError = 'Network error. Please try again.';
    } finally {
      starting = false;
    }
  }

  function handleSelectTerritory(id: TerritoryId | null) {
    selectedTerritory = id;
  }

  function handleSelectStone(index: number | null) {
    selectedStone = index;
  }

  function handleActionComplete() {
    selectedTerritory = null;
    selectedStone = null;
  }

  const turnInfoText = $derived.by(() => {
    if (!gs) return '';
    const cp = gs.players[gs.currentPlayerIndex];
    if (!cp) return '';
    const isYours = gs.currentPlayerIndex === gs.yourPlayerIndex;
    return isYours ? 'Your turn' : `${cp.name}'s turn`;
  });

  const lastActionText = $derived.by(() => {
    if (!gs?.lastAction) return '';
    const { playerName, action } = gs.lastAction;
    const name = (id: string) => TERRITORY_NAMES[id as TerritoryId] ?? id;
    switch (action.type) {
      case 'recruit':
        return `${playerName} recruited ${action.stone} to ${name(action.territory)}`;
      case 'battle':
        return `${playerName} battled ${action.targetFaction} in ${name(action.territory)} with ${action.stone}`;
      case 'march':
        return `${playerName} marched ${action.count} ${action.stone} from ${name(action.fromTerritory)} to ${name(action.toTerritory)}`;
      case 'negotiate':
        return action.revealedStone
          ? `${playerName} negotiated, revealed ${action.revealedStone}`
          : `${playerName} negotiated`;
    }
  });

  const connectionDot = $derived(
    $connectionStatus === 'connected'
      ? '#40916c'
      : $connectionStatus === 'connecting'
        ? '#f4a261'
        : '#e07070'
  );
</script>

{#if data.notFound}
  <!-- Game not found -->
  <div class="fullscreen-center">
    <div class="message-card">
      <h2>Game Not Found</h2>
      <p class="text-muted">This game does not exist or has expired.</p>
      <button class="btn btn-primary" onclick={() => goto('/')}>Back to Home</button>
    </div>
  </div>

{:else if !joined && phase !== 'playing' && phase !== 'finished'}
  <!-- Join form -->
  <div class="fullscreen-center">
    <div class="message-card join-card">
      <h2 class="card-title">Join Game</h2>
      <p class="text-muted">Game <code class="game-id">{data.gameId}</code></p>

      {#if phase === 'waiting'}
        <p class="lobby-note">
          {(data.initialData as {playerCount?: number} | null)?.playerCount ?? '?'} player(s) waiting in lobby
        </p>
      {/if}

      <form class="join-form" onsubmit={(e) => { e.preventDefault(); joinGame(); }}>
        <input
          type="password"
          placeholder="Game password"
          bind:value={joinPassword}
          autocomplete="off"
        />
        <button class="btn btn-primary" type="submit" disabled={joining || !joinPassword.trim()}>
          {joining ? 'Joining…' : 'Join Game'}
        </button>
      </form>

      {#if joinError}
        <p class="error">{joinError}</p>
      {/if}
    </div>
  </div>

{:else if joined && phase === 'waiting'}
  <!-- Lobby -->
  <div class="fullscreen-center">
    <div class="message-card lobby-card">
      <h2 class="card-title">Lobby</h2>
      <p class="text-muted">Share this link with friends:</p>
      <code class="game-url">{typeof window !== 'undefined' ? window.location.href : ''}</code>

      <div class="player-list-lobby">
        {#if gs}
          {#each gs.players as player}
            <div class="lobby-player">
              <span class="connection-dot" class:connected={player.connected}></span>
              <span>{player.name}</span>
              {#if player.index === 0}
                <span class="host-badge">host</span>
              {/if}
              {#if player.index === gs.yourPlayerIndex}
                <span class="you-badge">you</span>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      {#if $isHost}
        <div class="start-section">
          <button
            class="btn btn-primary"
            onclick={startGame}
            disabled={starting || (gs?.players.length ?? 0) < 2}
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
          {#if (gs?.players.length ?? 0) < 2}
            <p class="text-muted" style="font-size: 0.85rem;">Need at least 2 players to start</p>
          {/if}
          {#if startError}
            <p class="error">{startError}</p>
          {/if}
        </div>
      {:else}
        <p class="waiting-text text-muted">Waiting for host to start the game…</p>
      {/if}
    </div>
  </div>

{:else if phase === 'finished'}
  <!-- Game over overlay -->
  <div class="game-over-overlay">
    <div class="game-over-card">
      {#if gs?.winner?.faction}
        <div class="winner-faction" style="color: var(--{gs.winner.faction})">
          {gs.winner.faction.toUpperCase()}
        </div>
        <h2>The game is over</h2>
        {#if gs.winner.playerIndex !== null}
          <p class="winner-name">{gs.players[gs.winner.playerIndex]?.name} wins</p>
        {/if}
      {:else}
        <div class="winner-faction draw">DRAW</div>
        <h2>No faction prevailed</h2>
        <p class="winner-name">The struggle continues…</p>
      {/if}
      <button class="btn btn-primary" onclick={() => goto('/')}>Back to Home</button>
    </div>
  </div>

{:else if joined && phase === 'playing' && gs}
  <!-- Main game board -->
  <div class="game-layout">
    <!-- Top bar -->
    <header class="top-bar">
      <div class="zones">
        <AxeZone axe={gs.axe} />
        <FlagZone flag={gs.flag} />
      </div>

      <div class="turn-info">
        <div class="turn-text" class:my-turn={$isMyTurn}>{turnInfoText}</div>
        {#if lastActionText}
          <div class="last-action">{lastActionText}</div>
        {/if}
        <div class="turn-meta">
          <span class="text-muted" style="font-size: 0.75rem;">Turn {gs.turnNumber}</span>
          <span class="text-muted" style="font-size: 0.75rem;">Bag: {gs.bagCount}</span>
          <span
            class="connection-status"
            style="background: {connectionDot}"
            title={$connectionStatus}
          ></span>
        </div>
      </div>
    </header>

    <!-- Map -->
    <main class="map-area">
      <Map
        territories={gs.territories}
        {selectedTerritory}
        onSelectTerritory={handleSelectTerritory}
      />
    </main>

    <!-- Bottom bar -->
    <footer class="bottom-bar">
      <Hand
        hand={$myHand}
        {selectedStone}
        onSelectStone={handleSelectStone}
      />
      <ActionPanel
        gameId={data.gameId}
        hand={$myHand}
        {selectedStone}
        {selectedTerritory}
        territories={gs.territories}
        isMyTurn={$isMyTurn}
        bagCount={gs.bagCount}
        onActionComplete={handleActionComplete}
      />
      <PlayerList
        players={gs.players}
        currentPlayerIndex={gs.currentPlayerIndex}
        yourPlayerIndex={gs.yourPlayerIndex}
      />
    </footer>

    <!-- Chat overlay -->
    {#if $myPlayer}
      <Chat gameId={data.gameId} yourName={$myPlayer.name} />
    {/if}
  </div>

{:else}
  <!-- Loading / connecting state -->
  <div class="fullscreen-center">
    <div class="loading-card">
      <div class="spinner"></div>
      <p class="text-muted">Connecting…</p>
    </div>
  </div>
{/if}

<style>
  /* ===== Full-screen layouts ===== */
  .fullscreen-center {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .message-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem 2.5rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    max-width: 420px;
    width: 100%;
    text-align: center;
  }

  .card-title {
    font-size: 1.6rem;
    color: var(--text);
  }

  .game-id {
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--text-muted);
    background: rgba(255,255,255,0.04);
    padding: 0.1em 0.4em;
    border-radius: 3px;
  }

  .game-url {
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: rgba(255,255,255,0.04);
    padding: 0.4em 0.6em;
    border-radius: var(--radius);
    word-break: break-all;
    text-align: left;
  }

  .lobby-note {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  /* ===== Join form ===== */
  .join-form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  /* ===== Lobby ===== */
  .lobby-card {
    max-width: 480px;
  }

  .player-list-lobby {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-align: left;
    background: rgba(255,255,255,0.02);
    border-radius: var(--radius);
    padding: 0.75rem;
  }

  .lobby-player {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
  }

  .connection-dot {
    display: block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-dim);
    flex-shrink: 0;
  }

  .connection-dot.connected {
    background: var(--green-light);
    box-shadow: 0 0 4px var(--green-glow);
  }

  .host-badge,
  .you-badge {
    font-size: 0.7rem;
    padding: 0.1em 0.4em;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .host-badge {
    background: rgba(72, 149, 239, 0.15);
    color: var(--blue-light);
    border: 1px solid rgba(72, 149, 239, 0.3);
  }

  .you-badge {
    background: rgba(224, 216, 200, 0.06);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .start-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .waiting-text {
    font-style: italic;
    font-size: 0.9rem;
  }

  /* ===== Error ===== */
  .error {
    color: #e07070;
    font-size: 0.9rem;
  }

  /* ===== Game over ===== */
  .game-over-overlay {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 8, 20, 0.85);
    backdrop-filter: blur(4px);
  }

  .game-over-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem 4rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .winner-faction {
    font-size: 3rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-shadow: 0 0 40px currentColor;
  }

  .winner-name {
    font-size: 1.2rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .winner-faction.draw {
    color: var(--text-muted);
    text-shadow: none;
  }

  /* ===== Loading ===== */
  .loading-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--border);
    border-top-color: var(--blue);
    border-radius: 50%;
    animation: spin 800ms linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ===== Main game layout ===== */
  .game-layout {
    height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
    gap: 0;
  }

  /* Top bar */
  .top-bar {
    display: flex;
    align-items: center;
    padding: 0.6rem 1rem;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    gap: 1rem;
    min-height: 60px;
  }

  .zones {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .turn-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .turn-text {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    transition: color var(--transition);
  }

  .turn-text.my-turn {
    color: var(--blue-light);
    text-shadow: 0 0 16px var(--blue-glow);
  }

  .last-action {
    font-size: 0.78rem;
    font-style: italic;
    color: var(--text-dim);
    text-align: center;
    line-height: 1.2;
  }

  .turn-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .connection-status {
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transition: background 300ms ease;
  }

  /* Map area */
  .map-area {
    overflow: hidden;
    padding: 0.75rem;
    display: flex;
    align-items: stretch;
  }

  /* Bottom bar */
  .bottom-bar {
    display: flex;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    min-height: 100px;
  }
</style>
