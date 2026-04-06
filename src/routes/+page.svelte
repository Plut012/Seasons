<script lang="ts">
  import { goto } from '$app/navigation';

  let creating = $state(false);
  let error = $state('');

  async function createGame() {
    const password = prompt('Choose a password for your game:');
    if (!password || !password.trim()) return;

    creating = true;
    error = '';

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error ?? 'Failed to create game';
        return;
      }

      await goto(`/game/${data.id}`);
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      creating = false;
    }
  }
</script>

<div class="landing">
  <div class="backdrop"></div>

  <main class="content">
    <div class="title-block">
      <h1 class="title">Turncoats</h1>
      <p class="subtitle">A game about playing all sides</p>
    </div>

    <div class="actions">
      <button class="btn btn-primary create-btn" onclick={createGame} disabled={creating}>
        {creating ? 'Creating…' : 'Create Game'}
      </button>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

    <div class="lore">
      <p>
        Three factions. Hidden loyalties. Every stone you play helps a faction win —
        but the stones you keep are how <em>you</em> win.
      </p>
    </div>

    <div class="faction-dots">
      <span class="dot green" title="Green — Forest"></span>
      <span class="dot blue" title="Blue — Sky"></span>
      <span class="dot purple" title="Purple — Royalty"></span>
    </div>
  </main>
</div>

<style>
  .landing {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(45, 106, 79, 0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 80%, rgba(123, 45, 142, 0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 60% 30%, rgba(72, 149, 239, 0.04) 0%, transparent 50%);
    pointer-events: none;
  }

  .content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
    text-align: center;
    max-width: 480px;
    padding: 2rem;
  }

  .title-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .title {
    font-size: clamp(3rem, 8vw, 5.5rem);
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--text);
    text-shadow:
      0 0 60px rgba(224, 216, 200, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.4);
    line-height: 1;
  }

  .subtitle {
    font-size: 1.2rem;
    color: var(--text-muted);
    font-style: italic;
    letter-spacing: 0.04em;
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .create-btn {
    font-size: 1.15rem;
    padding: 0.7em 2em;
    letter-spacing: 0.08em;
  }

  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error {
    color: #e07070;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .lore {
    max-width: 340px;
    color: var(--text-muted);
    font-size: 1rem;
    line-height: 1.7;
    font-style: italic;
  }

  .lore em {
    color: var(--text);
    font-style: normal;
  }

  .faction-dots {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .dot {
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    opacity: 0.7;
  }

  .dot.green {
    background: var(--green-light);
    box-shadow: 0 0 8px var(--green-glow);
  }

  .dot.blue {
    background: var(--blue);
    box-shadow: 0 0 8px var(--blue-glow);
  }

  .dot.purple {
    background: var(--purple-light);
    box-shadow: 0 0 8px var(--purple-glow);
  }
</style>
