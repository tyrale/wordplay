# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project documentation structure
- Task progress tracking system
- Development plan reference 
- Initialized Expo React Native project with TypeScript
- Added ESLint and Prettier configurations
- Set up Jest testing environment
- Added Supabase environment configuration template
- Set up GitHub Actions CI workflow with Jest and ESLint
- Configured EAS for development builds
- Initialized Supabase project with database schema
- Added Row Level Security policies for data protection
- Set up user authentication triggers and functions
- Created word validation service with dictionary support
- Added word length validation based on previous word
- Implemented bot support with rule-breaking capabilities
- Added display mechanics for bad words and 1337 numbers
- Created comprehensive test suite for word validation
- Scoring module with core rules:
  - Letter addition/removal scoring
  - Letter rearrangement scoring
  - Key letter bonus system
  - Comprehensive test suite with examples
- Examples of scoring:
  - "CAT" → "CATS" (+1 for adding 'S')
  - "CAT" → "COAT" (+1 for adding 'O')
  - "CAT" → "BAT" with key 'B' (+1 for removing 'C', +1 for adding 'B', +1 for key letter)
  - "CAT" → "TACE" with key 'E' (+1 for rearranging, +1 for adding 'E', +1 for key letter)
- Bot AI v0 (Greedy) completed:
  - Bot now chooses the highest scoring legal move.
  - Simulates 100 turns without crashing.
  - Maintains <50ms average latency.
  - Tests confirm the bot finds the best possible move, using add, remove, rearrange, and key letter actions.
- Task 1.4: Local GameState Reducer completed. Implemented a Zustand slice for managing the current word, key letters, and locked letters, with actions for add, remove, move, and reset. Added comprehensive Jest tests for all state transitions.
- Task 1.5: Integrated the full ENABLE word list (3+ letters) into the engine. Dictionary validation now uses a comprehensive static word list loaded at build time. Updated all tests to use real dictionary data.
- Integrated a comprehensive cleaned slang dictionary (with definitions) from slang-working-list.txt. The engine now loads slang terms from a JSON file, ready for future use of definitions.
- Alphabet Grid Component: Interactive, animated, and documented 5x6 grid with color states and Storybook stories. Supports tap, long-press, and drag gestures. All code, stories, and docs complete and linted.
- ShipHip: Modern Expo Router file-based routing architecture
- ShipHip: Cross-platform navigation for iOS/Android/Web
- ShipHip: New React Native Architecture support
- ShipHip: Modern app interface with development progress tracking
- ShipHip: Game screen mockup with UI component placeholders

### Changed
- Updated word validation to support modern slang
- Improved test coverage for word validation
- Clarified scoring rules and examples
- ShipHip: Migrated from traditional App.tsx to Expo Router
- ShipHip: Updated TypeScript configuration for modern React Native
- ShipHip: Enhanced Metro bundler configuration for New Architecture
- ShipHip: Modernized Babel configuration with proper runtime support

### Removed
- ShipHip: Redundant App.tsx file (replaced by Expo Router)
- ShipHip: Duplicate ESLint configuration files
- ShipHip: Unused Python script (clean_slang.py)

### Fixed
- Corrected key letter validation to ensure new letters only
- Fixed scoring calculation for multiple actions
- Updated test cases to reflect correct scoring rules
- ShipHip: Resolved Expo Go crashes by implementing proper New Architecture setup
- ShipHip: Fixed bundling issues with react-native-web compatibility
- ShipHip: Corrected project documentation to match actual implementation
- ShipHip: Eliminated configuration conflicts between legacy and modern setups

### Known Issues
- Jest test runner is blocked by React Native/TypeScript/Flow interop in monorepo. Follow-up task added to resolve test runner config for UI package.

## [0.1.0] - 2024-03-20

### Added
- Initial project setup
- Basic project structure
- Development environment configuration
- Core dependencies installation
- Basic documentation structure 

## [1.0.0] - 2024-05-30

### Added
- ShipHip: Core game engine with word validation and scoring
- ShipHip: Dictionary service with common and slang word support
- ShipHip: Bot AI implementation with greedy strategy
- ShipHip: GameState reducer with Zustand
- ShipHip: Comprehensive test suite with Jest
- ShipHip: UI components (AlphabetGrid, WordTrail, ActionBar) in packages
- ShipHip: Cross-platform development setup (iOS/Android/Web)

### Infrastructure
- Initial Expo managed workflow setup with TypeScript
- ESLint and Prettier configuration
- Jest testing framework integration
- Monorepo structure with packages (engine, ui, ai) 