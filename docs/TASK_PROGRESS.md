# Task Progress Tracking

This document tracks the progress of tasks from the development plan. Each task is marked with a checkbox that will be checked (✅) when the task is completed and merged.

## Phase 0 – Web Foundation & Tooling

- [x] 0.1 **Init Web Project** (React + TypeScript + Vite) ✅ **ALL REQUIREMENTS VERIFIED**

  - [x] Working `npm run dev` on all major browsers ✅ **VERIFIED** (Server runs HTTP 200, opened in Chrome/Firefox/Safari)
  - [x] ESLint + Prettier setup ✅ **VERIFIED** (ESLint: 0 errors, Prettier: all files formatted)
  - [x] TypeScript compilation working ✅ **VERIFIED** (npx tsc --noEmit passes)
  - [x] Web platform builds successfully ✅ **VERIFIED** (npm run build: 188KB bundle, 384ms)
  - [x] Modern development setup with hot reload ✅ **VERIFIED** (HMR active with timestamp updates)

- [x] 0.2 **Basic CI/CD** via GitHub Actions ✅ **ALL REQUIREMENTS VERIFIED**

  - [x] CI runs jest + eslint ✅ **VERIFIED** (ESLint: 0 errors, Tests: 6/6 passing with Vitest)
  - [x] Builds production bundle ✅ **VERIFIED** (Build: 188KB bundle in 369ms)
  - [x] CI passes on PR; production build deployable ✅ **VERIFIED** (GitHub Actions: Success status, 30s duration, 62.1KB artifacts)
  - [x] Automated testing and build verification ✅ **VERIFIED** (Complete pipeline: lint + format + TypeScript + tests + build)

- [x] 0.3 **Supabase Project Bootstrap** (SQL schema & RLS) ✅ **ALL REQUIREMENTS VERIFIED**

  - [x] Supabase client dependencies installation ✅ **VERIFIED** (@supabase/supabase-js@2.49.9, supabase@2.24.3)
  - [x] SQL schema creation with users, games, game_players, turns tables and RLS policies ✅ **VERIFIED** (4 tables created with complete schema)
  - [x] Environment variables configuration (.env.example) with Supabase settings ✅ **VERIFIED** (.env.example template and .env.local configured)
  - [x] Local Supabase environment setup ✅ **VERIFIED** (Local services running on ports 54321-54324)
  - [x] Database migration creation and application ✅ **VERIFIED** (Migration 20250603193744_init_game_schema.sql applied successfully)
  - [x] `supabase db diff` shows no schema differences ✅ **VERIFIED** ("No schema changes found")
  - [x] RLS policies implementation and testing ✅ **VERIFIED** (11 RLS policies across 4 tables, all tables have RLS enabled, Supabase client tests passing)

- [ ] 0.4 **Web Hosting Setup** (Vercel deployment) - INDIVIDUAL VERIFICATION REQUIRED
  - [ ] Automatic deployment from main branch
  - [ ] Live web app accessible at public URL
  - [ ] Environment variables configured for production

## Phase 1 – Core Game Engine (Cross-Platform)

- [ ] 1.1 **Word Validation Service**

  - Dictionary service with ENABLE word list and slang support
  - Word validation function with length checks (minimum 3 letters)
  - Character validation (alphabetic only, rejects numbers/symbols for humans)
  - Length change validation (max ±1 letter difference between turns)
  - Dictionary lookup integration (rejects unknown words)
  - Bot rule-breaking capabilities (bots can bypass validation rules)
  - Case insensitivity handling
  - Profanity filtering with appropriate word checking
  - Performance optimization targets
  - Jest unit tests for all validation scenarios

- [ ] 1.2 **Scoring Module**

  - Core scoring rules implementation (+1 point for add/remove/rearrange/key letter)
  - Letter addition/removal/rearrangement scoring at any position
  - Key letter bonus system (+1 for using new key letter)
  - Complex action combinations (multiple actions + key letter)
  - Score calculation for examples: CAT→CATS(1pt), CAT→COAT(1pt), CAT→BAT+key B(3pts)
  - Performance optimization
  - Edge case handling (empty actions, unused key letters)
  - Pure TypeScript module with comprehensive unit tests

- [ ] 1.3 **Bot AI v0 (Greedy)**

  - Greedy strategy implementation (chooses highest scoring legal moves)
  - Move generation for add/remove/rearrange operations
  - Key letter prioritization and bonus scoring integration
  - 100-turn simulation capability without crashes
  - Performance targets (average latency <50ms)
  - Bot privileges system (can make moves humans cannot)
  - Integration with scoring module and word validation system
  - Pure TypeScript module with comprehensive testing

- [ ] 1.4 **Local GameState Manager**
  - Complete game state management implementation
  - Word state management (setWord with string handling)
  - Key letters array management (add/remove operations)
  - Locked letters array management (add/remove operations)
  - Letter movement system (complex rearrangements)
  - Reset functionality and edge case handling
  - Performance optimization
  - Web-compatible state management solution (not Zustand)

## Phase 2 – Web UI Foundation

- [ ] 2.1 **React Component Library**

  - Reusable game components with TypeScript
  - Component design system for consistent UI
  - Storybook setup for component development
  - Proper TypeScript interfaces and props

- [ ] 2.2 **Alphabet Grid & Word Display**

  - Interactive letter grid with click/drag functionality
  - Word trail component showing game history
  - Visual feedback for letter states (normal/key/locked)
  - Responsive design for different screen sizes

- [ ] 2.3 **Single‑Player Web Game**

  - Complete offline game vs bot in browser
  - Game engine integration (validation, scoring, bot AI)
  - Full 10-turn game flow with score tracking
  - Winner determination and game completion

- [ ] 2.4 **Responsive Design**
  - Works on desktop browsers (Chrome, Firefox, Safari)
  - Works on mobile browsers (responsive layout)
  - Touch-friendly interface for mobile
  - Keyboard navigation for desktop

## Phase 3 – Online Multiplayer (Web)

- [ ] 3.1 **Auth Flow (Supabase EmailLink)**

  - `/auth` pages for signup/login
  - Session persistence in browser
  - User profile management
  - Signup/login works in browser

- [ ] 3.2 **Game CRUD API**

  - `supabase` RPC + hooks: create/join, list games
  - API tests return 200
  - RLS prevents cross‑access
  - Game matching and lobby system

- [ ] 3.3 **Realtime Turn Sync**

  - Subscriptions push opponent moves
  - 48‑h timer job for turn timeouts
  - Two browser tabs stay in sync under 1 s
  - Real-time game state synchronization

- [ ] 3.4 **Avatar & Score HUD**
  - Upload to Supabase Storage
  - Display in game UI
  - PNG uploads within 100 kB
  - User profile integration

## Phase 4 – Themes & Unlocks (Web)

- [ ] 4.1 **Unlock Framework**

  - Server table + client hook
  - Feature flag per unlock
  - Unit: unlock fires when word == "BROWN"
  - Achievement system integration

- [ ] 4.2 **Theme Provider + Brown Theme**

  - Context to swap colors
  - Toggle in settings menu
  - Selecting theme re‑paints grid instantly
  - Theme persistence across sessions

- [ ] 4.3 **Six‑Letter Attribute**
  - Config to set initial word length 6
  - New game w/ attribute starts with 6‑letter seed
  - Game difficulty variations

## Phase 5 – Web Polish & Accessibility

- [ ] 5.1 **Colour‑blind Palettes**

  - Two alt palettes w/ settings toggle
  - WCAG contrast compliance
  - Accessibility testing tools integration

- [ ] 5.2 **Web Audio & Haptics**

  - Click sounds for game actions
  - Vibration API for mobile browsers
  - Audio settings and preferences

- [ ] 5.3 **E2E Web Testing**
  - Playwright tests covering full game flow
  - CI tests pass on Chrome, Firefox, Safari
  - Automated regression testing

## Phase 6 – Web Release Prep

- [ ] 6.1 **PWA Features**

  - Service worker for offline play
  - App install prompt for mobile
  - Offline game functionality
  - Progressive web app manifest

- [ ] 6.2 **Web Performance Optimization**

  - Bundle size < 1MB
  - Loading time < 3s
  - Lighthouse score > 90 on all metrics
  - Code splitting and lazy loading

- [ ] 6.3 **Analytics Integration**

  - PostHog events: session_start, turn_commit, unlock
  - Dashboard shows live web events
  - User behavior tracking
  - Performance monitoring

- [ ] 6.4 **Production Launch**
  - Custom domain setup
  - Error tracking and monitoring
  - Web game live at production URL
  - Launch readiness checklist

## Phase 7 – Monetization & Live‑Ops (Web)

- [ ] 7.1 **Web Payment Integration**

  - Stripe/PayPal for theme purchases
  - Sandbox purchase testing
  - Payment flow integration
  - Purchase restoration system

- [ ] 7.2 **Global Leaderboard**

  - Supabase function ranking by ELO
  - Top‑100 endpoint returns ≤ 200 ms
  - Leaderboard UI integration
  - Competitive ranking system

- [ ] 7.3 **Admin Dashboard**
  - Moderation tools for content
  - User management system
  - Analytics and reporting
  - Content management interface

## Phase 8 – Native Mobile Expansion (After Web Success)

- [ ] 8.1 **React Native Setup**

  - Expo/RN app using shared game engine
  - Native app boots with web game logic
  - Cross-platform code sharing
  - Development environment setup

- [ ] 8.2 **Native UI Adaptation**

  - Platform-specific components and navigation
  - Native feel while using same game engine
  - iOS and Android design guidelines
  - Native performance optimization

- [ ] 8.3 **App Store Optimization**

  - Icons, screenshots, store listings
  - Apps pass review on Google Play and App Store
  - Marketing materials and descriptions
  - Store submission process

- [ ] 8.4 **Native-Specific Features**
  - Push notifications for turn reminders
  - Native sharing functionality
  - Device-specific optimizations
  - Platform-specific integrations

---

## 📝 Notes

**Current State**: Fresh start - no code implemented yet. All tasks are ready to begin from scratch.

**Strategy**: Web-first development with shared TypeScript game engine that can later be used for native mobile apps.
