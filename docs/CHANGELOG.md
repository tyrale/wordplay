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

### Changed
- Updated word validation to support modern slang
- Improved test coverage for word validation
- Clarified scoring rules and examples

### Fixed
- Corrected key letter validation to ensure new letters only
- Fixed scoring calculation for multiple actions
- Updated test cases to reflect correct scoring rules

## [0.1.0] - 2024-03-20

### Added
- Initial project setup
- Basic project structure
- Development environment configuration
- Core dependencies installation
- Basic documentation structure 