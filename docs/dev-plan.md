# Word‑Game Rebuild – **Cursor‑Ready Development Plan** (v2.0)

> **Purpose** Serve as a _single source of truth_ for Cursor's automated development workflow. The document embeds **context**, a **chronological task breakdown**, and explicit **checkpoints** so you (the human reviewer) can validate progress after every step. Cursor should treat each task as an atomic pull‑request that must pass the listed checklist before moving forward.

---

## 📜 Context Snapshot (keep in memory)

1. **Game** – Two‑player, turn‑based word‑building duel (see rules in Appendix A).
2. **Target Platforms** – **Web first** (desktop browsers, mobile browsers), **Native apps second** (Android, iOS after web proven).
3. **MVP Scope** – Web-based offline vs Bot + 1‑v‑1 async multiplayer with key/locked letters, basic scoring, and color named themes to unlock.
4. **Tech Stack** – **React + TypeScript + Vite** (web), **Shared game engine** (pure TypeScript), **Supabase backend**, **Future: React Native** (native apps after web success)
5. **Architecture Keyword** – _"ShipHipV2"_ ← Cursor should include this word in every PR title to guarantee thread continuity.

_When Cursor is unsure about a requirement it \***\*must\*\*** halt and request clarification rather than assuming._

---

## 🛠️ Development Workflow Guidelines

| #   | Rule for Cursor                                                                           | Rationale                     |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Follow tasks **in listed order**; do **not** skip.                                        | Prevent dependency breaks.    |
| 2   | After completing a task, run its **Checkpoint** tests (unit/E2E).                         | Ensures quality gate.         |
| 3   | Open a PR titled `ShipHipV2: <Task Name>` containing only the files touched by that task. | Traceability + context token. |
| 4   | Await human approval **before** starting the next task.                                   | Allows manual validation.     |
| 5   | Update `/docs/CHANGELOG.md` with a one‑line entry per task.                               | Audit trail.                  |

Cursor should maintain a running TODO list in `/docs/TASK_PROGRESS.md`, marking each task `✅` when merged.

---

## 📅 Chronological Task List w/ Checkpoints

### Phase 0 – Web Foundation & Tooling

| ID  | Task                                              | Deliverable                                                          | Checkpoint (human validates…)                         |
| --- | ------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| 0.1 | **Init Web Project** (React + TypeScript + Vite)  | Working `npm run dev` on all major browsers; ESLint + Prettier setup | App boots to blank screen in Chrome, Firefox, Safari. |
| 0.2 | **Basic CI/CD** via GitHub Actions                | CI runs jest + eslint; builds production bundle                      | CI passes on PR; production build deployable.         |
| 0.3 | **Supabase Project Bootstrap** (SQL schema & RLS) | `supabase/` migrations, local .env.sample                            | `supabase db diff` shows no pending migrations.       |
| 0.4 | **Web Hosting Setup** (Vercel deployment)         | Automatic deployment from main branch                                | Live web app accessible at public URL.                |

### Phase 1 – Core Game Engine (Cross-Platform)

| ID  | Task                        | Deliverable                                                         | Checkpoint                                                                  |
| --- | --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1.1 | **Word Validation Service** | `packages/engine/dictionary.ts` w/ ENABLE+slang+filter merge script | Jest: `validateWord('BRUH') === true`; bad‑word replaced w/ censor symbols. |
| 1.2 | **Scoring Module**          | Pure‑fn `scoreTurn(prevWord, newWord, actionsUsed, keyUsed)`        | Unit tests for examples in Appendix A all pass.                             |
| 1.3 | **Bot AI v0 (Greedy)**      | `packages/ai/bot.ts` choosing highest scoring legal move            | Simulate 100 turns w/out crash; average latency <50 ms.                     |
| 1.4 | **Local GameState Manager** | State management for words, key/locked letters                      | Jest: state manager passes add/remove/move scenarios.                       |

### Phase 2 – Web UI Foundation

| 2.1 | **React Component Library** | Reusable game components with TypeScript | Storybook: displays normal/key/locked letters. |
| 2.2 | **Alphabet Grid & Word Display** | Interactive letter grid and word trail | UI responds to clicks, shows game state. |
| 2.3 | **Single‑Player Web Game** | Complete offline game vs bot | Human can play and finish 10-turn game in browser. |
| 2.4 | **Responsive Design** | Works on desktop and mobile browsers | Game playable on phone browsers and desktop. |

### Phase 3 – Online Multiplayer (Web)

| 3.1 | **Auth Flow (Supabase EmailLink)** | `/auth` pages, session persistence | Signup/login works in browser. |
| 3.2 | **Game CRUD API** | `supabase` RPC + hooks: create/join, list games | API tests return 200; RLS prevents cross‑access. |
| 3.3 | **Realtime Turn Sync** | Subscriptions push opponent moves; 48‑h timer job | Two browser tabs stay in sync under 1 s. |
| 3.4 | **Avatar & Score HUD** | Upload to Supabase Storage; display top‑corners | PNG uploads within 100 kB; shows in game. |

### Phase 4 – Themes & Unlocks (Web)

| 4.1 | **Unlock Framework** | Server table + client hook, feature flag per unlock | Unit: unlock fires when word == "BROWN". |
| 4.2 | **Theme Provider + Brown Theme** | Context to swap colors; toggle in menu | Selecting theme re‑paints grid instantly. |
| 4.3 | **Six‑Letter Attribute** | Config to set initial word length 6 | New game w/ attribute starts with 6‑letter seed. |

### Phase 5 – Web Polish & Accessibility

| 5.1 | **Colour‑blind Palettes** | Two alt palettes w/ settings toggle | Sim Daltonism test passes WCAG contrast. |
| 5.2 | **Web Audio & Haptics** | Click sounds + vibration API for mobile browsers | Audio plays on moves; mobile browsers vibrate. |
| 5.3 | **E2E Web Testing** | Playwright tests covering full game flow | CI tests pass on Chrome, Firefox, Safari. |

### Phase 6 – Web Release Prep

| 6.1 | **PWA Features** | Service worker, offline play, install prompt | Game works offline; can be "installed" on mobile. |
| 6.2 | **Web Performance Optimization** | Bundle size < 1MB, loading < 3s | Lighthouse score > 90 on all metrics. |
| 6.3 | **Analytics Integration** | PostHog events: session_start, turn_commit, unlock | Dashboard shows live web events. |
| 6.4 | **Production Launch** | Custom domain, monitoring, error tracking | Web game live at production URL. |

### Phase 7 – Monetization & Live‑Ops (Web)

| 7.1 | **Web Payment Integration** | Stripe/PayPal for theme purchases | Sandbox purchase completes; restores properly. |
| 7.2 | **Global Leaderboard** | Supabase function ranking by ELO | Top‑100 endpoint returns ≤ 200 ms. |
| 7.3 | **Admin Dashboard** | Moderation tools, user management | Admin can manage users and content. |

### Phase 8 – Native Mobile Expansion (After Web Success)

| 8.1 | **React Native Setup** | Expo/RN app using shared game engine | Native app boots with web game logic. |
| 8.2 | **Native UI Adaptation** | Platform-specific components and navigation | Native feel while using same game engine. |
| 8.3 | **App Store Optimization** | Icons, screenshots, store listings | Apps pass review on Google Play and App Store. |
| 8.4 | **Native-Specific Features** | Push notifications, native sharing | Features that enhance mobile experience. |

---

## 🧩 Mechanism to Keep Cursor On Track

- Cursor _must_ reference `docs/TASK_PROGRESS.md` at the start of every run. If a task is incomplete, resume; if completed, proceed to the next.
- Cursor should read **only** the relevant spec sections to minimize token usage.
- If external clarification is required, open an issue titled `ShipHipV2: Clarification Needed – <topic>`.
- Cursor should tag commits with Conventional Commits (`feat:`, `fix:`, `chore:`) for semantic‑release auto‑versioning.

---

## 📂 Appendix A – Quick‑Ref Rules (for tests)

- **Actions per turn:** ≤1 Add, ≤1 Remove, ≤1 Move (swap counts as Add+Remove but no move).
- **Key Letter Bonus:** +1 pt if key letter present.
- **Locked Letter:** prev key letter; cannot be removed in next turn only.
- **Score Target:** 100 pts default.
- **Turn Timeout:** 48 h.

## 🎨 Appendix B – Visual Design Reference (v0.1)

> **Goal:** Provide concrete UI/UX guidelines so Cursor (and human developers) can implement screens that match the legacy iOS look‑and‑feel without pixel‑perfect mocks. **Now optimized for web-first with responsive design.**

### 1 Layout Anatomy (Responsive Design)

**Desktop (1024px+)**

```
┌─────────────────────────────────────────┐
│  ╭──── Word Trail (HStack)─────────────╮│  ← previous words, small caps
│  │ PLAY • LAPS • SLIP • SLIPS • ...   ││
│  ╰─────────────────────────────────────╯│
│                                         │  ↓ 24 px gap
│         SHIP<span key>H</span>          │  ← Current Word, 48 pt
│                                         │
│    [ − ] [ ＋ ] [ ✓ ] [Score: 2 + 1]    │  ← Action bar, 40 px buttons
│                                         │  ↓ 32 px gap
│     5 × 6 Letter Grid (A‑Z)             │  ← 56 × 56 px cells, 6 px gap
│                                         │
│    ←   ↺   ?   ≡                       │  ← Footer icons, 32 px
└─────────────────────────────────────────┘
```

**Mobile (320px-768px)**

```
┌─────────────────────────────┐
│  ╭─ Word Trail (wrap)──────╮│
│  │ PLAY • LAPS • SLIP •   ││
│  │ SLIPS • ...            ││
│  ╰───────────────────────╯│
│                             │  ↓ 16 px gap
│        SHIP<span>H</span>   │  ← Current Word, 36 pt
│                             │
│  [ − ] [ ＋ ] [ ✓ ] [2+1]   │  ← Compact buttons, 32 px
│                             │  ↓ 20 px gap
│   5 × 6 Letter Grid         │  ← 40 × 40 px cells, 3 px gap
│                             │
│   ←   ↺   ?   ≡             │  ← Footer icons, 24 px
└─────────────────────────────┘
```

### 2 Colour Palette (`oklch` → hex fallback)

| Token        | oklch                     | HEX       | Usage                 |
| ------------ | ------------------------- | --------- | --------------------- |
| `--c-bg`     | `oklch(1 0 0)`            | `#FFFFFF` | App background        |
| `--c-text`   | `oklch(0.14 0.005 285.8)` | `#252D4A` | Primary text          |
| `--c-accent` | `oklch(0.21 0.006 285.9)` | `#0063FF` | Key letters, buttons  |
| `--c-muted`  | `oklch(0.35 0.01 285.9)`  | `#7C8AAC` | Secondary text/icons  |
| `--c-lock`   | `oklch(0.50 0.04 35)`     | `#C38A04` | Locked‑letter padlock |

`c-accent` operates at 90 % opacity for hover/press states.

### 3 Typography (Responsive)

| Element      | Font            | Weight | Desktop Size | Mobile Size |
| ------------ | --------------- | ------ | ------------ | ----------- |
| Current Word | Inter           | 700    | 48 pt        | 36 pt       |
| Word Trail   | Inter Condensed | 600    | 18 pt        | 14 pt       |
| Buttons      | Inter           | 500    | 16 pt        | 14 pt       |

### 4 Icons (Web Optimized)

| Name    | Meaning       | Web Icon (Lucide) | Hover State |
| ------- | ------------- | ----------------- | ----------- |
| Back    | Leave game    | `arrow-left`      | Scale 1.1x  |
| Undo    | Revert move   | `rotate-ccw`      | Rotate 15°  |
| Help    | Rules modal   | `help-circle`     | Pulse       |
| Menu    | Settings      | `menu`            | Fade 0.8    |
| Remove  | Minus         | `minus-square`    | Scale 0.9x  |
| Add     | Plus          | `plus-square`     | Scale 1.1x  |
| Submit  | Confirm       | `check-circle`    | Bounce      |
| Padlock | Locked letter | `lock`            | Shake       |

All icons with CSS hover animations, 1.5× stroke width.

### 5 Component Behaviour Notes (Web-Specific)

1. **Letter Grid Cell States**
   _Normal_ → `cursor: pointer`, hover shows border
   _Selected_ → white letter on `c-accent`, `cursor: grab`
   _Key Letter_ → `c-accent` border + glow effect
   _Locked_ → `cursor: not-allowed` + `c-lock` badge
2. **Responsive** – Grid scales from 40px (mobile) to 56px (desktop)
3. **Web Animations** – CSS transitions, hover effects, focus states
4. **Accessibility** – Keyboard navigation, screen reader support, WCAG AA

_Sample Test Case_

```ts
expect(scoreTurn('SHIP', 'HIPS', { move: true }, true)).toBe(2);
```

_For the automated rule set Cursor follows, see **.cursor/rules/wordgame-gpt-rules.mdc**._

### End of File – keep this doc immutable except through explicit human edits.
