# Multiplayer vs Human — Implementation Plan

## Status: 📝 PROPOSED (not yet implemented, pending review)

## Scope Decisions (confirmed with user)
- **Sync model**: Async turn-based, matching the existing `games`/`game_players`/`turns` schema and `turn_timeout_hours` field. Not a live simultaneous-session mode — players take a turn, then it's the opponent's turn whenever they next open the app. Supabase Realtime is used only to *push* an update when it becomes your turn if you happen to have the app open; it is not required for turns to sync.
- **Pairing**: Both **invite code/link** and **random matchmaking queue**. No friends list / persistent accounts required.
- **Identity**: Lightweight — Supabase **anonymous auth** (stable `auth.uid()` per device/browser) + a locally-chosen display name. No email/password signup required for v1. This satisfies the `created_by`/`user_id` foreign keys already in the schema without building a full account system.

---

## 1. Current State (verified in codebase)

- `supabase/migrations/20250603193744_init_game_schema.sql` already defines `users`, `games`, `game_players`, `turns` tables with RLS policies designed for exactly this feature (`game_mode = 'multiplayer'`, `turn_timeout_hours`, per-turn history).
- `src/lib/supabase.ts` has a typed Supabase client + `Database` types matching that schema, but **nothing in `src/` uses it yet** — it's dead code today.
- `supabase/config.toml` has `enable_anonymous_sign_ins = false` — must flip to `true`.
- The game engine (`packages/engine/gamestate.ts`, `IGameStateManager` in `packages/engine/interfaces.ts`) is fully dependency-injected and platform-agnostic. `LocalGameStateManagerWithDependencies` currently owns *all* state locally and calls `generateBotMove()` for the non-human player.
- `src/hooks/useGameState.ts` wraps one `IGameStateManager` instance and is consumed directly by `src/components/game/InteractiveGame.tsx`.
- `src/App.tsx` is a simple `appState` string machine (`'main' | 'game' | 'challenge' | 'winner' | 'loser' | 'quitter'`) that renders `InteractiveGame` with a `config: GameConfig` and `currentGameMode="bot"`.
- `GameConfig` (`packages/engine/interfaces.ts`) has `allowBotPlayer`/`botId` but no concept of a remote human opponent yet.

**Key implication**: the engine's `IGameStateManager` interface is the right seam. We should NOT fork `InteractiveGame.tsx` or `useGameState.ts` — instead we implement a second manager that satisfies the same interface, backed by Supabase instead of an in-memory bot.

---

## 2. Data Model Changes

Mostly additive to the existing schema (new migration file, don't edit the old one):

- **`games` table**:
  - Add `invite_code TEXT UNIQUE` (short, human-shareable, e.g. 6 alphanumeric chars) — generated when a game is created with pairing method = invite.
  - Add `pairing_mode TEXT CHECK (pairing_mode IN ('invite','matchmaking')) DEFAULT 'invite'`.
  - `status = 'waiting'` already exists — reused for "waiting for opponent to join or waiting in matchmaking queue".
- **`matchmaking_queue` table (new)**: `id`, `user_id`, `display_name`, `queued_at`. A join happens by matching the oldest waiting row to a new entrant (via a Postgres function, see §4.2) and creating a `games` row + two `game_players` rows atomically, then deleting both queue rows.
- **`users` table**: already has `username`/`display_name`; anonymous users get a client-generated default display name (editable), persisted on first launch.
- Reuse `turns` table as-is — one row per applied move, already has everything (`previous_word`, `new_word`, `score_earned`, `key_letter_used`, `time_taken_seconds`).
- Reuse `game_players.last_active` for simple "opponent is stale" detection combined with `turn_timeout_hours`.

RLS: existing policies on `games`/`game_players`/`turns` already scope by `auth.uid()`, they should work unchanged for anonymous auth users too (Supabase anonymous users still have a `auth.uid()`). Need new RLS policies for `matchmaking_queue` (insert own row, select/delete own row; the matching function runs with `security definer` to bridge two different users' rows).

---

## 3. Identity / Auth

- Enable anonymous sign-ins in `supabase/config.toml` (`enable_anonymous_sign_ins = true`) and in the hosted project dashboard.
- New `src/adapters/supabaseAuthAdapter.ts`: on first app load, if no Supabase session exists, call `supabase.auth.signInAnonymously()`, then upsert a `public.users` row with a locally-stored/generated display name (e.g. "Player1234"), editable later from a settings/profile UI.
- Store the display name preference in the existing localStorage pattern (same convention as `browserUnlockAdapter.ts`) so it persists and can be edited without re-authenticating.

---

## 4. Matchmaking

### 4.1 Invite code/link
- "Create Game" → insert `games` row (`pairing_mode='invite'`, `status='waiting'`, `created_by = auth.uid()`) + one `game_players` row for self (`player_index=0`) → generate `invite_code` → show shareable code/link (`?join=<code>`) via native share sheet / clipboard copy.
- "Join Game" → user enters code (or opens link) → look up `games` by `invite_code` with `status='waiting'` → insert second `game_players` row (`player_index=1`) → flip `games.status='active'`.

### 4.2 Random matchmaking
- "Find Match" → insert row into `matchmaking_queue`.
- Call a Postgres RPC function `try_match()` (SQL, `security definer`) that: locks and pops the oldest *other* queued row (if any), creates the `games` + two `game_players` rows, deletes both queue rows, returns the new `game_id`. If no opponent is waiting, the row just sits in the queue.
- Client polls (or subscribes via Realtime on `matchmaking_queue`/`games` filtered by own `user_id`) until matched, with a "Cancel search" button that deletes its own queue row.

---

## 5. Realtime Sync & Engine Integration

### 5.1 New engine-side manager
- `packages/engine/remoteGamestate.ts`: a class implementing the same `IGameStateManager` interface as `LocalGameStateManagerWithDependencies`, but:
  - `applyMove()` writes a `turns` row + updates `games.current_word/word_history/key_letters/current_turn/current_player_index` instead of mutating in-memory state directly (still runs local validation/scoring via the same injected `GameStateDependencies` for instant UI feedback, then persists).
  - `makeBotMove()` becomes a no-op / throws — there is no bot in this mode.
  - `subscribe()` is fed both by local optimistic updates *and* a Supabase Realtime channel subscribed to `postgres_changes` on the specific `games.id` row (and `turns` inserts), so the opponent's move appears live if both apps are open, or on next load otherwise.
  - `loadState()` reconstructs `GameState` from a fetched `games` row + its `turns` history.

### 5.2 New adapter
- `src/adapters/supabaseMultiplayerAdapter.ts`: translates between the engine's generic dependency interfaces and Supabase queries/channels (fetch game, submit turn, subscribe to changes) — mirrors the shape of `browserAdapter.ts` so `useGameState`-style hooks can stay thin.

### 5.3 New hook
- `src/hooks/useMultiplayerGameState.ts` (parallel to `useGameState.ts`): wires `remoteGamestate` + `supabaseMultiplayerAdapter`, exposes the same `GameStateActions`/derived-state shape so `InteractiveGame.tsx` can consume either hook with minimal branching (likely via a small prop like `mode: 'bot' | 'human'` selecting which hook backs it, or a thin wrapper component).

**Why not reuse `LocalGameStateManagerWithDependencies` directly?** It assumes a single trusted local process owns turn order and can synchronously call `generateBotMove()`. A remote human opponent requires async persistence + subscription instead — cleaner as a sibling implementation of the same interface than as branching logic inside the existing class.

---

## 6. UI / UX Flow

- **Menu**: add a "Play vs Human" entry (`src/components/ui/MainScreen.tsx` / `Menu.tsx`) opening a new lobby screen with three actions: *Create invite*, *Join with code*, *Find random match*.
- **New component** `src/components/multiplayer/MultiplayerLobby.tsx`: handles the three flows in §4, shows waiting/searching state, and transitions to the game once `games.status='active'`.
- **`App.tsx`**: add `appState` values `'multiplayer-lobby'` and `'multiplayer-game'`; `InteractiveGame` (or a thin wrapper) receives `currentGameMode="human"` and a `gameId` instead of `botId`.
- **Turn indicator**: reuse existing turn/score UI; add "Waiting for opponent…" state when it's not your turn and no local move is pending, distinct from the bot-thinking spinner.
- **Opponent display name** shown instead of a bot name (`getBotDisplayName` equivalent — pull from `game_players`/`users`).
- **Resign/forfeit**: existing `handleResign` flow needs a multiplayer-safe variant that updates `games.status='abandoned'` server-side rather than just a local UI overlay.
- Push notifications for "it's your turn" are explicitly **out of scope for v1** (would need a mobile shell / web push subscription); note this as a fast-follow.

---

## 7. Testing Strategy

- Unit test `remoteGamestate.ts` against a **fake Supabase dependency** (mirroring how `packages/engine/__tests__/testUnlockAdapters.ts` mocks its dependencies) — no real network calls in CI.
- Integration test the invite-code create/join flow and the `try_match()` RPC against the local Supabase stack (`supabase start`) in CI, similar to how `src/adapters/integration.test.ts` tests the browser adapter today.
- Manual two-browser-tab test plan (documented, not automated) to verify Realtime push behaves as expected.

---

## 8. Phased Implementation

| Phase | Deliverable | Checkpoint |
|---|---|---|
| **M1** | Migration: `invite_code`, `pairing_mode`, `matchmaking_queue` table, `try_match()` RPC, RLS | `supabase db diff` clean; RPC callable in Studio |
| **M2** | Anonymous auth adapter + display name UI | Fresh browser gets a session + editable name, persisted |
| **M3** | `remoteGamestate.ts` + `supabaseMultiplayerAdapter.ts` + unit tests (mocked) | Engine-level tests pass with fake backend |
| **M4** | `useMultiplayerGameState.ts` + `MultiplayerLobby.tsx` + `App.tsx` wiring | Two browser profiles can create/join via invite code and play a full game |
| **M5** | Random matchmaking queue UI + cancel flow | Two tabs using "Find Match" get auto-paired |
| **M6** | Resign/forfeit + stale-opponent/timeout handling (`turn_timeout_hours`) | Abandoned games settle correctly, no stuck "waiting" states |
| **M7** | Polish: opponent name/avatar in game UI, win/lose overlays reused, docs update | Feature parity with vs-bot UX for the core loop |

---

## 9. Open Risks / Follow-ups
- Existing repo audit (`docs/project/PROJECT_STATUS_AUDIT.md`) flags an unresolved `npm run build` blocker (`tsc -b`) — should confirm still-clean build before layering new modules on top, or at least ensure new files don't add to it.
- Anonymous Supabase sessions are device/browser-local — switching browsers loses your identity/games-in-progress unless we later add optional account linking.
- No push notifications in v1 means an async game only advances when both players happen to open the app — acceptable per chosen scope, but worth setting expectations.
- Need a decision on max concurrent multiplayer games per user (schema has no explicit limit) — default to unlimited for v1 unless told otherwise.
