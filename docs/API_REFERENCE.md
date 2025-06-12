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

Main interface that combines all engine dependencies.

```typescript
interface GameStateDependencies {
  dictionary: DictionaryDependencies;
  scoring: ScoringDependencies;
  bot: BotDependencies;
}
```

### DictionaryDependencies

Interface for word validation and dictionary operations.

```typescript
interface DictionaryDependencies {
  validateWord: (word: string, previousWord?: string, isBot?: boolean) => ValidationResult;
  isValidDictionaryWord: (word: string) => boolean;
  getRandomWordByLength: (length: number) => string;
}
```

**Methods**:
- `validateWord(word, previousWord?, isBot?)`: Validates a word against game rules
- `isValidDictionaryWord(word)`: Checks if word exists in dictionary
- `getRandomWordByLength(length)`: Returns random word of specified length

### ScoringDependencies

Interface for scoring calculations.

```typescript
interface ScoringDependencies {
  calculateScore: (previousWord: string, currentWord: string, keyLetters: string[]) => ScoreResult;
  analyzeWordChange: (previousWord: string, currentWord: string) => WordChangeAnalysis;
}
```

**Methods**:
- `calculateScore(prev, curr, keyLetters)`: Calculates points for a move
- `analyzeWordChange(prev, curr)`: Analyzes what changed between words

### BotDependencies

Interface for bot AI operations.

```typescript
interface BotDependencies extends DictionaryDependencies, ScoringDependencies {
  getTimestamp: () => number;
  random: () => number;
}
```

**Methods**:
- Inherits all dictionary and scoring methods
- `getTimestamp()`: Returns current timestamp for performance tracking
- `random()`: Returns random number 0-1 for move selection

## Platform Adapters

### Browser Adapter

For web applications using HTTP dictionary loading.

```typescript
import { createBrowserAdapter } from '@/adapters/browserAdapter';

const adapter = await createBrowserAdapter();
const dependencies = adapter.getDependencies();

// Use with engine functions
const result = generateBotMoveWithDependencies(currentWord, dependencies);
```

**Features**:
- HTTP dictionary loading (172,819 words)
- Fallback to minimal word set
- Browser-compatible timing functions
- Optimized for web performance

### Node.js Adapter

For terminal applications and server-side usage.

```typescript
import { createNodeAdapter } from '@/adapters/nodeAdapter';

const adapter = await createNodeAdapter();
const dependencies = adapter.getDependencies();

// Use with engine functions
const gameState = new LocalGameStateManagerWithDependencies(dependencies);
```

**Features**:
- File system dictionary loading
- Node.js performance timing
- ES module support
- Terminal game integration

### Test Adapter

For unit testing with controlled environments.

```typescript
import { createTestAdapter } from '@/adapters/testAdapter';

const adapter = createTestAdapter({
  customWords: ['CAT', 'CATS', 'DOG', 'DOGS'],
  enableProfanity: false
});

const dependencies = adapter.getDependencies();
```

**Features**:
- Deterministic word sets
- Configurable test scenarios
- Fast synchronous initialization
- Predictable random number generation

## Core Engine Functions

### Dictionary Functions

#### validateWordWithDependencies

```typescript
function validateWordWithDependencies(
  word: string,
  dependencies: DictionaryDependencies,
  previousWord?: string,
  isBot?: boolean
): ValidationResult
```

**Parameters**:
- `word`: Word to validate
- `dependencies`: Dictionary dependencies
- `previousWord`: Previous word in game (optional)
- `isBot`: Whether validation is for bot player (optional)

**Returns**: `ValidationResult`
```typescript
interface ValidationResult {
  isValid: boolean;
  reason?: string;
  userMessage?: string; // User-friendly error message
}
```

**Example**:
```typescript
const result = validateWordWithDependencies('CATS', dependencies, 'CAT');
// { isValid: true }

const invalid = validateWordWithDependencies('ZZZZZ', dependencies);
// { isValid: false, reason: 'not_in_dictionary', userMessage: 'not a word' }
```

### Scoring Functions

#### calculateScoreWithDependencies

```typescript
function calculateScoreWithDependencies(
  previousWord: string,
  currentWord: string,
  keyLetters: string[],
  dependencies: ScoringDependencies
): ScoreResult
```

**Parameters**:
- `previousWord`: Previous word state
- `currentWord`: New word state
- `keyLetters`: Array of current key letters
- `dependencies`: Scoring dependencies

**Returns**: `ScoreResult`
```typescript
interface ScoreResult {
  totalScore: number;
  breakdown: {
    addPoints: number;
    removePoints: number;
    rearrangePoints: number;
    keyLetterPoints: number;
  };
  analysis: WordChangeAnalysis;
}
```

**Example**:
```typescript
const score = calculateScoreWithDependencies('CAT', 'CATS', ['T'], dependencies);
// { totalScore: 2, breakdown: { addPoints: 1, keyLetterPoints: 1, ... } }
```

### Bot Functions

#### generateBotMoveWithDependencies

```typescript
function generateBotMoveWithDependencies(
  currentWord: string,
  dependencies: BotDependencies,
  options: BotOptions = {}
): BotResult
```

**Parameters**:
- `currentWord`: Current word state
- `dependencies`: Bot dependencies
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
  action: 'add' | 'remove' | 'rearrange' | 'substitute';
  score: number;
}
```

**Example**:
```typescript
const botResult = generateBotMoveWithDependencies('CAT', dependencies);
// { move: { word: 'CATS', action: 'add', score: 1 }, confidence: 0.8, ... }
```

## Game State Management

### LocalGameStateManagerWithDependencies

Main class for managing game state with dependency injection.

```typescript
class LocalGameStateManagerWithDependencies {
  constructor(dependencies: GameStateDependencies);
  
  // Game lifecycle
  startGame(config?: GameConfig): void;
  resetGame(): void;
  
  // Word management
  setWord(word: string): ValidationResult;
  getCurrentWord(): string;
  
  // Key letter management
  addKeyLetter(letter: string): void;
  removeKeyLetter(letter: string): void;
  getKeyLetters(): string[];
  
  // Locked letter management
  addLockedLetter(letter: string): void;
  removeLockedLetter(letter: string): void;
  getLockedLetters(): string[];
  
  // Turn management
  submitMove(): MoveResult;
  passTurn(): void;
  getCurrentPlayer(): Player;
  
  // Bot integration
  makeBotMove(): Promise<BotMove | null>;
  
  // Game state
  getGameState(): GameState;
  isGameActive(): boolean;
  getWinner(): Player | null;
}
```

**Example Usage**:
```typescript
import { createBrowserAdapter } from '@/adapters/browserAdapter';

const adapter = await createBrowserAdapter();
const dependencies = adapter.getDependencies();
const gameState = new LocalGameStateManagerWithDependencies(dependencies);

// Start a new game
gameState.startGame({ enableKeyLetters: true, maxTurns: 10 });

// Make a move
const result = gameState.setWord('CATS');
if (result.isValid) {
  const moveResult = gameState.submitMove();
  console.log(`Score: ${moveResult.score}`);
}

// Bot turn
const botMove = await gameState.makeBotMove();
if (botMove) {
  console.log(`Bot played: ${botMove.word}`);
}
```

## Data Types

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  reason?: 'not_in_dictionary' | 'too_short' | 'too_long' | 'invalid_characters' | 'length_change_too_large' | 'word_already_used' | 'too_many_adds' | 'too_many_removes' | 'game_not_active';
  userMessage?: string; // Human-readable error message
}
```

### ScoreResult

```typescript
interface ScoreResult {
  totalScore: number;
  breakdown: {
    addPoints: number;      // Points for adding letters
    removePoints: number;   // Points for removing letters
    rearrangePoints: number; // Points for rearranging letters
    keyLetterPoints: number; // Bonus points for using key letters
  };
  analysis: WordChangeAnalysis;
}
```

### WordChangeAnalysis

```typescript
interface WordChangeAnalysis {
  addedLetters: string[];
  removedLetters: string[];
  isRearranged: boolean;
  lengthChange: number;
  usedKeyLetters: string[];
}
```

### GameState

```typescript
interface GameState {
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  turnHistory: TurnRecord[];
  currentPlayer: Player;
  scores: { [playerId: string]: number };
  isActive: boolean;
  winner: Player | null;
  config: GameConfig;
}
```

### GameConfig

```typescript
interface GameConfig {
  enableKeyLetters: boolean;
  maxTurns: number;
  startingWord?: string;
  players: Player[];
  timeLimit?: number; // seconds per turn
}
```

## Error Handling

### Common Error Types

```typescript
// Validation errors
const validationError: ValidationResult = {
  isValid: false,
  reason: 'not_in_dictionary',
  userMessage: 'not a word'
};

// Bot errors
const botError: BotResult = {
  move: null,
  reasoning: 'No valid moves available',
  confidence: 0,
  timeElapsed: 50
};

// Game state errors
try {
  gameState.setWord('INVALID');
} catch (error) {
  console.error('Game state error:', error.message);
}
```

### Error Recovery

```typescript
// Graceful error handling
const result = validateWordWithDependencies(word, dependencies);
if (!result.isValid) {
  // Show user-friendly error message
  showError(result.userMessage || 'Invalid word');
  return;
}

// Bot fallback
const botMove = await gameState.makeBotMove();
if (!botMove) {
  // Bot couldn't move, pass turn
  gameState.passTurn();
}
```

## Performance Considerations

### Timing Targets

- **Word Validation**: <1ms per word
- **Score Calculation**: <1ms per calculation
- **Bot Move Generation**: <50ms average
- **Dictionary Loading**: <100ms (browser), <50ms (Node.js)

### Optimization Tips

```typescript
// Batch operations when possible
const words = ['CAT', 'CATS', 'DOG', 'DOGS'];
const results = words.map(word => 
  validateWordWithDependencies(word, dependencies)
);

// Use appropriate adapter for environment
const adapter = typeof window !== 'undefined' 
  ? await createBrowserAdapter()
  : await createNodeAdapter();

// Cache dependencies for repeated use
const dependencies = adapter.getDependencies();
// Reuse dependencies across multiple function calls
```

## Testing Utilities

### Test Adapter Configuration

```typescript
// Basic test setup
const testAdapter = createTestAdapter();

// Custom word list
const customAdapter = createTestAdapter({
  customWords: ['TEST', 'WORD', 'LIST'],
  enableProfanity: false
});

// Deterministic random
const deterministicAdapter = createTestAdapter({
  randomSeed: 12345
});
```

### Mock Dependencies

```typescript
// Create mock dependencies for testing
const mockDependencies: GameStateDependencies = {
  dictionary: {
    validateWord: jest.fn().mockReturnValue({ isValid: true }),
    isValidDictionaryWord: jest.fn().mockReturnValue(true),
    getRandomWordByLength: jest.fn().mockReturnValue('TEST')
  },
  scoring: {
    calculateScore: jest.fn().mockReturnValue({ totalScore: 1 }),
    analyzeWordChange: jest.fn().mockReturnValue({ addedLetters: ['S'] })
  },
  bot: {
    // ... include all required methods
  }
};
```

## Migration Guide

### From Legacy Engine

```typescript
// Old approach (deprecated)
import { validateWord } from '@/engine/dictionary';
const result = validateWord('CATS');

// New approach (recommended)
import { validateWordWithDependencies } from '@/engine/dictionary';
import { createBrowserAdapter } from '@/adapters/browserAdapter';

const adapter = await createBrowserAdapter();
const dependencies = adapter.getDependencies();
const result = validateWordWithDependencies('CATS', dependencies);
```

### Adapter Selection

```typescript
// Choose adapter based on environment
let adapter;
if (typeof window !== 'undefined') {
  // Browser environment
  adapter = await createBrowserAdapter();
} else if (typeof process !== 'undefined') {
  // Node.js environment
  adapter = await createNodeAdapter();
} else {
  // Test environment
  adapter = createTestAdapter();
}
```

---

*This API reference covers the core interfaces and functions. For implementation examples, see the source code in `packages/engine/` and `src/adapters/`.* 