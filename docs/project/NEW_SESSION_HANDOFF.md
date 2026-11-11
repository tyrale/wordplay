# New-session handoff prompt

Paste this into a fresh agent session to bootstrap context (written for a
machine transfer; HEAD at time of writing: `1d77b4d` on `master`).

---

I'm picking up work on the wordplay repo (github.com/tyrale/wordplay, branch: master) on a new machine. Clone/pull latest master — HEAD is 1d77b4d.

Repo layout (npm workspaces):

- apps/web — Vite + React web app, deployed to Vercel (sole production host). Needs VITE_SUPABASE_* env vars in Vercel for multiplayer/leaderboard to work.
- apps/native — Expo React Native port (SDK 54), actively in progress. See docs/project/REACT_NATIVE_PORT_PLAN.md and apps/native/AGENTS.md (which points to versioned Expo docs — check actual installed SDK version first).
- packages/engine — shared platform-agnostic game logic (bots, dictionary, scoring, gamestate).
- packages/theme — shared theme data.
- supabase/migrations — Postgres migrations for multiplayer/leaderboard.

Current state:

- Just merged origin/master into the native-port restructure (remote had a repo-wide Prettier pass + Vercel single-host cleanup + CI fixes).
- Latest commit is a WIP checkpoint mid-refactor: native sound system (src/utils/sound.ts, wav assets, scripts/generate-native-*-assets.cjs), useBossMusic hook + BossMonsterBackground, WordPathGraph moved into a shared context (web: src/contexts/WordPathGraphContext.tsx, native: src/providers/WordPathGraphProvider.tsx), plus two new Supabase migrations (record_challenge_result ambiguous-column fix, bot opponent fallback).

Verification commands:

- npm run test (web + engine + native)
- npm run lint, apps/web: npx tsc -b
- npm run typecheck:native
- CI runs on master push: ubuntu-24.04, Node 24 (.nvmrc), Playwright Chromium for Storybook tests. format:check is continue-on-error (known prettier drift in apps/web).

First thing to do: run the test suite to see where the WIP left off — the WordPathGraph context move and sound wiring may be incomplete.

---

## Loose ends worth knowing

- The migrations `supabase/migrations/20260826170000_fix_record_challenge_result_ambiguous_column.sql` and `20260826180000_bot_opponent_fallback.sql` aren't applied anywhere yet — run `supabase db push` or equivalent when ready.
- `apps/web` has known Prettier drift; `format:check` is intentionally non-blocking in CI until someone does a dedicated `prettier --write` pass.
