# Word‑Game Rebuild – **Cursor‑Ready Development Plan** (v1.0)

> **Purpose**  Serve as a *single source of truth* for Cursor’s automated development workflow. The document embeds **context**, a **chronological task breakdown**, and explicit **checkpoints** so you (the human reviewer) can validate progress after every step.  Cursor should treat each task as an atomic pull‑request that must pass the listed checklist before moving forward.

---

## 📜 Context Snapshot (keep in memory)

1. **Game** – Two‑player, turn‑based word‑building duel (see rules in Appendix A).
2. **Target Platforms** – iOS, Android, Web (shared RN/Expo codebase).
3. **MVP Scope** – Offline vs Bot + 1‑v‑1 async multiplayer with key/locked letters, basic scoring, and color named themes to unlock.
4. **Tech Stack** – React‑Native (Expo, TypeScript), Supabase (Postgres, Realtime, Auth), SQLite dictionary on device, PostHog analytics.
5. **Architecture Keyword** – *“ShipHip”*  ← Cursor should include this word in every PR title to guarantee thread continuity.

*When Cursor is unsure about a requirement it ****must**** halt and request clarification rather than assuming.*

---

## 🛠️ Development Workflow Guidelines

| # | Rule for Cursor                                                                         | Rationale                     |
| - | --------------------------------------------------------------------------------------- | ----------------------------- |
| 1 | Follow tasks **in listed order**; do **not** skip.                                      | Prevent dependency breaks.    |
| 2 | After completing a task, run its **Checkpoint** tests (unit/E2E).                       | Ensures quality gate.         |
| 3 | Open a PR titled `ShipHip: <Task Name>` containing only the files touched by that task. | Traceability + context token. |
| 4 | Await human approval **before** starting the next task.                                 | Allows manual validation.     |
| 5 | Update `/docs/CHANGELOG.md` with a one‑line entry per task.                             | Audit trail.                  |

Cursor should maintain a running TODO list in `/docs/TASK_PROGRESS.md`, marking each task `✅` when merged.

---

## 📅 Chronological Task List w/ Checkpoints

### Phase 0 – Repo & Tooling

|  ID  | Task                                              | Deliverable                                                     | Checkpoint (human validates…)                   |
| ---- | ------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
|  0.1 | **Init Monorepo** (Expo managed workflow w/ TS)   | Working `expo start` on iOS & Android sims; husky + lint‑staged | App boots to blank screen on both emulators.    |
|  0.2 | **Basic CI/CD** via GitHub Actions + EAS          | CI runs jest + eslint; EAS builds dev .apk / .ipa               | CI passes on PR; artifacts downloadable.        |
|  0.3 | **Supabase Project Bootstrap** (SQL schema & RLS) | `supabase/` migrations, local .env.sample                       | `supabase db diff` shows no pending migrations. |

### Phase 1 – Core Game Engine (Offline)

|  ID  | Task                        | Deliverable                                                         | Checkpoint                                                                  |
| ---- | --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
|  1.1 | **Word Validation Service** | `packages/engine/dictionary.ts` w/ ENABLE+slang+filter merge script | Jest: `validateWord('BRUH') === true`; bad‑word replaced w/ censor symbols. |
|  1.2 | **Scoring Module**          | Pure‑fn `scoreTurn(prevWord, newWord, actionsUsed, keyUsed)`        | Unit tests for examples in Appendix A all pass.                             |
|  1.3 | **Bot AI v0 (Greedy)**      | `packages/ai/bot.ts` choosing highest scoring legal move            | Simulate 100 turns w/out crash; average latency <50 ms.                     |
|  1.4 | **Local GameState Reducer** | Zustand slice managing words, key/locked letters                    | Jest: reducer passes add/remove/move scenarios.                             |

### Phase 2 – UI Foundation

| 2.1 | **Alphabet Grid Component** | Reanimated draggable 5×6 grid w/ color states | Storybook: displays normal/key/locked letters. |
| 2.2 | **Word Trail & Action Bar** | Components with dummy props, no backend | UI snapshot tests stable. |
| 2.3 | **Single‑Player Screen** wiring engine + UI | Can finish a 10‑turn bot game offline | Human plays & sees scores updating. |

### Phase 3 – Online Multiplayer

| 3.1 | **Auth Flow (Supabase EmailLink)** | `/auth` screens, session persistence | Signup/login works on device. |
| 3.2 | **Game CRUD API** | `supabase` RPC + hooks: create/join, list games | Postman returns 200; RLS prevents cross‑access. |
| 3.3 | **Realtime Turn Sync** | Subscriptions push opponent moves; 48‑h timer job | Two devices stay in sync under 1 s. |
| 3.4 | **Avatar & Score HUD** | Upload to Supabase Storage; display top‑corners | PNG uploads within 100 kB; shows in game. |

### Phase 4 – Themes & Unlocks

| 4.1 | **Unlock Framework** | Server table + client hook, feature flag per unlock | Unit: unlock fires when word == "BROWN". |
| 4.2 | **Theme Provider + Brown Theme** | Context to swap colors; toggle in menu | Selecting theme re‑paints grid instantly. |
| 4.3 | **Six‑Letter Attribute** | Config to set initial word length 6 | New game w/ attribute starts with 6‑letter seed. |

### Phase 5 – Polish & Accessibility

| 5.1 | **Colour‑blind Palettes** | Two alt palettes w/ settings toggle | Sim Daltonism test passes WCAG contrast. |
| 5.2 | **Haptics & Sounds** | Expo Haptics + simple click/confirm SFX | Device vibrates on score commit. |
| 5.3 | **E2E Detox Suite** | Cover full bot game & online game | CI Detox run green on both OSes. |

### Phase 6 – Release Prep

| 6.1 | **App Store Assets** | Icons, screenshots, privacy policy | Xcode validates assets; gp play listing passes. |
| 6.2 | **PostHog Analytics Hooks** | Events: session\_start, turn\_commit, unlock | Dashboard shows live events. |
| 6.3 | **Soft Launch Build** | TestFlight + Internal Play track | <3% crash rate in Firebase Crashlytics. |

### Phase 7 – Monetization & Live‑Ops

| 7.1 | **Apple Arcade Submission Docs** | Compliance checklist, game centre hooks | Archive uploaded; passes Transporter validation. |
| 7.2 | **Fallback IAP Storefront** | Remove ads IAP; theme bundles | Sandbox purchase completes; restores properly. |
| 7.3 | **Global Leaderboard** | Supabase function ranking by ELO | Top‑100 endpoint returns ≤ 200 ms. |

---

## 🧩 Mechanism to Keep Cursor On Track

* Cursor *must* reference `docs/TASK_PROGRESS.md` at the start of every run.  If a task is incomplete, resume; if completed, proceed to the next.
* Cursor should read **only** the relevant spec sections to minimize token usage.
* If external clarification is required, open an issue titled `ShipHip: Clarification Needed – <topic>`.
* Cursor should tag commits with Conventional Commits (`feat:`, `fix:`, `chore:`) for semantic‑release auto‑versioning.

---

## 📂 Appendix A – Quick‑Ref Rules (for tests)

* **Actions per turn:** ≤1 Add, ≤1 Remove, ≤1 Move (swap counts as Add+Remove but no move).
* **Key Letter Bonus:** +1 pt if key letter present.
* **Locked Letter:** prev key letter; cannot be removed in next turn only.
* **Score Target:** 100 pts default.
* **Turn Timeout:** 48 h.

## 🎨 Appendix B – Visual Design Reference (v0.1)

> **Goal:** Provide concrete UI/UX guidelines so Cursor (and human developers) can implement screens that match the legacy iOS look‑and‑feel without pixel‑perfect mocks.

### 1  Layout Anatomy (Phone Portrait)

```
┌─────────────────────────────┐  ↑  top‑safe‑area (status bar)
│           (spacer)          │
│  ╭──── Word Trail (HStack)─╮│  ← previous words, small caps
│  │ PLAY • LAPS • SLIP • … ││
│  ╰─────────────────────────╯│
│                             │  ↓ 16 px gap
│        SHIP<span key>H</span>        │  ← Current Word, 40‑48 pt,
│                             │     letter‑spacing 1 px
│   [ − ] [ ＋ ] [ ✓ ] [2 + 1] │  ← Action bar (icon buttons 36 px)
│                             │  ↓ 24 px gap
│  5 × 6 Letter Grid (A‑Z)    │
│                             │  ↑ each cell 48 × 48, 4 px gap
│   ←   ↺   ?   ≡             │  ← Footer icon bar (28 px line‑icons)
└─────────────────────────────┘
```

### 2  Colour Palette  (`oklch` → hex fallback)

| Token        | oklch                     | HEX       | Usage                 |
| ------------ | ------------------------- | --------- | --------------------- |
| `--c-bg`     | `oklch(1 0 0)`            | `#FFFFFF` | App background        |
| `--c-text`   | `oklch(0.14 0.005 285.8)` | `#252D4A` | Primary text          |
| `--c-accent` | `oklch(0.21 0.006 285.9)` | `#0063FF` | Key letters, buttons  |
| `--c-muted`  | `oklch(0.35 0.01 285.9)`  | `#7C8AAC` | Secondary text/icons  |
| `--c-lock`   | `oklch(0.50 0.04 35)`     | `#C38A04` | Locked‑letter padlock |

`c-accent` operates at 90 % opacity for hover/press states.

### 3  Typography

| Element      | Font            | Weight | Size                     |
| ------------ | --------------- | ------ | ------------------------ |
| Current Word | Inter           | 700    | 40 pt (fits \~6 letters) |
| Word Trail   | Inter Condensed | 600    | 16 pt                    |
| Buttons      | Inter           | 500    | 14 pt                    |

### 4  Icons

| Name    | Meaning       | Suggested (Lucide) Icon |
| ------- | ------------- | ----------------------- |
| Back    | Leave game    | `arrow-left`            |
| Undo    | Revert move   | `rotate-ccw`            |
| Help    | Rules modal   | `help-circle`           |
| Menu    | Settings      | `menu`                  |
| Remove  | Minus         | `minus-square`          |
| Add     | Plus          | `plus-square`           |
| Submit  | Confirm       | `check-circle`          |
| Padlock | Locked letter | `lock` (12 px, accent)  |

All icons 1.5× stroke width, `c-muted` fill; turn `c-accent` when active.

### 5  Component Behaviour Notes

1. **Letter Grid Cell States**
   *Normal* → dark‑teal text on white hover `c-muted` border.
   *Selected* → white letter on `c-accent` background.
   *Key Letter* → `c-accent` border + light‑blue fill (20 % α).
   *Locked* → `c-lock` badge top‑right.
2. **Responsive** – On tablets, grid grows to 64 px cells; word size 48 pt.  Web desktop centers board at 560 px.
3. **Animation** – Reanimate: fade‑in selected letters; spring swap on move.
4. **Haptics** – Light impact on letter tap; medium on word submit.


*Sample Test Case*

```ts
expect(scoreTurn('SHIP', 'HIPS', {move:true}, true)).toBe(2);
```

_For the automated rule set Cursor follows, see **.cursor/rules/wordgame-gpt-rules.mdc**._

### End of File – keep this doc immutable except through explicit human edits.