# Task Progress Tracking

This document tracks the progress of tasks from the development plan. Each task is marked with a checkbox that will be checked (✅) when the task is completed and merged.

## Phase 0 – Repo & Tooling

- [✅] 0.1 **Init Monorepo** (Expo managed workflow w/ TS)
  - Working `expo start` on iOS & Android sims
  - husky + lint-staged setup
  - App boots to blank screen on both emulators

- [✅] 0.2 **Basic CI/CD** via GitHub Actions + EAS
  - CI runs jest + eslint
  - EAS builds dev .apk / .ipa
  - CI passes on PR; artifacts downloadable

- [✅] 0.3 **Supabase Project Bootstrap** (SQL schema & RLS)
  - `supabase/` migrations
  - local .env.sample
  - `supabase db diff` shows no pending migrations

## Phase 1 – Core Game Engine (Offline)

- [✅] 1.1 **Word Validation Service**
  - Implemented dictionary service with common and slang word support
  - Added word validation function with length and character checks
  - Added bot support with rule-breaking capabilities
  - Implemented display mechanics for bad words and leetspeak numbers
  - Added comprehensive test suite for validation rules

- [✅] 1.2 **Scoring Module**
  - Implemented core scoring rules:
    - +1 point for adding a letter (any position)
    - +1 point for removing a letter (any position)
    - +1 point for rearranging letters to form a new word
    - +1 point for using the key letter (must be a new letter not in original word)
  - Added comprehensive test suite covering:
    - Letter addition/removal at different positions
    - Letter rearrangement
    - Key letter bonus with various actions
    - Multiple action combinations
  - Examples implemented:
    - "CAT" → "CATS" (+1 for adding 'S')
    - "CAT" → "COAT" (+1 for adding 'O')
    - "CAT" → "BAT" with key 'B' (+1 for removing 'C', +1 for adding 'B', +1 for key letter)
    - "CAT" → "TACE" with key 'E' (+1 for rearranging, +1 for adding 'E', +1 for key letter)

- [✅] 1.3 **Bot AI v0 (Greedy)**
  - `packages/ai/bot.ts` choosing highest scoring legal move
  - Simulate 100 turns w/out crash
  - average latency <50 ms

- [✅] 1.4 **Local GameState Reducer**
  - Zustand slice managing words, key/locked letters
  - Jest: reducer passes add/remove/move scenarios

- [ ] 1.5 **Integrate Full Dictionary Word List**
  - Download and preprocess ENABLE or similar comprehensive word list
  - Load word list into engine at build/runtime
  - Add admin/community process for slang and custom words
  - Update tests to use real dictionary data

## Phase 2 – UI Foundation

- [ ] 2.1 **Alphabet Grid Component**
  - Reanimated draggable 5×6 grid w/ color states
  - Storybook: displays normal/key/locked letters

- [ ] 2.2 **Word Trail & Action Bar**
  - Components with dummy props, no backend
  - UI snapshot tests stable

- [ ] 2.3 **Single-Player Screen**
  - wiring engine + UI
  - Can finish a 10-turn bot game offline
  - Human plays & sees scores updating

## Phase 3 – Online Multiplayer

- [ ] 3.1 **Auth Flow (Supabase EmailLink)**
  - `/auth` screens, session persistence
  - Signup/login works on device

- [ ] 3.2 **Game CRUD API**
  - `supabase` RPC + hooks: create/join, list games
  - Postman returns 200
  - RLS prevents cross-access

- [ ] 3.3 **Realtime Turn Sync**
  - Subscriptions push opponent moves
  - 48-h timer job
  - Two devices stay in sync under 1 s

- [ ] 3.4 **Avatar & Score HUD**
  - Upload to Supabase Storage
  - display top-corners
  - PNG uploads within 100 kB
  - shows in game

## Phase 4 – Themes & Unlocks

- [ ] 4.1 **Unlock Framework**
  - Server table + client hook
  - feature flag per unlock
  - Unit: unlock fires when word == "BROWN"

- [ ] 4.2 **Theme Provider + Brown Theme**
  - Context to swap colors
  - toggle in menu
  - Selecting theme re-paints grid instantly

- [ ] 4.3 **Six-Letter Attribute**
  - Config to set initial word length 6
  - New game w/ attribute starts with 6-letter seed

## Phase 5 – Polish & Accessibility

- [ ] 5.1 **Colour-blind Palettes**
  - Two alt palettes w/ settings toggle
  - Sim Daltonism test passes WCAG contrast

- [ ] 5.2 **Haptics & Sounds**
  - Expo Haptics + simple click/confirm SFX
  - Device vibrates on score commit

- [ ] 5.3 **E2E Detox Suite**
  - Cover full bot game & online game
  - CI Detox run green on both OSes

## Phase 6 – Release Prep

- [ ] 6.1 **App Store Assets**
  - Icons, screenshots, privacy policy
  - Xcode validates assets
  - gp play listing passes

- [ ] 6.2 **PostHog Analytics Hooks**
  - Events: session_start, turn_commit, unlock
  - Dashboard shows live events

- [ ] 6.3 **Soft Launch Build**
  - TestFlight + Internal Play track
  - <3% crash rate in Firebase Crashlytics

## Phase 7 – Monetization & Live-Ops

- [ ] 7.1 **Apple Arcade Submission Docs**
  - Compliance checklist
  - game centre hooks
  - Archive uploaded
  - passes Transporter validation

- [ ] 7.2 **Fallback IAP Storefront**
  - Remove ads IAP
  - theme bundles
  - Sandbox purchase completes
  - restores properly

- [ ] 7.3 **Global Leaderboard**
  - Supabase function ranking by ELO
  - Top-100 endpoint returns ≤ 200 ms 