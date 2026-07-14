# WordPlay Project Audit & Cleanup Plan

_Generated from a full repo review + live verification (tests, tsc, eslint, vite build) on 2026-07-14._

This document has two parts:
1. **Findings** — what actually works, what's broken, and every organizational/duplication issue found.
2. **Cleanup Action Plan** — an ordered checklist we will execute one item at a time in separate sessions.

---

## 1. Findings

### 1.1 What Works (Verified)
- `npx vite build` **succeeds** — the app compiles and bundles fine (334 KB JS / 58 KB CSS). The React app itself is functional.
- `npm run dev` serves the game locally and it is playable (per user confirmation).
- Core engine logic (`packages/engine/scoring.ts`, `dictionary.ts`, `bot.ts`, `gamestate.ts`) has substantial test coverage and most engine-level tests pass.
- Storybook config exists and has some working stories.

### 1.2 What's Broken (Verified)
- **`npm run build` is broken.** The script is `tsc -b && vite build`. `tsc -b` currently fails with real type errors (not just lint-style unused vars), e.g. in `packages/engine/terminal-game.ts`:
  - `Property 'length' does not exist on type 'Set<string>'` (multiple locations, lines ~260-368) — code treats a `Set<string>` like an `Array`.
  - `src/stories/ThemeShowcase.stories.tsx` has real type errors (`Property 'default' does not exist...`, `Property 'letter' does not exist on type 'GridCellProps'`) — stale story file, out of sync with `GridCell` component API.
  - Dozens of `TS6133`/`TS6196` "declared but never used" errors across adapters, components, hooks, tests.
- **58 of 328 tests fail** (`npm test`), across 12 test files, including:
  - `src/hooks/__tests__/useVanityFilter.test.ts` — tests expect default filter ON, code defaults to OFF (feature/test drift).
  - `src/components/ui/__tests__/MainScreen.test.tsx` — `useVanityFilter must be used within a VanityFilterProvider` — test renders `Menu` without required provider wrapper.
  - `packages/engine/__tests__/unlocks.test.ts` — assertion mismatches on unlock result shape.
  - Terminal game tests also reported failing in prior notes (`test_resolution_plan.md`).
- **ESLint reports 152 errors / 16 warnings**, dominated by `no-unused-vars` and `no-explicit-any`, plus a Storybook renderer-package rule violation.
- Two stale docs claim the opposite of reality: `docs/TECHNICAL_DEBT.md` says "ALL TECHNICAL DEBT RESOLVED" and `test_resolution_plan.md` claims "194/207 tests passing (93.7%)" — both are outdated and misleading now.

### 1.3 Structural / Organizational Issues

**A. Duplicate/parallel engine adapter layers.** There are effectively three places implementing "adapters":
- `src/adapters/` (`browserAdapter.ts`, `nodeAdapter.ts`, `testAdapter.ts`, `webAdapter.ts`, `integration.test.ts`) — **this is the one actually used by the app.**
- `packages/adapters/browser/` (`challenge.ts`, `unlocks.ts`) — used by `src/hooks/useUnlocks.ts` only.
- `packages/adapters/node/unlocks.ts` and `packages/adapters/test/unlocks.ts` — **dead code, nothing imports them.**
- `src/adapters/webAdapter.ts` is a thin re-export shim of `browserAdapter.ts` with **no consumers anywhere** — dead code.

**B. No module aliasing / monorepo tooling.** `src` imports `packages/engine` and `packages/adapters` via long relative paths (`../../../packages/engine/interfaces`), even though `packages/` isn't a real workspace package (no `package.json` inside it, not referenced in root `package.json` workspaces). This is a "fake monorepo" layout that adds path-depth pain for no benefit — everything is really one app.

**C. Terminal-game runners: four different, overlapping ways to run the CLI game:**
- `npm run play` → `tsx packages/engine/terminal-game.ts` (this is the one that works today).
- `play-game.sh` (bash script, uses `ts-node`, not installed as a dependency).
- `play-game.js` (root, compiles TS to a `temp-build/` dir manually via `tsc`, then imports it).
- `packages/engine/play-terminal.js` (same idea, different implementation).
- Plus `packages/engine/terminal-demo.js` as yet another entry point.

**D. Debug/one-off scripts and their artifacts left in repo root**, not part of any documented workflow:
- `debug-pope-scoring.js` (broken — `require()`s a `.ts` file directly, won't run under Node).
- `debug-vanity-filter.js` (a manual browser-console paste script, not a Node script despite the `.js` extension).
- `analyze-key-letters.cjs`, `log-server.cjs` (spins up an Express server just to persist a debug counter to a text file).
- Generated/output artifacts committed to git: `key-letter-counts.txt`, `key-letter-export-2025-06-10.json`, `key-letter-stats.log`, `tsc_errors.txt`.
- `src/utils/keyLetterAnalyzer.ts` — a whole class for client-side stat analysis that **nothing imports**.

**E. Storybook boilerplate never customized.** `src/stories/Button.*`, `Header.*`, `Page.*` (+ CSS) are the default Storybook starter template, unrelated to WordPlay, alongside real stories (`ThemeShowcase`, `WordBuilder.stories.tsx`, `GridCell.stories.tsx`). The starter files should go; `ThemeShowcase.stories.tsx` is broken (see 1.2) and needs fixing or removal.

**F. Documentation sprawl (19 files in `docs/`, plus 4 more at repo root).** Heavy overlap and staleness:
- `docs/TECHNICAL_DEBT.md` and `test_resolution_plan.md` (root) are stale/contradicted by current test run — misleading if left as-is.
- `docs/TASK_PROGRESS.md`, `docs/IMPLEMENTATION_HISTORY.md`, `docs/CHANGELOG.md`, `docs/dev-plan.md` all appear to track project history/progress with unclear boundaries between them.
- `docs/QUICK_START.md` vs root `README.md` — overlapping "getting started" content.
- Root-level one-off reports: `profanity-extraction-report.md`, `word-data-extraction-report.md`, `test_resolution_plan.md` — read like historical scratch notes, not living docs, but sit at repo root next to source config.
- `docs/MIGRATION_TO_RENDER.md` vs `docs/DEPLOYMENT.md` vs `vercel.json` — unclear which deployment target (Render vs Vercel) is actually current.

**G. Root directory clutter.** Non-config, non-source items sitting at the top level make the project hard to navigate: `analyze-key-letters.cjs`, `debug-pope-scoring.js`, `debug-vanity-filter.js`, `key-letter-*.{txt,json,log}`, `log-server.cjs`, `play-game.js`, `play-game.sh`, `profanity-extraction-report.md`, `test_resolution_plan.md`, `tsc_errors.txt`, `word-data-extraction-report.md`, `screen_designs/` (design reference PNGs, 3.3 MB combined).

**H. Empty/near-empty directories tracked with no content shown:** `.cursor/`, `.storybook/` showed as 0 items in the directory listing tool (likely dotfile-only contents not shown by the listing, worth a quick manual check but flagged here for completeness).

**I. `dist/` committed or left on disk** at repo root — build output shouldn't be manually inspected/tracked; confirm it's gitignored.

**J. Test file location inconsistency.** Most tests live next to source (`Component.test.tsx`, `__tests__/` folders scattered per-directory), which is fine as a pattern, but it's inconsistently applied — some dirs have `__tests__/`, others put `.test.ts` next to the file directly, with no documented convention.

---

## 2. Cleanup Action Plan

Execute in order. Each step is scoped to be doable and verifiable independently. Re-run `npm test`, `npx eslint .`, and `npx tsc -b` after each code-affecting step.

1. **Baseline safety net**: confirm current `git status` is clean / commit any pending work, so cleanup steps are all independently revertible commits.
2. **Delete dead adapter code**: remove `packages/adapters/node/unlocks.ts`, `packages/adapters/test/unlocks.ts`, and `src/adapters/webAdapter.ts` (verify zero imports first, already confirmed for these three).
3. **Consolidate adapters into one location**: merge `packages/adapters/browser/*` into `src/adapters/` (or vice versa) so there is a single adapters directory instead of two. Update the ~3 import sites (`useUnlocks.ts`, `challenge` usage) accordingly.
4. **Remove Storybook boilerplate**: delete `src/stories/Button.*`, `Header.*`, `Page.*`, associated CSS, and unused generated assets under `src/stories/assets/`. Keep/fix `ThemeShowcase.stories.tsx`, `GridCell.stories.tsx`, `WordBuilder.stories.tsx`.
5. **Fix `ThemeShowcase.stories.tsx` type errors** (or delete it if the underlying `GridCell` API changed and it's no longer worth maintaining) so `tsc -b` stops failing on it.
6. **Fix `terminal-game.ts` Set/Array bug**: audit the type of the variable being treated as an array where it's actually a `Set<string>` and fix at the source (likely should be converted with `Array.from()` once, or the type should just be an array if index semantics are needed).
7. **Clear remaining `tsc -b` errors** (unused vars/params/imports) file-by-file until `npx tsc -b` is clean, so `npm run build` actually works end-to-end.
8. **Triage and fix failing tests** in batches:
   - `useVanityFilter` tests vs. actual default-filter behavior (decide correct behavior, then fix code or test).
   - `MainScreen.test.tsx` provider-wrapping issue.
   - `packages/engine/__tests__/unlocks.test.ts` assertion mismatches.
   - Any remaining failures surfaced by re-running `npm test` after the above.
9. **Address ESLint errors** in batches (unused vars first — often free deletions revealed by step 7; then `no-explicit-any` types one file at a time).
10. **Remove/relocate terminal game runner duplicates**: keep only `npm run play` (`tsx packages/engine/terminal-game.ts`). Delete `play-game.js`, `play-game.sh`, `packages/engine/play-terminal.js`. Decide fate of `terminal-demo.js` (merge useful bits into the real terminal game or delete).
11. **Remove one-off debug scripts and generated artifacts** from repo root: `debug-pope-scoring.js`, `debug-vanity-filter.js`, `analyze-key-letters.cjs`, `log-server.cjs`, `key-letter-counts.txt`, `key-letter-export-2025-06-10.json`, `key-letter-stats.log`, `tsc_errors.txt`. Add relevant patterns to `.gitignore` if any should be regenerable instead of committed.
12. **Remove unused `src/utils/keyLetterAnalyzer.ts`** (confirm no imports remain after step 11) or wire it up if the feature is actually wanted.
13. **Reorganize root-level markdown reports** (`profanity-extraction-report.md`, `word-data-extraction-report.md`, `test_resolution_plan.md`) — move into `docs/` under an explicit "historical/archive" subfolder, or delete if purely stale scratch notes superseded by this audit.
14. **Rewrite `docs/TECHNICAL_DEBT.md`** to reflect real, current debt (replacing the stale "all resolved" content), or fold its content into this audit file and delete it.
15. **Consolidate documentation set**: decide canonical homes for overlapping docs — e.g. merge `QUICK_START.md` content into `README.md` or vice versa; clarify whether `TASK_PROGRESS.md`, `IMPLEMENTATION_HISTORY.md`, `CHANGELOG.md`, `dev-plan.md` should be merged, archived, or kept distinct with a one-line purpose note at the top of each.
16. **Resolve deployment doc conflict**: confirm actual deployment target (Vercel per `vercel.json`, or Render per `docs/MIGRATION_TO_RENDER.md`) and delete/archive the doc for the unused platform.
17. **Decide on `packages/` vs `src/`-only layout**: either commit to the multi-package structure properly (add `package.json` + npm/pnpm workspaces, use TS path aliases to shorten imports), or fold `packages/engine` into `src/engine` and drop the pretense of a monorepo — pick one and apply consistently.
18. **Audit `screen_designs/`**: confirm these reference images are still needed in the repo (3.3 MB of PNGs); move to a design tool/Figma link or an `assets`/docs archive if only occasionally referenced.
19. **Verify `dist/` is gitignored** and not accidentally tracked; confirm `.gitignore` coverage for all build/test output (`node_modules`, `dist`, `temp-build`, coverage output, `.storybook` build output).
20. **Standardize test file placement convention** (e.g. always `__tests__/` sibling folder, or always co-located `*.test.ts`) and apply consistently across `src/` and `packages/engine/`.
21. **Final verification pass**: `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run build`, and a manual `npm run dev` smoke test — all green — then update `README.md` "Current Status" section to reflect true state.

---

_We will work through section 2 one numbered item at a time in upcoming sessions to keep each change reviewable and within context limits._
