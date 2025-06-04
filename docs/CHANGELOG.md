# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Task 0.1**: Initial web project setup with React 19, TypeScript, and Vite ✅ **VERIFIED**
  - Working development server with hot reload (verified on localhost:5173)
  - ESLint and Prettier integration for code quality (verified: 0 errors)
  - TypeScript compilation with strict mode (verified: builds successfully)
  - Production build pipeline (verified: 188KB bundle)
  - Modern development tooling setup (verified: all scripts working)
  - **Testing Framework**: Vitest with React Testing Library (6/6 tests passing)
  - **Verification Commands**: `npm run lint && npm run format:check && npm run build && npm test`

- **Task 0.2**: GitHub Actions CI/CD Pipeline ✅ **VERIFIED**
  - Automated ESLint and testing on push/PR (verified: 0 errors, 6/6 tests pass)
  - Production build automation (verified: 62.1KB artifacts generated)
  - CI execution in 30s with Ubuntu runner (verified: GitHub Actions success)
  - Complete verification pipeline: lint + format + TypeScript + tests + build
  - **Verification Evidence**: GitHub Actions workflow #7 - Status: Success

- **Task 0.3**: Supabase Project Bootstrap with SQL Schema & RLS ✅ **VERIFIED**
  - Supabase client dependencies (@supabase/supabase-js@2.49.9, supabase@2.24.3)
  - Complete SQL schema with 4 tables: users, games, game_players, turns
  - Row Level Security (RLS) with 11 policies across all tables
  - Local Supabase environment running on ports 54321-54324
  - Database migration system with init_game_schema.sql
  - TypeScript client with comprehensive database types
  - Environment configuration (.env.example template, .env.local)
  - **Testing**: Supabase client connection verified (9/9 tests passing)
  - **Verification Commands**: `supabase db diff && npm test && npm run lint && npm run build`

- **Task 0.4**: Web Hosting Setup with Vercel Deployment ✅ **VERIFIED**
  - Automatic deployment from GitHub main branch integration
  - Live web application accessible at https://wordplay-blond.vercel.app/
  - Production environment variables configured (NODE_ENV=production)
  - Vercel configuration with Vite framework detection
  - Production-ready Supabase client with fallback configuration
  - **Testing**: Build successful (188KB bundle), 10/10 tests passing
  - **Verification Commands**: `npm run build && npm test && vercel deployment`

- **Task 1.1**: Word Validation Service with ENABLE Dictionary ✅ **VERIFIED + CORRECTED**
  - ENABLE word list integration (172,819 words loaded from public domain source)
  - Comprehensive word validation with length checks (minimum 3 letters)
  - Character validation (alphabetic only for humans, bots can bypass)
  - Length change validation (max ±1 letter difference between turns)
  - Dictionary lookup integration (rejects unknown words like ZZZZZ)
  - Bot rule-breaking capabilities (bots bypass all validation rules)
  - Case insensitivity handling (hello→HELLO normalization)
  - **CORRECTED: Vanity Display System** (profane words valid for play, display as symbols when filter on)
  - **NEW: Unlock System** (playing profane word unlocks vanity toggle feature)
  - **NEW: Real-time Display** (symbols only show when current word is profane)
  - Performance optimization (average <1ms per validation)
  - **Testing**: 43/43 unit tests passing with comprehensive coverage including vanity system
  - **Checkpoint Verified**: validateWord('BRUH') === true ✅, DAMN valid for play ✅
  - **Verification Commands**: `npm test && npm run lint && npm run build`

- **Task 1.2**: Scoring Module with Complete Game Rules ✅ **VERIFIED**
  - Core scoring rules implementation (+1 point for add/remove/rearrange/key letter usage)
  - Independent action scoring (each action type scores separately)
  - Letter addition/removal/rearrangement scoring at any position
  - Key letter usage system (+1 point when using any key letters)
  - Complex action combinations (add+remove+rearrange+key usage all score independently)
  - **Required Examples Verified**: CAT→CATS(1pt), CAT→COAT(1pt), CAT→BAT+key B(3pts)
  - **Additional Examples Verified**: CATS→BATS(2pts), CATS→TABS(3pts), BATS→TABS(1pt)
  - Performance optimization (average <1ms per scoring operation)
  - Comprehensive edge case handling (empty inputs, duplicates, case insensitivity)
  - Pure TypeScript module with detailed breakdown and validation
  - **Testing**: 47/47 unit tests passing with comprehensive coverage
  - **Performance Verified**: 300 scoring operations complete in <50ms
  - **Verification Commands**: `npm test scoring.test.ts && npm run lint && npm run build`

- **Task 1.3**: Bot AI v0 (Greedy Strategy) with Complete Game Intelligence ✅ **VERIFIED**
  - Greedy strategy implementation (chooses highest scoring legal moves)
  - Comprehensive move generation (add/remove/rearrange/substitute operations)
  - Key letter prioritization and bonus scoring integration
  - 100-turn simulation capability without crashes or performance degradation
  - Performance targets met (average latency <50ms per move)
  - Fair play system (this v0 Greedy bot follows same validation rules as human players for balanced gameplay)
  - Full integration with scoring module and word validation system (supports both fair and rule-breaking bot modes)
  - **Move Generation**: 700+ candidates per word analyzed and filtered to valid dictionary words
  - **AI Features**: Confidence scoring, move reasoning, decision explanation system
  - **Endurance Testing**: Completes 100-turn games reliably with progression tracking
  - Pure TypeScript module with comprehensive error handling
  - **Comprehensive Testing**: 33/33 tests passing with full coverage of move generation, scoring, and endurance
  - **Verification Commands**: `npm test bot.test.ts && npm run lint && npm run build`

- **Task 1.4**: Local GameState Manager with Complete Game Orchestration ✅ **VERIFIED**
  - Comprehensive game state management integrating all engine components
  - Word state management with validation and normalization (setWord method)
  - Key letters array management with add/remove operations and duplicate prevention
  - Locked letters array management with case-insensitive handling
  - Turn-based game flow with player switching and game completion logic
  - Bot AI integration for automated gameplay and move generation
  - Event system for UI integration with observable state changes
  - Performance optimization (operations complete in <1ms, 1000 operations efficiently handled)
  - Reset functionality and comprehensive edge case handling
  - **Game Flow**: Complete turn management, scoring integration, winner determination
  - **State Management**: Immutable state access, event notifications, statistics tracking
  - **Integration**: Full compatibility with word validation, scoring, and bot AI modules
  - **Testing**: 49/49 tests passing with comprehensive coverage of all functionality
  - **Verification Commands**: `npm test gamestate.test.ts && npm run lint && npm run build`

- **Task 1.5**: Terminal Game Interface for Testing and Validation ✅ **VERIFIED + WORKING + IMPROVED**
  - Interactive command-line game interface integrating all engine components
  - Human vs Bot gameplay with real-time feedback and turn-based flow
  - Comprehensive terminal UI with colors, help system, and command interface
  - Game state display (current word, player scores, key letters, turn progression)
  - Move input validation with detailed error messages and scoring breakdown
  - Complete game statistics and move history tracking
  - Performance optimized terminal experience with bot AI integration
  - **Game Commands**: word input, help system, detailed state display (removed manual key letter commands)
  - **Visual Design**: Welcome screen, colored output, formatted game state, winner celebration
  - **Bot Integration**: Real-time bot moves with performance timing and decision feedback
  - **NEW: Word Repetition Prevention**: No word can be played twice in the same game (strategic constraint)
  - **NEW: Automatic Key Letter Generation**: Random key letters generated each turn (max 3 active)
  - **NEW: Random Starting Words**: Each game starts with a random 4-letter word from dictionary for variety
  - **NEW: Turn-based Color Themes**: Alternating blue/green color schemes for each turn with multiple shades for enhanced readability
  - **IMPROVED: Game Logic**: Enhanced move validation with used word tracking and automatic key letter management
  - **IMPROVED: Visual Design**: Turn-based color themes provide better visual cohesion and turn distinction for improved UX
  - **Testing**: 17/17 tests passing with mocked readline interface for CI compatibility
  - **READY TO PLAY**: Use `npm run play` to start the interactive terminal game
  - **Long-term Solution**: Added tsx dependency and npm script for TypeScript execution with ES modules
  - **Fixed ES Module Issues**: Updated dictionary.ts and terminal-game.ts for proper ES module support
  - **Verification Commands**: `npm test terminal-game.test.ts && npm run lint && npm run build && npm run play`
