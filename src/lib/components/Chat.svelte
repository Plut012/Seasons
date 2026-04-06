<script lang="ts">
  import { onDestroy } from 'svelte';

  interface ChatMessage {
    id: string;
    playerName: string;
    text: string;
    createdAt: string;
  }

  interface Props {
    gameId: string;
    yourName: string;
  }

  let { gameId, yourName }: Props = $props();

  let open = $state(false);
  let messages = $state<ChatMessage[]>([]);
  let inputText = $state('');
  let sending = $state(false);
  let lastSeenId = $state<string | null>(null);
  let messagesEl = $state<HTMLElement | null>(null);

  let unreadCount = $derived(
    open || messages.length === 0
      ? 0
      : lastSeenId === null
        ? messages.length
        : (() => {
            const idx = messages.findIndex((m) => m.id === lastSeenId);
            return idx === -1 ? messages.length : messages.length - 1 - idx;
          })()
  );

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/games/${gameId}/chat`);
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      const hadMessages = messages.length > 0;
      const prevLastId = messages.at(-1)?.id ?? null;
      messages = data;
      if (open) {
        // Mark all as seen when panel is open
        if (data.length > 0) {
          lastSeenId = data.at(-1)!.id;
        }
        // Scroll to bottom if new messages arrived
        if (hadMessages && data.at(-1)?.id !== prevLastId) {
          scrollToBottom();
        }
      }
    } catch {
      // Network errors are silently ignored — polling will retry
    }
  }

  function scrollToBottom() {
    // Use a microtask so the DOM has updated before we scroll
    queueMicrotask(() => {
      if (messagesEl) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
  }

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  function startPolling(intervalMs: number) {
    stopPolling();
    pollInterval = setInterval(fetchMessages, intervalMs);
  }

  function stopPolling() {
    if (pollInterval !== null) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  $effect(() => {
    // Initial fetch immediately
    fetchMessages();
    // Poll rate depends on panel state
    startPolling(open ? 5000 : 15000);

    if (open) {
      // Mark all current messages as seen
      if (messages.length > 0) {
        lastSeenId = messages.at(-1)!.id;
      }
      scrollToBottom();
    }

    return () => {
      stopPolling();
    };
  });

  function toggleOpen() {
    open = !open;
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || sending) return;
    sending = true;
    try {
      await fetch(`/api/games/${gameId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      inputText = '';
      await fetchMessages();
      scrollToBottom();
    } catch {
      // Send failure is silent; user can retry
    } finally {
      sending = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  onDestroy(() => {
    stopPolling();
  });
</script>

<div class="chat-root">
  {#if open}
    <div class="chat-panel" role="dialog" aria-label="Chat">
      <div class="chat-header">
        <span class="chat-title">Chat</span>
        <button class="close-btn" onclick={toggleOpen} aria-label="Close chat">✕</button>
      </div>

      <div class="messages" bind:this={messagesEl}>
        {#if messages.length === 0}
          <p class="empty-state">No messages yet. Say hello!</p>
        {:else}
          {#each messages as msg (msg.id)}
            <div
              class="message"
              class:own={msg.playerName === yourName}
              title={formatTimestamp(msg.createdAt)}
            >
              <span class="msg-author">{msg.playerName}:</span>
              <span class="msg-text">{msg.text}</span>
            </div>
          {/each}
        {/if}
      </div>

      <div class="input-row">
        <input
          type="text"
          class="chat-input"
          placeholder="Say something…"
          bind:value={inputText}
          onkeydown={handleKeydown}
          disabled={sending}
          maxlength={500}
          aria-label="Chat message"
        />
        <button
          class="send-btn"
          onclick={sendMessage}
          disabled={sending || inputText.trim().length === 0}
          aria-label="Send"
        >
          Send
        </button>
      </div>
    </div>
  {/if}

  <button
    class="toggle-btn"
    class:has-unread={unreadCount > 0}
    onclick={toggleOpen}
    aria-label={open ? 'Close chat' : 'Open chat'}
    aria-expanded={open}
  >
    <span class="toggle-label">Chat</span>
    {#if !open && unreadCount > 0}
      <span class="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
    {/if}
  </button>
</div>

<style>
  .chat-root {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  /* ---- Panel ---- */
  .chat-panel {
    width: 320px;
    display: flex;
    flex-direction: column;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: panel-in 180ms ease;
  }

  @keyframes panel-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ---- Header ---- */
  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 0.9rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-surface);
  }

  .chat-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .close-btn {
    background: transparent;
    color: var(--text-dim);
    font-size: 0.8rem;
    padding: 0.1rem 0.3rem;
    border-radius: var(--radius);
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text);
    background: var(--bg-hover);
  }

  /* ---- Message list ---- */
  .messages {
    flex: 1;
    max-height: 260px;
    min-height: 120px;
    overflow-y: auto;
    padding: 0.6rem 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .empty-state {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-style: italic;
    text-align: center;
    margin: auto 0;
  }

  .message {
    display: flex;
    gap: 0.35em;
    font-size: 0.9rem;
    line-height: 1.35;
    padding: 0.25rem 0.4rem;
    border-radius: var(--radius);
    word-break: break-word;
    cursor: default;
    transition: background var(--transition);
  }

  .message:hover {
    background: var(--bg-hover);
  }

  .message.own {
    background: rgba(72, 149, 239, 0.07);
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  .message.own:hover {
    background: rgba(72, 149, 239, 0.13);
  }

  .msg-author {
    color: var(--text-muted);
    font-size: 0.82rem;
    flex-shrink: 0;
    font-weight: 600;
  }

  .message.own .msg-author {
    color: var(--blue-light);
  }

  .msg-text {
    color: var(--text);
  }

  /* ---- Input row ---- */
  .input-row {
    display: flex;
    gap: 0.4rem;
    padding: 0.55rem 0.75rem;
    border-top: 1px solid var(--border);
    background: var(--bg-surface);
  }

  .chat-input {
    flex: 1;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: inherit;
    font-size: 0.9rem;
    padding: 0.35em 0.65em;
    outline: none;
    transition: border-color var(--transition), box-shadow var(--transition);
    width: 0; /* let flex control size */
  }

  .chat-input:focus {
    border-color: var(--border-hover);
    box-shadow: 0 0 0 2px rgba(224, 216, 200, 0.06);
  }

  .chat-input::placeholder {
    color: var(--text-dim);
  }

  .chat-input:disabled {
    opacity: 0.5;
  }

  .send-btn {
    background: rgba(72, 149, 239, 0.12);
    border: 1px solid rgba(72, 149, 239, 0.35);
    border-radius: var(--radius);
    color: var(--blue-light);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35em 0.75em;
    flex-shrink: 0;
    transition: all var(--transition);
  }

  .send-btn:hover:not(:disabled) {
    background: rgba(72, 149, 239, 0.22);
    border-color: var(--blue);
    box-shadow: 0 0 8px var(--blue-glow);
  }

  .send-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* ---- Toggle button ---- */
  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 0.4em 0.85em;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    transition: all var(--transition);
  }

  .toggle-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    color: var(--text);
  }

  .toggle-btn.has-unread {
    border-color: rgba(72, 149, 239, 0.45);
    color: var(--blue-light);
  }

  .toggle-label {
    line-height: 1;
  }

  /* ---- Unread badge ---- */
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.3em;
    height: 1.3em;
    padding: 0 0.3em;
    border-radius: 999px;
    background: var(--blue);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
  }
</style>
