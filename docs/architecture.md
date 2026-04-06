# Architecture

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | SvelteKit | Built-in transitions for smooth animations, frontend + API in one project, clean DX |
| Map rendering | SVG | 11 territories is trivial for SVG; each territory = reactive animated component |
| Server→client push | SSE | Async-first = one-directional push. Simpler than WebSockets, auto-reconnects |
| Player actions | REST POST | Standard HTTP, easy to validate and rate-limit |
| Database | SQLite + Drizzle ORM | Game state as JSON blob, atomic reads/writes, trivial to self-host |
| Deployment | Single Docker container | One process, one DB file, zero ops |

## System Diagram

```
┌─────────────────┐         REST POST          ┌──────────────────┐
│     Browser      │ ──────────────────────────► │                  │
│                  │                             │    SvelteKit     │◄────► SQLite
│  Svelte UI       │ ◄────────────────────────── │    Server        │       (games.db)
│  + SVG Map       │         SSE stream          │                  │
└─────────────────┘                              └──────────────────┘
```

## Data Flows

### Create Game
1. Host visits `/` → clicks "Create Game"
2. POST `/api/games` → server generates game ID, empty game state (phase: waiting)
3. Returns game URL + password to share

### Join Game
1. Player visits game URL → enters shared password
2. POST `/api/games/:id/join` → server assigns random nature name, returns player token (cookie)
3. Host can start game when 2-5 players have joined

### Take Turn
1. Player selects action in UI
2. POST `/api/games/:id/action` with `{ type, ...params }` + player token
3. Server validates (correct player, legal action, has required stones)
4. Server mutates game state, saves to DB
5. SSE push to all connected players with new client-filtered state

### SSE Notification Flow
1. Client connects: GET `/api/games/:id/events` (SSE)
2. Server holds connection, sends keepalive pings
3. On state change: server pushes filtered game state to each connected client
4. On reconnect: client gets full current state (no event replay needed)

## UI Layout

```
┌──────────────────────────────────────────────┐
│  [AXE zone]      Game Info       [FLAG zone] │
├──────────────────────────────────────────────┤
│                                              │
│                                              │
│              SVG MAP (11 territories)        │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│  [Your Hand: stones]     [Action Buttons]    │
├──────────────────────────────────────────────┤
│  [Chat Panel - collapsible]                  │
└──────────────────────────────────────────────┘
```

- Axe zone: top-left, shows stones placed via Battle
- Flag zone: top-right, shows stones placed via March
- Map: center, interactive SVG
- Hand: bottom, player's secret stones (visible only to them)
- Chat: bottom or side panel, thematic styling

## Key Decisions

- **JSON blob per game** — entire game state is one atomic unit. No relational queries needed.
- **Client views filtered server-side** — other players' hands → counts only. Bag → count only. Your hand → full array.
- **No WebSocket** — SSE is sufficient for async play. Only server→client push needed.
- **Player auth via token cookie** — no accounts. Token issued on join, stored as httpOnly cookie.
- **Nature names** — randomly assigned from curated list: eagle, turtle, lion, spider, hawk, wolf, bear, fox, owl, raven, elk, heron, viper, moth, crow, lynx, otter, stag, wren, pike
