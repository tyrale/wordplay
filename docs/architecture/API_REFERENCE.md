# API Reference

> **Purpose**: Detailed reference for engine interfaces, platform adapters, and core functions — the doc to consult when writing code against the engine, not for project status.
>
> **Accuracy note (2026-07-14)**: Rewritten after an audit found this document described a `webAdapter.ts` (never existed as documented, since removed) and several interface shapes (`ValidationResult`, `ScoringResult`, `BotResult`, `ChallengeEngine`) that no longer matched `packages/engine/interfaces.ts` / `packages/engine/challenge.ts`. All signatures below were re-verified against current source.

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
// packages/engine/interfaces.ts — the declared interface
interface WordDataDependencies {
  enableWords: Set<string>;
  slangWords: Set<string>;
  profanityWords: Set<string>;
  wordCount: number;
}
```

**Properties** (declared on the interface):
- `enableWords`: Set of valid dictionary words
- `slangWords`: Set of accepted slang words  
- `profanityWords`: Set of profanity words (for filtering)
- `wordCount`: Total number of words available

**Methods** (implemented by every concrete adapter, e.g. `BrowserWordData` in `src/adapters/browserAdapter.ts` — **not** currently declared on the `WordDataDependencies` interface itself, but relied on by dictionary/adapter code):
- `hasWord(word)`: Check if word exists in any word set
- `isLoaded()`: Check if dictionary data is loaded
- `waitForLoad()`: Wait for dictionary to finish loading
- `getRandomWordByLength(length)`: Get random word of specific length

## Platform Adapters

### Browser Adapter

For web applications using HTTP dictionary loading. **This is the only web adapter** — used by every web consumer (`ChallengeGame.tsx`, `InteractiveGame.tsx`, `useGameState.ts`, `useChallenge.ts`, `DebugDialog.tsx`). There is no separate `webAdapter.ts` (it existed at one point and was removed).

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
- `InteractiveGame.tsx` component
- `useGameState.ts` hook
- `useChallenge.ts` hook
- `DebugDialog.tsx` component

### Node Adapter

For the terminal/CLI game (`packages/engine/terminal-game.ts`), using the file system to load the dictionary instead of HTTP.

```typescript
import { NodeAdapter, getNodeGameDependencies } from '../adapters/nodeAdapter';

const adapter = NodeAdapter.getInstance();
await adapter.initialize();
const dependencies = adapter.getGameDependencies();

// Or the module-level convenience function
const dependencies = getNodeGameDependencies();
```

**Used By**: `packages/engine/terminal-game.ts` (the `npm run play` CLI game).

### Test Adapter

For unit testing with controlled environments.

```typescript
import { createTestAdapter, TestAdapter, createCustomTestDependencies } from '../adapters/testAdapter';

const adapter = createTestAdapter(); // takes no arguments — returns the singleton, pre-loaded with a fixed test word set
const dependencies = adapter.getGameDependencies();

// Custom word list: build standalone dependencies instead of configuring the singleton
const customDependencies = createCustomTestDependencies(['CAT', 'CATS', 'DOG', 'DOGS']);

// Or mutate the singleton's word data directly via its instance methods
const wordData = adapter.getWordData();
wordData.addWord('ZEBRA');
wordData.removeWord('CAT');
wordData.clearWords();
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
// packages/engine/interfaces.ts
interface ValidationResult {
  isValid: boolean;
  reason?: 'NOT_IN_DICTIONARY' | 'ALREADY_PLAYED' | 'TOO_MANY_ADDS' | 'TOO_MANY_REMOVES' |
    'INVALID_CHARACTERS' | 'TOO_SHORT' | 'EMPTY_WORD' | 'GAME_NOT_PLAYING' | 'NO_PLAYER' |
    'LENGTH_CHANGE_TOO_LARGE' | 'INVALID_MOVE' | string; // UPPER_SNAKE_CASE reason codes
  word: string;       // the normalized (uppercased) word that was validated
  userMessage?: string;
  censored?: string;  // For profanity filtering
}
```

**Example**:
```typescript
const adapter = await createBrowserAdapter();
const wordData = adapter.getWordData();

const result = validateWordWithDependencies('CATS', wordData);
// { isValid: true, word: 'CATS' }

const invalid = validateWordWithDependencies('ZZZZZ', wordData);
// { isValid: false, reason: 'NOT_IN_DICTIONARY', word: 'ZZZZZ' }
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
// packages/engine/interfaces.ts
interface ScoringResult {
  score: number;
  totalScore: number;
  breakdown: string[] | Record<string, number>; // ⚠️ inconsistently produced/consumed — see note below
  actions: ScoringAction[];
  keyLetterScore: number;
  baseScore: number;
  keyLettersUsed: string[];
}

interface ScoringAction {
  type: 'add' | 'remove' | 'rearrange' | 'substitute' | 'key-letter';
  letters?: string[];
  score: number;
}
```

> **⚠️ Known inconsistency**: `breakdown` is typed as `string[] | Record<string, number>` because different call sites disagree on its shape — `scoring.test.ts` expects a structured `Record` (`breakdown.addLetterPoints`, etc.), the empty-word edge case inside `calculateScore()` itself returns that same `Record` shape, but the normal (non-edge-case) path returns a `string[]` of human-readable action descriptions instead. This is tracked as step 7a in `docs/project/PROJECT_STATUS_AUDIT.md` and is **not yet resolved** — check the actual return value at the call site you're working with rather than trusting this type alone.

**Example** (verified against `packages/engine/scoring.ts`, normal non-edge-case path):
```typescript
const score = calculateScore('CAT', 'CATS', { keyLetters: ['S'] });
// {
//   score: 2,
//   totalScore: 2,
//   breakdown: ['Added letter(s): S', 'Used key letter(s): S'],   // string[] — NOT the Record shape from the interface's edge case
//   actions: [{ type: 'add', score: 1 }, { type: 'key-letter', score: 1 }], // note: `letters` is declared on ScoringAction but never populated by calculateScore()
//   keyLetterScore: 1,
//   baseScore: 1,
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
// packages/engine/bot.ts — the engine function itself is SYNCHRONOUS
function generateBotMoveWithDependencies(
  currentWord: string,
  dependencies: BotDependencies,
  options?: BotOptions
): BotResult
```

**Parameters**:
- `currentWord`: Current word state
- `dependencies`: Bot dependencies (extends dictionary and scoring)
- `options`: Bot configuration options

**Returns**: `BotResult` (synchronously — there is no `await` on this call itself)
```typescript
// packages/engine/interfaces.ts
interface BotResult {
  move: BotMove | null;
  candidates: BotMove[];
  processingTime: number;
  totalCandidatesGenerated: number;
}

interface BotMove {
  word: string;
  score: number;
  confidence: number;
  reasoning: string[];
}
```

> **Note**: Adapters expose bot moves via `GameStateBotDependencies.generateBotMove`, which is declared as returning `Promise<BotResult>` — that's because each adapter wraps the synchronous `generateBotMoveWithDependencies()` call in an `async` function (see `browserAdapter.ts`'s `browserBotDependencies.generateBotMove`), not because the engine function itself is async.

**Example**:
```typescript
const adapter = await createBrowserAdapter();
const botDeps = adapter.getBotDependencies(); // GameStateBotDependencies — async wrapper

const botResult = await botDeps.generateBotMove('CAT');
// {
//   move: { word: 'CATS', score: 1, confidence: 0.8, reasoning: ['Added S'] },
//   candidates: [{ word: 'CATS', score: 1, confidence: 0.8, reasoning: ['Added S'] }, ...],
//   processingTime: 5,
//   totalCandidatesGenerated: 12
// }
```

## Game State Management

### LocalGameStateManagerWithDependencies

Main class for managing game state with dependency injection.

```typescript
// packages/engine/gamestate.ts — LocalGameStateManagerWithDependencies (implements IGameStateManager)
class LocalGameStateManagerWithDependencies {
  constructor(dependencies: GameStateDependencies, config?: GameConfig);

  // Game lifecycle
  startGame(): void;
  resetGame(newConfig?: GameConfig): void;
  passTurn(): boolean;

  // State access
  getState(): GameState;
  getCurrentPlayer(): Player | null;
  getOtherPlayer(): Player | null;
  subscribe(listener: (update: GameStateUpdate) => void): () => void;

  // Move management
  attemptMove(newWord: string): MoveAttempt;      // validate without applying
  validateMove(newWord: string): ValidationResult; // convenience wrapper around attemptMove
  applyMove(wordOrAttempt: string | MoveAttempt): boolean; // validates+applies if given a string

  // Bot integration
  makeBotMove(): Promise<BotMove | null>;

  // Key/locked letter management
  addKeyLetter(letter: string): void;
  removeKeyLetter(letter: string): void;
  addLockedLetter(letter: string): void;
  removeLockedLetter(letter: string): void;
}
```

**Note**: There is no `applyMoveAttempt(word, isBot, playerId)` public method and no `MoveAttemptResult` type — `applyMoveAttempt(moveAttempt: MoveAttempt)` is `private`. From outside the class, call `applyMove(word)` (which internally calls `attemptMove()` then the private `applyMoveAttempt()`) or use `attemptMove()` first if you need the `MoveAttempt` details (validation + scoring) before deciding whether to apply it.

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
const unsubscribe = gameManager.subscribe((update) => {
  console.log('Game state update:', update.type, update.data);
});

// Inspect a move before applying it
const attempt = gameManager.attemptMove('CATS');
if (attempt.canApply) {
  gameManager.applyMove(attempt); // or simply: gameManager.applyMove('CATS')
  console.log(`Score: ${attempt.scoringResult?.score}`);
}

// Bot turn
const botMove = await gameManager.makeBotMove();
if (botMove) {
  console.log(`Bot played: ${botMove.word}`);
}
```

## Data Types

> The following are re-stated from `packages/engine/interfaces.ts` for convenience — that file is the source of truth if these ever drift again.

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  reason?: 'NOT_IN_DICTIONARY' | 'ALREADY_PLAYED' | 'TOO_MANY_ADDS' | 'TOO_MANY_REMOVES' |
    'INVALID_CHARACTERS' | 'TOO_SHORT' | 'EMPTY_WORD' | 'GAME_NOT_PLAYING' | 'NO_PLAYER' |
    'LENGTH_CHANGE_TOO_LARGE' | 'INVALID_MOVE' | string;
  word: string;
  userMessage?: string;
  censored?: string;
}
```

### ScoringResult

```typescript
interface ScoringResult {
  score: number;
  totalScore: number;
  breakdown: string[] | Record<string, number>; // see "Known inconsistency" note above
  actions: ScoringAction[];
  keyLetterScore: number;
  baseScore: number;
  keyLettersUsed: string[];
}

interface ScoringAction {
  type: 'add' | 'remove' | 'rearrange' | 'substitute' | 'key-letter';
  letters?: string[];
  score: number;
}
```

### GameState

```typescript
interface GameState {
  gameStatus: 'ready' | 'waiting' | 'playing' | 'finished';
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  players: Player[];
  currentPlayerIndex: number;
  currentTurn: number;
  maxTurns: number;
  usedWords: string[];
  usedKeyLetters: string[];
  turnHistory: TurnHistory[];
  gameStartTime: number | null;
  lastMoveTime: number | null;
  winner: Player | null;
  totalMoves: number;
  config: GameConfig;
}

interface TurnHistory {
  turnNumber: number;
  playerId: string;
  previousWord: string;
  newWord: string;
  score: number;
  keyLettersUsed: string[];
  scoringBreakdown: ScoringResult;
  timestamp: number;
}
```

### GameConfig

```typescript
// packages/engine/interfaces.ts
interface GameConfig {
  maxTurns?: number;
  initialWord?: string;
  players?: Player[];
  allowBotPlayer?: boolean;
  enableKeyLetters?: boolean;
  enableLockedLetters?: boolean;
  allowProfanity?: boolean;
}
```

## Challenge Mode API

### ChallengeEngine

Challenge mode uses a separate, dependency-injected engine (`packages/engine/challenge.ts`) built with a **factory function**, not a class — there is no `new ChallengeEngine(...)`.

```typescript
import { createChallengeEngine } from '../../packages/engine/challenge';
import type { ChallengeEngine, ChallengeDependencies, ChallengeState } from '../../packages/engine/challenge';

const dependencies: ChallengeDependencies = {
  dictionary,   // DictionaryEngine
  utilities,    // UtilityDependencies
  loadState: async (date) => { /* load persisted ChallengeState or null */ return null; },
  saveState: async (state) => { /* persist ChallengeState */ }
};

const challengeEngine: ChallengeEngine = createChallengeEngine(dependencies);
await challengeEngine.initialize();

// Get/start today's challenge
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const state = await challengeEngine.getDailyChallengeState(today);

// Submit a word
const result = await challengeEngine.submitWord('CAST', state);
// { newState: ChallengeState, isValid: boolean, isComplete: boolean, error?: string }

// Sharing
const sharingText = challengeEngine.generateSharingText(state);

// Utilities / debug
challengeEngine.isValidMove('CAT', 'CAST');
await challengeEngine.forfeitChallenge(state);
await challengeEngine.resetDailyChallenge(today);
await challengeEngine.generateRandomChallenge();
```

**Full `ChallengeEngine` interface** (`packages/engine/challenge.ts`):
```typescript
interface ChallengeEngine {
  initialize(): Promise<void>;
  getDailyChallengeState(date?: string): Promise<ChallengeState>;
  startDailyChallenge(date?: string): Promise<ChallengeState>;
  submitWord(word: string, currentState: ChallengeState): Promise<{
    newState: ChallengeState;
    isValid: boolean;
    isComplete: boolean;
    error?: string;
  }>;
  forfeitChallenge(currentState: ChallengeState): Promise<ChallengeState>;
  generateSharingPattern(wordSequence: string[]): string[];
  generateSharingText(state: ChallengeState): string;
  isValidMove(fromWord: string, toWord: string): boolean;
  resetDailyChallenge(date?: string): Promise<void>;
  generateRandomChallenge(): Promise<ChallengeState>;
}
```

**Used By**:
- `ChallengeGame.tsx` component
- `useChallenge.ts` hook — see `createChallengeEngine(challengeDependencies)` call and `challengeEngine.getDailyChallengeState/submitWord/forfeitChallenge/...` usage for the canonical integration pattern

## Error Handling

### Common Error Types

```typescript
// Validation errors
const validationError: ValidationResult = {
  isValid: false,
  reason: 'NOT_IN_DICTIONARY',
  word: 'ZZZZZ',
  userMessage: 'Word not found in dictionary'
};

// Bot "no move found" case
const botError: BotResult = {
  move: null,
  candidates: [],
  processingTime: 12,
  totalCandidatesGenerated: 0
};
```

### Error Recovery

```typescript
// Graceful validation handling using attemptMove() + applyMove()
const attempt = gameManager.attemptMove('INVALID');
if (!attempt.isValid) {
  showError(attempt.validationResult.userMessage || 'Invalid move');
  return;
}
gameManager.applyMove(attempt);

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

### Performance Characteristics

These are qualitative expectations from the implementation, not benchmarked/re-verified figures — treat as rules of thumb, not SLAs:
- **Word Validation**: single `Set.has()` lookup — effectively O(1)
- **Score Calculation**: pure string comparisons over short words — fast, no I/O
- **Bot Move Generation**: generates+scores+filters many move candidates per call — the most expensive engine operation
- **Dictionary Loading**: async, network-bound in the browser (`fetch('/enable1.txt')`, ~172k words) vs. filesystem-bound in Node — happens once at adapter initialization
- **Game State Updates**: synchronous in-memory mutation + listener notification

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

// Custom word list for specific tests — there is no addWords() plural helper;
// use the singular addWord()/removeWord()/clearWords() instance methods, or build
// standalone dependencies with createCustomTestDependencies()
const wordData = testAdapter.getWordData();
wordData.addWord('TEST');
wordData.addWord('WORD');
wordData.addWord('LIST');

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
  validateWord: vi.fn().mockReturnValue({ isValid: true, word: 'TEST' }),
  getRandomWordByLength: vi.fn().mockReturnValue('TEST'),
  calculateScore: vi.fn().mockReturnValue({
    score: 1,
    totalScore: 1,
    breakdown: ['Base score: 1'],
    actions: [],
    keyLetterScore: 0,
    baseScore: 1,
    keyLettersUsed: []
  }),
  getScoreForMove: vi.fn().mockReturnValue(1),
  isValidMove: vi.fn().mockReturnValue(true),
  generateBotMove: vi.fn().mockResolvedValue({
    move: { word: 'TESTS', score: 1, confidence: 0.8, reasoning: ['Added S'] },
    candidates: [],
    processingTime: 5,
    totalCandidatesGenerated: 1
  })
};
```

## Migration Guide

### Choosing the Right Adapter

```typescript
// The only adapter for all web usage
import { createBrowserAdapter } from '../adapters/browserAdapter';
const adapter = await createBrowserAdapter();

// There is no webAdapter.ts to import from — it was removed. If you find code or
// docs referencing '../adapters/webAdapter' or createWebAdapter, update it to use
// browserAdapter instead.

// For Node/CLI usage
import { NodeAdapter } from '../adapters/nodeAdapter';
const nodeAdapter = NodeAdapter.getInstance();
await nodeAdapter.initialize();

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

The web adapter consolidation this section used to recommend is **already done** — `browserAdapter.ts` is the single web adapter, and `webAdapter.ts` has been deleted (not merely aliased). Do not recreate a `webAdapter.ts`.

For the current, maintained list of known issues (test failures, `tsc -b`/ESLint errors, the `ScoringResult`/`breakdown` shape inconsistency, etc.), see `docs/project/PROJECT_STATUS_AUDIT.md` rather than this file.

---

*For the most up-to-date interfaces, always refer to `packages/engine/interfaces.ts` and the adapter implementations in `src/adapters/` — this document was last re-verified against those sources on 2026-07-14.*