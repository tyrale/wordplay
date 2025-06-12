# Challenge Mode Implementation Plan

## Overview

Challenge Mode is a daily puzzle game where all players worldwide receive the same start and target word pair each day. Players must transform the start word into the target word following standard game rules, aiming to complete the transformation in as few steps as possible.

## Game Mode Specifications

### Core Mechanics
- **Daily Challenge**: Same start→target word pair for all players based on date
- **Word Transformation**: Follow existing game rules (±1 length change, valid dictionary words)
- **No Key Letters**: Pure word transformation without locked letter mechanics
- **No Scoring**: Success measured by completion and step count only
- **One Attempt**: No resets or retries (maintains puzzle integrity)

### Word Selection
- Start word: Generated randomly using daily seed
- Target word: Generated within ±1 length of start word using same daily seed
- Both words from existing game dictionary
- No path validation initially (simple implementation)

### Game Flow
1. Player sees start word at top of word trail (accent color)
2. Target word displayed at bottom of word trail (accent color, visual reference)
3. Player transforms words step by step
4. Each valid word appears between start and target in word trail
5. Game ends when target word is reached or player gives up

### Sharing System
- Visual pattern using `···*` format
- `·` represents unchanged letters (including rearranged)
- `*` represents truly new letters only
- Failed attempts show red X symbols (❌) for final word
- Uses engine's move calculation logic for accuracy

## Implementation Phases

### Phase 1: Core Challenge Engine (Cross-Platform)

#### Challenge Engine Module (`packages/engine/challenge/`)
- Platform-agnostic challenge logic
- Daily seed generation (deterministic from date)
- Challenge state management
- Integration with existing dictionary and validation systems

#### Challenge State Structure
```typescript
interface ChallengeState {
  date: string; // YYYY-MM-DD
  startWord: string;
  targetWord: string;
  currentWord: string;
  wordSequence: string[];
  stepCount: number;
  completed: boolean;
  failed: boolean;
  failedAtWord?: string; // For red X sharing format
}
```

#### Daily Challenge Generator
- Deterministic seed from date ensures global consistency
- Same start→target pairs for all players on same date
- Target word within ±1 length of start word
- Uses existing dictionary system

#### Sharing Format Generator
- Research and integrate existing move calculation logic
- Distinguish new letters from rearranged letters
- Generate accurate `···*` patterns
- Handle failed challenges with red X format
- Pure function for cross-platform compatibility

### Phase 2: Web UI Implementation

#### Modified Word Trail Component
- Start word at top (accent color styling)
- Target word at bottom (accent color, visual reference only)
- Player words fill between start and target
- Maintain existing animations and interactions

#### Challenge Game Screen
- Reuse existing game layout structure
- Remove bot-related UI elements
- Remove key letter system completely
- Add step counter display
- Implement give-up functionality using existing pass system workflow

#### Pass System Integration for Give Up
- First tap of X shows "Give Up" (instead of "Tap to Pass")
- Second tap of X forfeits the challenge
- Maintains existing pass button behavior patterns

#### Challenge-Specific Game Logic
- Integrate with existing word validation
- No scoring system (only completion and step tracking)
- Follow standard word length change rules (±1)
- Detect target word completion

### Phase 3: Menu System Integration

#### Main Menu Updates
- Add checkmark (✓) next to "Challenge" when completed
- Add strikethrough styling for completed challenges
- Dynamic menu item text based on completion state

#### Challenge Menu Icon Item
- **Before starting**: "New Challenge Available"
- **After starting**: "FISH → REAMS" format display
- **After completion**: Show step count on second row
- **Debug option**: Third menu item to reset daily challenge

#### Navigation Integration
- Add challenge route to existing router system
- Handle navigation from menu to challenge game
- Return to menu after completion/failure

### Phase 4: Sharing System (Research Required)

#### Engine Move Analysis Integration
- Investigate existing word transformation logic
- Understand engine's move calculation methods
- Use same logic for accurate sharing format generation

#### Accurate Pattern Generation
- Leverage engine's move calculation for new letter identification
- Correctly handle letter additions, removals, and rearrangements
- Generate precise `···*` patterns based on actual transformations

#### Sharing Format Output
```
FISH → REAMS
····
[accurate patterns based on engine move analysis]
```

#### Failed Challenge Handling
- Red X symbol (❌) for each letter where player gave up
- Maintains shareable format for incomplete attempts

### Phase 5: Platform Integration & Storage

#### Engine Integration
- Work with existing dictionary system
- Use current word validation functions
- Integrate with established game state patterns

#### Persistent Storage Strategy
- Research unlock storage system for persistence approach
- Use same storage mechanism as unlocks (survives cache clearing)
- Save challenge state with date-based keys
- Handle mid-game progress preservation

#### Debug Features
- Reset daily challenge option for testing
- Generate new random challenges for development
- Clear challenge history functionality

## Research Tasks Before Implementation

### Critical Research Areas
1. **Move Calculation Logic**: Study engine's word transformation analysis
2. **Unlock Storage System**: Investigate persistent storage mechanisms
3. **Pass System Workflow**: Examine existing pass button implementation

### Integration Points
- Existing dictionary and validation systems
- Current game state management patterns
- Established UI component behaviors
- Cross-platform storage solutions

## Architecture Principles

### Cross-Platform Design
- Challenge logic in `packages/engine/challenge/` as platform-agnostic modules
- Consistent behavior across web, mobile, and terminal platforms
- Shared core logic with platform-specific adapters

### Global Consistency
- Deterministic daily seed ensures identical challenges worldwide
- Same start→target word pairs for all players on same date
- Consistent sharing format across all platforms

### Integration Standards
- Uses existing word validation and dictionary systems
- Leverages current game state management patterns
- Maintains established UI/UX behaviors
- No scoring system (completion and steps only)

## Success Criteria

### Functional Requirements
- Daily challenges generate consistently for all players
- Word transformation follows existing game rules
- Sharing format accurately represents player moves
- Challenge state persists across browser sessions
- Give-up functionality works reliably

### User Experience Goals
- Intuitive integration with existing menu system
- Clear visual distinction between start and target words
- Smooth transition from other game modes
- Reliable sharing mechanism for social interaction

### Technical Standards
- Cross-platform engine compatibility
- Persistent storage reliability
- Accurate move calculation integration
- Debug capabilities for development testing

## Timeline and Dependencies

### Dependencies
- Existing engine systems (dictionary, validation, move calculation)
- Current game state management infrastructure
- Established UI component library
- Cross-platform storage mechanisms

### Implementation Order
1. Research existing systems and integration points
2. Build core challenge engine with daily generation
3. Implement web UI with modified word trail
4. Integrate menu system and navigation
5. Develop sharing system with accurate pattern generation
6. Add persistent storage and debug features
7. Test cross-platform compatibility and consistency

## Future Enhancements

### Potential Features
- update the main menu to 'vsworld' from 'challenge' ('vs' will be in the accent color like the other options)
- Leaderboard shows the # of players that have solved it at each value. (7 turns: 982 players)
- Path validation to ensure solvable challenges
- Hint system for stuck players
- Challenge difficulty variations
- Historical challenge replay
- Advanced sharing formats with additional statistics

### Scalability Considerations
- Server-generated challenges for advanced features
- Multiplayer challenge competitions
- Achievement system integration
- Analytics and player behavior tracking 