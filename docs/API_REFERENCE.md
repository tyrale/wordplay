# API Reference

Technical reference for the WordPlay game engine interfaces, platform adapters, and core functions. This document provides detailed API documentation for developers working with the engine.

## Engine Architecture Overview

The WordPlay engine follows a **dependency injection pattern** where core game logic is platform-agnostic and receives dependencies through interfaces.

```typescript
// Core Pattern
Engine Function(gameData, dependencies) → Result
```

## Core Interfaces

### GameStateDependencies

Main interface that combines all engine dependencies (from `packages/engine/interfaces.ts`).

```typescript
interface GameStateDependencies extends 
  GameStateDictionaryDependencies, 
  GameStateScoringDependencies, 
  GameStateBotDependencies {}
```

### GameStateDictionaryDependencies

Interface for word validation and dictionary operations.

```typescript
interface GameStateDictionaryDependencies {
  validateWord: (word: string, options?: any) => ValidationResult;
  getRandomWordByLength: (length: number) => string | null;
}
```

**Methods**:
- `validateWord(word, options?)`: Validates a word against game rules with optional configuration
- `getRandomWordByLength(length)`: Returns random word of specified length or null if none available

### GameStateScoringDependencies

Interface for scoring calculations.

```typescript
interface GameStateScoringDependencies {
  calculateScore: (fromWord: string, toWord: string, options?: any) => ScoringResult;
  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]) => number;
  isValidMove: (fromWord: string, toWord: string) => boolean;
}
```

**Methods**:
- `calculateScore(fromWord, toWord, options?)`: Calculates detailed scoring for a move
- `getScoreForMove(fromWord, toWord, keyLetters?)`: Returns total score for a move
- `isValidMove(fromWord, toWord)`: Checks if move is valid without scoring

### GameStateBotDependencies

Interface for bot AI operations.

```typescript
interface GameStateBotDependencies {
  generateBotMove: (word: string, options?: any) => Promise<BotResult>;
}
```

**Methods**:
- `generateBotMove(word, options?)`: Generates bot move asynchronously with optional configuration

### WordDataDependencies

Interface for word data storage and retrieval.

```typescript
interface WordDataDependencies {
  enableWords: Set<string>;
  slangWords: Set<string>;
  profanityWords: Set<string>;
  wordCount: number;
  hasWord: (word: string) => boolean;
  isLoaded: () => boolean;
  waitForLoad: () => Promise<void>;
  getRandomWordByLength: (length: number) => string | null;
}
```

**Properties**:
- `enableWords`: Set of valid dictionary words
- `slangWords`: Set of accepted slang words  
- `profanityWords`: Set of profanity words (for filtering)
- `wordCount`: Total number of words available

**Methods**:
- `hasWord(word)`: Check if word exists in any word set
- `isLoaded()`: Check if dictionary data is loaded
- `waitForLoad()`: Wait for dictionary to finish loading
- `getRandomWordByLength(length)`: Get random word of specific length

## Platform Adapters

### Browser Adapter

For web applications using HTTP dictionary loading. **Currently used by challenge mode and hooks**, and acts as the **single canonical web adapter implementation**.

```typescript
import { BrowserAdapter, createBrowserAdapter } from '../adapters/browserAdapter';

// Singleton pattern
const adapter = BrowserAdapter.getInstance();
await adapter.initialize();
const dependencies = adapter.getGameDependencies();

// Or factory pattern
const adapter = await createBrowserAdapter();
const dependencies = adapter.getGameDependencies();
```

**Features**:
- HTTP dictionary loading via fetch API (enable1.txt)
- JSON-based slang and profanity word loading
- Browser-compatible performance timing
- Graceful fallback to minimal word set
- Async initialization with waitForLoad()

**Used By**:
- `ChallengeGame.tsx` component
- `useGameState.ts` hook
- `useChallenge.ts` hook

### Web Adapter

Compatibility layer that re-exports the browser adapter. **Historically used by interactive game mode**.

```typescript
import { WebAdapter, createWebAdapter } from '../adapters/webAdapter';

const adapter = WebAdapter.getInstance();
await adapter.initialize();
const dependencies = adapter.getGameDependencies();

// Or factory pattern
const adapter = await createWebAdapter();
const dependencies = adapter.getGameDependencies();
```

**Features**:
- Re-exports the `BrowserAdapter` implementation under the `WebAdapter` / `createWebAdapter` names
- Preserves existing import paths while avoiding duplicate implementations

**Usage Notes**:
- Existing code that imports `WebAdapter` or `createWebAdapter` will continue to work.
- New web code should prefer importing from `browserAdapter.ts` to avoid confusion.

### Test Adapter

For unit testing with controlled environments.

```typescript
import { createTestAdapter, TestAdapter } from '../adapters/testAdapter';

const adapter = createTestAdapter();
const dependencies = adapter.getGameDependencies();

// Custom configuration
const customAdapter = createTestAdapter({
  enableWords: new Set(['CAT', 'CATS', 'DOG', 'DOGS']),
  enableProfanity: false
});
```

**Features**:
- Deterministic word sets for predictable testing
- Synchronous initialization (no async loading)
- Configurable test scenarios
- Minimal word sets for fast testing

**Used By**:
- Unit tests throughout the codebase
- Integration tests with mocked adapters

## Core Engine Functions

### Dictionary Functions

#### validateWordWithDependencies

```typescript
function validateWordWithDependencies(
  word: string,
  wordData: WordDataDependencies,
  options?: any
): ValidationResult
```

**Parameters**:
- `word`: Word to validate (automatically converted to uppercase)
- `wordData`: Word data dependencies providing dictionary access
- `options`: Optional configuration for validation

**Returns**: `ValidationResult`
```typescript
interface ValidationResult {
  isValid: boolean;
  reason?: string;
  userMessage?: string;
  censored?: string; // For profanity filtering
}
```

**Example**:
```typescript
const adapter = await createBrowserAdapter();
const wordData = adapter.getWordData();

const result = validateWordWithDependencies('CATS', wordData);
// { isValid: true }

const invalid = validateWordWithDependencies('ZZZZZ', wordData);
// { isValid: false, reason: 'not_in_dictionary', userMessage: 'Word not found' }
```

#### isValidDictionaryWordWithDependencies

```typescript
function isValidDictionaryWordWithDependencies(
  word: string,
  wordData: WordDataDependencies
): boolean
```

**Parameters**:
- `word`: Word to check
- `wordData`: Word data dependencies

**Returns**: Boolean indicating if word exists in dictionary

**Example**:
```typescript
const isValid = isValidDictionaryWordWithDependencies('CATS', wordData);
// true
```

### Scoring Functions

#### calculateScore

```typescript
function calculateScore(
  fromWord: string,
  toWord: string,
  options?: any
): ScoringResult
```

**Parameters**:
- `fromWord`: Previous word state
- `toWord`: New word state  
- `options`: Optional scoring configuration (keyLetters, etc.)

**Returns**: `ScoringResult`
```typescript
interface ScoringResult {
  totalScore: number;
  baseScore: number;
  keyLetterScore: number;
  actions: ScoringAction[];
  keyLettersUsed: string[];
}

interface ScoringAction {
  type: 'add' | 'remove' | 'rearrange';
  description: string;
  points: number;
}
```

**Example**:
```typescript
const score = calculateScore('CAT', 'CATS', { keyLetters: ['S'] });
// { 
//   totalScore: 2, 
//   baseScore: 1, 
//   keyLetterScore: 1,
//   actions: [{ type: 'add', description: 'Added letter(s): S', points: 1 }],
//   keyLettersUsed: ['S']
// }
```

#### getScoreForMove

```typescript
function getScoreForMove(
  fromWord: string,
  toWord: string,
  keyLetters?: string[]
): number
```

**Parameters**:
- `fromWord`: Previous word
- `toWord`: New word
- `keyLetters`: Optional key letters for bonus scoring

**Returns**: Total numeric score for the move

#### isValidMove

```typescript
function isValidMove(
  fromWord: string,
  toWord: string
): boolean
```

**Parameters**:
- `fromWord`: Previous word
- `toWord`: New word

**Returns**: Boolean indicating if move is structurally valid

### Bot Functions

#### generateBotMoveWithDependencies

```typescript
function generateBotMoveWithDependencies(
  currentWord: string,
  dependencies: BotDependencies,
  options?: BotOptions
): Promise<BotResult>
```

**Parameters**:
- `currentWord`: Current word state
- `dependencies`: Bot dependencies (extends dictionary and scoring)
- `options`: Bot configuration options

**Returns**: `BotResult`
```typescript
interface BotResult {
  move: BotMove | null;
  reasoning: string;
  confidence: number;
  timeElapsed: number;
}

interface BotMove {
  word: string;
  score: number;
}
```

**Example**:
```typescript
const adapter = await createBrowserAdapter();
const botDeps = adapter.getBotDependencies();

const botResult = await generateBotMoveWithDependencies('CAT', botDeps);
// { 
//   move: { word: 'CATS', score: 1 }, 
//   reasoning: 'Added letter S for 1 point',
//   confidence: 0.8, 
//   timeElapsed: 25
// }
```

## Game State Management

### LocalGameStateManagerWithDependencies

Main class for managing game state with dependency injection.

```typescript
class LocalGameStateManagerWithDependencies {
  constructor(dependencies: GameStateDependencies, config?: GameConfig);
  
  // Game lifecycle
  startGame(): void;
  resetGame(): void;
  
  // State access
  getState(): GameState;
  subscribe(callback: (state: GameState) => void): () => void;
  
  // Move management
  applyMoveAttempt(
    word: string, 
    isBot: boolean, 
    playerId?: string
  ): MoveAttemptResult;
  
  // Bot integration
  makeBotMove(): Promise<BotMove | null>;
}
```

**Example Usage**:
```typescript
import { createBrowserAdapter } from '../adapters/browserAdapter';
import { createGameStateManagerWithDependencies } from '../../packages/engine/gamestate';

const adapter = await createBrowserAdapter();
const dependencies = adapter.getGameDependencies();
const gameManager = createGameStateManagerWithDependencies(dependencies, {
  maxTurns: 20,
  allowBotPlayer: true,
  enableKeyLetters: true
});

// Start game
gameManager.startGame();

// Get current state
const state = gameManager.getState();
console.log(`Current word: ${state.currentWord}`);

// Subscribe to changes
const unsubscribe = gameManager.subscribe((newState) => {
  console.log('Game state updated:', newState);
});

// Make a move
const result = gameManager.applyMoveAttempt('CATS', false);
if (result.isValid) {
  console.log(`Score: ${result.score}`);
}

// Bot turn
const botMove = await gameManager.makeBotMove();
if (botMove) {
  console.log(`Bot played: ${botMove.word}`);
}
```

## Data Types

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  reason?: 'not_in_dictionary' | 'too_short' | 'too_long' | 'invalid_characters' | 'length_change_too_large' | 'word_already_used' | 'too_many_adds' | 'too_many_removes' | 'game_not_active' | 'no_change' | 'profanity_detected';
  userMessage?: string;
  censored?: string;
}
```

### ScoringResult

```typescript
interface ScoringResult {
  totalScore: number;
  baseScore: number;
  keyLetterScore: number;
  actions: ScoringAction[];
  keyLettersUsed: string[];
}

interface ScoringAction {
  type: 'add' | 'remove' | 'rearrange';
  description: string;
  points: number;
}
```

### GameState

```typescript
interface GameState {
  gameStatus: 'notStarted' | 'inProgress' | 'finished';
  currentTurn: number;
  currentWord: string;
  players: Player[];
  turnHistory: TurnRecord[];
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  usedWords: string[];
  usedKeyLetters: string[];
}

interface TurnRecord {
  playerId: string;
  word: string;
  score: number;
  isBot: boolean;
  timestamp: number;
  scoringResult: ScoringResult;
}
```

### GameConfig

```typescript
interface GameConfig {
  maxTurns?: number;
  allowBotPlayer?: boolean;
  enableKeyLetters?: boolean;
  enableLockedLetters?: boolean;
  botId?: string;
  startingWord?: string;
}
```

## Challenge Mode API

### ChallengeEngine

Challenge mode uses a separate agnostic engine for step-by-step word transformations.

```typescript
import { ChallengeEngine } from '../../packages/engine/challenge';

const challengeEngine = new ChallengeEngine(dependencies);

// Start challenge
const challenge = challengeEngine.generateChallenge({
  targetWord: 'CATS',
  maxSteps: 3
});

// Submit move
const result = challengeEngine.submitWord('CAST');
// { isValid: true, isComplete: false, currentStep: 1 }
```

**Used By**:
- `ChallengeGame.tsx` component
- `useChallenge.ts` hook

## Error Handling

### Common Error Types

```typescript
// Validation errors
const validationError: ValidationResult = {
  isValid: false,
  reason: 'not_in_dictionary',
  userMessage: 'Word not found in dictionary'
};

// Bot errors
const botError: BotResult = {
  move: null,
  reasoning: 'No valid moves available from current word',
  confidence: 0,
  timeElapsed: 50
};

// Move attempt errors
const moveError: MoveAttemptResult = {
  isValid: false,
  validationResult: {
    isValid: false,
    reason: 'word_already_used',
    userMessage: 'This word has already been played'
  }
};
```

### Error Recovery

```typescript
// Graceful validation handling
const result = gameManager.applyMoveAttempt('INVALID', false);
if (!result.isValid && result.validationResult) {
  showError(result.validationResult.userMessage || 'Invalid move');
  return;
}

// Bot fallback handling
const botMove = await gameManager.makeBotMove();
if (!botMove) {
  console.log('Bot unable to move, ending turn');
  // Game will automatically progress
}

// Dictionary loading fallback
const adapter = await createBrowserAdapter();
const status = adapter.getDictionaryStatus();
if (!status.loaded) {
  console.warn(`Dictionary partially loaded: ${status.wordCount} words`);
  // Adapter will use fallback word set
}
```

## Performance Considerations

### Current Performance Metrics (Verified 2025-01-22)

- **Word Validation**: <1ms per word
- **Score Calculation**: <2ms per calculation  
- **Bot Move Generation**: <100ms average
- **Dictionary Loading**: ~2-3s (browser), <100ms (Node.js)
- **Game State Updates**: <5ms per move

### Optimization Tips

```typescript
// Reuse adapter instances (singletons)
const adapter = BrowserAdapter.getInstance();
const dependencies = adapter.getGameDependencies();

// Batch word validations when possible
const words = ['CAT', 'CATS', 'DOG', 'DOGS'];
const wordData = adapter.getWordData();
const results = words.map(word => 
  validateWordWithDependencies(word, wordData)
);

// Wait for dictionary loading before intensive operations
await adapter.initialize();
const status = adapter.getDictionaryStatus();
if (status.loaded) {
  // Proceed with full functionality
}

// Subscribe to game state changes efficiently
const gameManager = createGameStateManagerWithDependencies(dependencies);
const unsubscribe = gameManager.subscribe((state) => {
  // Only update UI elements that changed
  updateGameUI(state);
});
```

## Testing Utilities

### Test Adapter Configuration

```typescript
// Basic test setup
const testAdapter = createTestAdapter();
const deps = testAdapter.getGameDependencies();

// Custom word list for specific tests
const customAdapter = createTestAdapter();
customAdapter.addWords(['TEST', 'WORD', 'LIST']);

// Deterministic test scenarios
const gameManager = createGameStateManagerWithDependencies(
  deps, 
  { maxTurns: 5, enableKeyLetters: false }
);
```

### Mock Dependencies for Unit Tests

```typescript
// Mock adapter for testing components
vi.mock('../adapters/browserAdapter', () => {
  return {
    BrowserAdapter: {
      getInstance: () => ({
        initialize: async () => {},
        getGameDependencies: () => mockDependencies,
        getDictionaryStatus: () => ({ loaded: true, wordCount: 100 })
      })
    }
  };
});

// Mock game dependencies
const mockDependencies: GameStateDependencies = {
  validateWord: vi.fn().mockReturnValue({ isValid: true }),
  getRandomWordByLength: vi.fn().mockReturnValue('TEST'),
  calculateScore: vi.fn().mockReturnValue({ 
    totalScore: 1, 
    baseScore: 1, 
    keyLetterScore: 0 
  }),
  getScoreForMove: vi.fn().mockReturnValue(1),
  isValidMove: vi.fn().mockReturnValue(true),
  generateBotMove: vi.fn().mockResolvedValue({ 
    move: { word: 'TESTS', score: 1 } 
  })
};
```

## Migration Guide

### Choosing the Right Adapter

```typescript
// Preferred for all web usage (single canonical implementation)
import { createBrowserAdapter } from '../adapters/browserAdapter';
const adapter = await createBrowserAdapter();

// Existing code that imports from webAdapter continues to work via alias
import { createWebAdapter } from '../adapters/webAdapter';
const adapterAlias = await createWebAdapter();

// For testing
import { createTestAdapter } from '../adapters/testAdapter';
const testAdapter = createTestAdapter();
```

### From Legacy Direct Engine Imports

```typescript
// ❌ Old approach (will not work)
import { validateWord } from '../../packages/engine/dictionary';
const result = validateWord('CATS');

// ✅ New approach (current pattern)
import { validateWordWithDependencies } from '../../packages/engine/dictionary';
import { createBrowserAdapter } from '../adapters/browserAdapter';

const adapter = await createBrowserAdapter();
const wordData = adapter.getWordData();
const result = validateWordWithDependencies('CATS', wordData);
```

### React Component Integration

```typescript
// ✅ Correct pattern for React components
import { useEffect, useState } from 'react';
import { createBrowserAdapter } from '../adapters/browserAdapter';

function GameComponent() {
  const [dependencies, setDependencies] = useState(null);

  useEffect(() => {
    async function initializeDependencies() {
      const adapter = await createBrowserAdapter();
      setDependencies(adapter.getGameDependencies());
    }
    initializeDependencies();
  }, []);

  if (!dependencies) return <div>Loading...</div>;

  // Use dependencies with engine functions
  return <GameInterface dependencies={dependencies} />;
}
```

## Current Architecture Issues

### Known Issues (As of 2025-01-22)

1. **Test Interface Mismatches**: 43/307 tests failing due to scoring interface expectations
2. **Debug Code**: Development logging statements still present in production code

### Recommended Consolidation

```typescript
// Future unified approach (recommended)
import { createWebAdapter } from '../adapters/webAdapter';

// Replace both browserAdapter and webAdapter usage
const adapter = await createWebAdapter();
const dependencies = adapter.getGameDependencies();

// Use consistently across all web components
```

---

*This API reference reflects the current implementation as of 2025-01-22. For the most up-to-date interfaces, refer to `packages/engine/interfaces.ts` and adapter implementations in `src/adapters/`.* 