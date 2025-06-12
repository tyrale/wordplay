/**
 * WordPlay Engine Interfaces
 * 
 * This module defines all the dependency contracts between engine components
 * and platform adapters. These interfaces ensure type safety and enable
 * dependency injection for platform-agnostic engine design.
 */

// =============================================================================
// CORE RESULT TYPES
// =============================================================================

export type GameStatus = 'ready' | 'playing' | 'finished';

export type ValidationResult = 
  | { isValid: true; word: string; censored?: string; }
  | { 
    isValid: false; 
    reason: 'NOT_IN_DICTIONARY' | 'ALREADY_PLAYED' | 'TOO_MANY_ADDS' | 'TOO_MANY_REMOVES' | 'INVALID_CHARACTERS' | 'TOO_SHORT' | 'EMPTY_WORD' | 'GAME_NOT_PLAYING' | 'NO_PLAYER' | 'LENGTH_CHANGE_TOO_LARGE';
    word: string; 
    userMessage: string;
  };

export interface ScoringResult {
  score: number;
  breakdown: ScoringBreakdown;
  actions: string[];
}

export interface ScoringBreakdown {
  addLetterPoints: number;
  removeLetterPoints: number;
  movePoints: number;
  keyLetterBonus: number;
  total: number;
}

export interface WordAnalysis {
  addedLetters: string[];
  removedLetters: string[];
  rearrangedLetters: boolean;
  usedKeyLetters: string[];
}

export interface BotMove {
  word: string;
  score: number;
  confidence: number;
  reasoning: string[];
}

export interface BotResult {
  move: BotMove | null;
  executionTime: number;
}

export interface MoveCandidate {
  word: string;
  type: 'add' | 'remove' | 'rearrange' | 'substitute';
  operations: string[];
}

// =============================================================================
// DEPENDENCY INTERFACES
// =============================================================================

/**
 * Dictionary validation dependencies
 * Platform adapters must provide these functions
 */
export interface DictionaryDependencies {
  /**
   * Validate a word according to game rules
   * @param word - Word to validate
   * @param options - Validation options (isBot, previousWord, etc.)
   * @returns Validation result with success/failure and reason
   */
  validateWord(word: string, options?: ValidationOptions): ValidationResult;
  
  /**
   * Check if word exists in dictionary (synchronous)
   * @param word - Word to check
   * @returns true if word exists in dictionary
   */
  isValidDictionaryWord(word: string): boolean;
  
  /**
   * Get random word of specified length (for game initialization)
   * @param length - Desired word length
   * @returns Random word or null if none available
   */
  getRandomWordByLength(length: number): string | null;
  
  /**
   * Get total number of words in dictionary (for debugging)
   * @returns Total word count
   */
  getWordCount(): number;
}

/**
 * Performance and utility dependencies
 * Platform adapters provide platform-specific implementations
 */
export interface UtilityDependencies {
  /**
   * Get current timestamp (for performance measurement)
   * @returns Timestamp in milliseconds
   */
  getTimestamp(): number;
  
  /**
   * Generate random number (for deterministic testing)
   * @returns Random number between 0 and 1
   */
  random(): number;
  
  /**
   * Log message (optional, for debugging)
   * @param message - Message to log
   */
  log?(message: string): void;
}

/**
 * Scoring dependencies
 * Platform adapters provide these if scoring needs platform-specific behavior
 */
export interface ScoringDependencies {
  /**
   * Calculate score for a move (usually platform-agnostic)
   * @param fromWord - Starting word
   * @param toWord - Ending word  
   * @param keyLetters - Available key letters
   * @param lockedLetters - Letters that cannot be removed
   * @returns Scoring result with breakdown
   */
  calculateScore?(fromWord: string, toWord: string, keyLetters: string[], lockedLetters: string[]): ScoringResult;
}

/**
 * Combined dependencies for bot AI
 * All dependencies the bot needs to generate moves
 */
export interface BotDependencies extends DictionaryDependencies, UtilityDependencies {
  // Bot-specific dependencies can be added here
}

/**
 * Combined dependencies for complete game engine
 * All dependencies needed for full game functionality
 */
export interface GameEngineDependencies extends BotDependencies, ScoringDependencies {
  // Game engine specific dependencies can be added here
}

// =============================================================================
// OPTIONS AND CONFIGURATION
// =============================================================================

export interface ValidationOptions {
  isBot?: boolean;
  previousWord?: string;
  allowSlang?: boolean;
  profanityFilter?: boolean;
}

export interface BotOptions {
  keyLetters?: string[];
  lockedLetters?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  maxCandidates?: number;
  timeLimit?: number;
}

export interface ScoringOptions {
  keyLetters?: string[];
}

export interface GameEngineOptions {
  scoring?: ScoringOptions;
  bot?: BotOptions;
  validation?: ValidationOptions;
}

// =============================================================================
// ADAPTER INTERFACES
// =============================================================================

/**
 * Bot engine interface
 * What consumers get from bot adapters
 */
export interface BotEngine {
  /**
   * Generate next move for bot
   * @param currentWord - Current word in game
   * @param options - Bot generation options
   * @returns Bot result with move and analysis
   */
  generateBotMove(currentWord: string, options?: BotOptions): BotResult;
  
  /**
   * Explain bot's decision making process
   * @param currentWord - Current word in game
   * @param options - Bot options
   * @returns Analysis of bot's reasoning
   */
  explainBotMove(currentWord: string, options?: BotOptions): {
    analysis: string;
    topMoves: BotMove[];
    reasoning: string[];
  };
  
  /**
   * Generate specific types of moves
   * @param currentWord - Current word
   * @returns Available move candidates
   */
  generateMoveCandidates(currentWord: string): {
    addMoves: MoveCandidate[];
    removeMoves: MoveCandidate[];
    rearrangeMoves: MoveCandidate[];
    substituteMoves: MoveCandidate[];
  };
}

/**
 * Scoring engine interface
 * What consumers get from scoring adapters
 */
export interface ScoringEngine {
  /**
   * Calculate score for a word change
   * @param fromWord - Starting word
   * @param toWord - Ending word
   * @param keyLetters - Available key letters
   * @param lockedLetters - Locked letters
   * @returns Scoring result
   */
  calculateScore(fromWord: string, toWord: string, keyLetters: string[], lockedLetters: string[]): ScoringResult;
  
  /**
   * Analyze what changed between two words
   * @param fromWord - Starting word
   * @param toWord - Ending word
   * @returns Analysis of changes
   */
  analyzeWordChange(fromWord: string, toWord: string): WordAnalysis;
  
  /**
   * Get score for a specific move candidate
   * @param move - Move candidate to score
   * @param context - Scoring context
   * @returns Numerical score
   */
  getScoreForMove(move: MoveCandidate, context: { currentWord: string; keyLetters: string[] }): number;
}

/**
 * Dictionary engine interface
 * What consumers get from dictionary adapters
 */
export interface DictionaryEngine {
  /**
   * Validate a word
   * @param word - Word to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validateWord(word: string, options?: ValidationOptions): ValidationResult;
  
  /**
   * Check if word is in dictionary
   * @param word - Word to check
   * @returns true if valid dictionary word
   */
  isValidDictionaryWord(word: string): boolean;
  
  /**
   * Get random word for game initialization
   * @param length - Desired length
   * @returns Random word or null
   */
  getRandomWordByLength(length: number): string | null;
  
  /**
   * Get dictionary statistics
   * @returns Dictionary information
   */
  getDictionaryInfo(): {
    wordCount: number;
    isLoaded: boolean;
    loadTime?: number;
  };
}

/**
 * Complete game engine interface
 * What consumers get from full game engine adapters
 */
export interface GameEngine extends BotEngine, ScoringEngine, DictionaryEngine {
  /**
   * Initialize the engine (load dictionaries, etc.)
   * @returns Promise that resolves when engine is ready
   */
  initialize(): Promise<void>;
  
  /**
   * Check if engine is ready to use
   * @returns true if engine is initialized and ready
   */
  isReady(): boolean;
  
  /**
   * Get engine information and status
   * @returns Engine status and configuration
   */
  getEngineInfo(): {
    platform: string;
    version: string;
    isReady: boolean;
    dependencies: {
      dictionary: boolean;
      scoring: boolean;
      bot: boolean;
    };
  };
}

// =============================================================================
// ADAPTER FACTORY TYPES
// =============================================================================

/**
 * Adapter factory function type
 * How platform adapters are created
 */
export type AdapterFactory<T = GameEngine> = (config?: any) => T;

/**
 * Platform adapter configuration
 * Common configuration for all adapters
 */
export interface AdapterConfig {
  /**
   * Dictionary configuration
   */
  dictionary?: {
    source?: string; // URL, file path, etc.
    fallbackWords?: string[];
    enableSlang?: boolean;
    profanityFilter?: boolean;
  };
  
  /**
   * Performance configuration
   */
  performance?: {
    enableLogging?: boolean;
    timeoutMs?: number;
    maxCandidates?: number;
  };
  
  /**
   * Testing configuration
   */
  testing?: {
    deterministic?: boolean;
    mockTimestamp?: number;
    mockRandom?: () => number;
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate that dependencies object implements required interface
 * @param dependencies - Dependencies to validate
 * @param requiredMethods - Required method names
 * @throws Error if dependencies are invalid
 */
export function validateDependencies(
  dependencies: any, 
  requiredMethods: string[]
): asserts dependencies is GameEngineDependencies {
  for (const method of requiredMethods) {
    if (typeof dependencies[method] !== 'function') {
      throw new Error(`Dependencies.${method} must be a function`);
    }
  }
}

/**
 * Create default utility dependencies for testing
 * @param overrides - Override specific dependencies
 * @returns Utility dependencies with defaults
 */
export function createDefaultUtilityDependencies(
  overrides: Partial<UtilityDependencies> = {}
): UtilityDependencies {
  return {
    getTimestamp: () => Date.now(),
    random: Math.random,
    log: console.log,
    ...overrides
  };
}

/**
 * Create deterministic dependencies for testing
 * @param config - Test configuration
 * @returns Complete test dependencies for game state manager
 */
export function createTestDependencies(config: {
  timestamp?: number;
  randomSeed?: number;
  validWords?: string[];
}): any {
  const { timestamp = 1000, randomSeed = 0.5, validWords = ['CAT', 'CATS', 'DOG', 'DOGS'] } = config;
  
  // Enhanced validation function that checks both dictionary and character validation
  const validateWord = (word: string, options: ValidationOptions = {}): ValidationResult => {
    const normalizedWord = word.trim().toUpperCase();
    const { isBot = false, previousWord } = options;

    // Bots can bypass all validation
    if (isBot) {
      return { isValid: true, word: normalizedWord };
    }

    // Empty word check
    if (!normalizedWord) {
      return {
        isValid: false,
        word: normalizedWord,
        reason: 'EMPTY_WORD',
        userMessage: 'word cannot be empty'
      };
    }

    // Character validation - only letters allowed for humans
    if (!/^[A-Z]+$/.test(normalizedWord)) {
      return {
        isValid: false,
        word: normalizedWord,
        reason: 'INVALID_CHARACTERS',
        userMessage: 'only letters allowed'
      };
    }

    // Length validation - minimum 3 letters
    if (normalizedWord.length < 3) {
      return {
        isValid: false,
        word: normalizedWord,
        reason: 'TOO_SHORT',
        userMessage: 'too short'
      };
    }

    // Length change validation is now handled by move action validation in gamestate.ts
    // so we skip it here to avoid conflicts

    // Dictionary check
    const isValid = validWords.includes(normalizedWord);
    return isValid 
      ? { isValid: true, word: normalizedWord }
      : { 
        isValid: false, 
        word: normalizedWord, 
        reason: 'NOT_IN_DICTIONARY',
        userMessage: 'not a word'
      };
  };

  return {
    // Dictionary dependencies (flat structure)
    validateWord,
    getRandomWordByLength: (length: number) => validWords.find(w => w.length === length) || null,
    
    // Scoring dependencies (flat structure)
    calculateScore: (fromWord: string, toWord: string, options: any = {}) => {
      // Simple scoring for tests - return ScoringResult format from gamestate.ts
      const { keyLetters = [] } = options;
      let score = 1; // Base score for any move
      
      // Add key letter bonus
      const keyLetterBonus = keyLetters.filter((letter: string) => 
        toWord.toUpperCase().includes(letter.toUpperCase())
      ).length;
      
      return {
        totalScore: score + keyLetterBonus,
        breakdown: {
          addLetterPoints: fromWord.length < toWord.length ? 1 : 0,
          removeLetterPoints: fromWord.length > toWord.length ? 1 : 0,
          movePoints: fromWord.length === toWord.length ? 1 : 0,
          keyLetterUsagePoints: keyLetterBonus
        },
        actions: ['test-action'],
        keyLettersUsed: keyLetters.filter((letter: string) => 
          toWord.toUpperCase().includes(letter.toUpperCase())
        )
      };
    },
    getScoreForMove: (fromWord: string, toWord: string, keyLetters: string[] = []) => {
      return 1 + keyLetters.filter(letter => 
        toWord.toUpperCase().includes(letter.toUpperCase())
      ).length;
    },
    isValidMove: (fromWord: string, toWord: string) => {
      // Simple move validation for tests
      return Math.abs(fromWord.length - toWord.length) <= 1;
    },

    // Bot dependencies (flat structure)
    generateBotMove: async (currentWord: string, options: any = {}) => {
      // Simple bot that just adds an 'S' if possible
      const candidate = currentWord + 'S';
      if (validWords.includes(candidate)) {
        return {
          move: {
            word: candidate,
            score: 1,
            confidence: 0.8,
            reasoning: ['Adding S']
          },
          candidates: [],
          processingTime: 10,
          totalCandidatesGenerated: 1
        };
      }
      return {
        move: null,
        candidates: [],
        processingTime: 10,
        totalCandidatesGenerated: 0
      };
    }
  };
}

export interface IGameState {
  // Game state properties
  currentWord: string;
  // ... existing code ...
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  score: number;
  isCurrentPlayer: boolean;
}

export interface GameState {
  gameId: string;
  config: GameConfig;
  gameStatus: 'waiting' | 'playing' | 'finished';
  players: Player[];
  currentTurn: number;
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  usedWords: Set<string>;
  usedKeyLetters: Set<string>;
  turnHistory: TurnHistory[];
  gameStartTime: number | null;
  lastMoveTime: number | null;
  winner: Player | null;
  totalMoves: number;
}

export interface GameStateDictionaryDependencies {
  validateWord: (word: string) => ValidationResult;
  getRandomWordByLength: (length: number) => string | null;
}

export interface GameStateScoringDependencies {
  calculateScore: (previousWord: string, currentWord: string, options: ScoringOptions) => ScoringResult;
  isValidMove: (previousWord: string, currentWord: string) => boolean;
}

export interface GameStateBotDependencies {
  generateBotMove: (currentWord: string, options: BotOptions) => Promise<BotResult>;
}

export interface GameStateDependencies {
  dictionary: GameStateDictionaryDependencies;
  scoring: GameStateScoringDependencies;
  bot: GameStateBotDependencies;
}

export interface GameStateUpdate {
  type: string;
  data: any;
  timestamp: number;
}

export interface GameConfig {
  maxTurns?: number;
  initialWord?: string;
  players?: Player[];
  allowBotPlayer?: boolean;
  enableKeyLetters?: boolean;
  enableLockedLetters?: boolean;
  allowProfanity?: boolean;
}

export interface TurnHistory {
  turnNumber: number;
  playerId: string;
  previousWord: string;
  newWord: string;
  score: number;
  scoringBreakdown: ScoringResult;
  timestamp: number;
}

export interface IGameStateManager {
  subscribe(listener: (update: GameStateUpdate) => void): () => void;
  getState(): GameState;
  startGame(initialWord?: string): void;
  resetGame(config?: GameConfig): void;
  passTurn(): boolean;
  applyMove(word: string): ScoringResult | null;
  validateMove(word: string): ValidationResult;
  makeBotMove(): Promise<BotMove | null>;
  getCurrentPlayer(): Player | null;
  getWinner(): Player | null;
  addPlayer(name: string, isBot: boolean): void;
  addKeyLetter(letter: string): void;
  removeKeyLetter(letter: string): void;
  addLockedLetter(letter: string): void;
  removeLockedLetter(letter: string): void;
}

/**
 * Unlock System Interfaces
 * 
 * Platform-agnostic unlock system that tracks user progress
 * and manages feature unlocks across themes, mechanics, and bots.
 */

export interface UnlockState {
  themes: string[];        // Theme names that are unlocked (e.g., ['red', 'blue'])
  mechanics: string[];     // Mechanic IDs that are unlocked (e.g., ['5-letter-start'])
  bots: string[];         // Bot IDs that are unlocked (e.g., ['easy-bot', 'pirate-bot'])
  achievements: string[]; // Achievement IDs that are earned (e.g., ['beat-tester'])
}

export interface UnlockTrigger {
  type: 'word' | 'achievement';
  value: string;           // Word to play OR achievement to earn
  timing: 'word_submission' | 'game_completion';
}

export interface UnlockDefinition {
  id: string;              // Unique identifier for this unlock
  category: 'theme' | 'mechanic' | 'bot';
  trigger: UnlockTrigger;
  target: string;          // Theme name, mechanic ID, or bot ID to unlock
  immediate_effect?: {
    type: 'apply_theme';
    value: string;         // Theme name to apply immediately
  };
}

export interface UnlockResult {
  unlockId: string;
  category: 'theme' | 'mechanic' | 'bot';
  target: string;
  wasAlreadyUnlocked: boolean;
  immediateEffect?: {
    type: 'apply_theme';
    value: string;
  };
}

export interface UnlockDependencies {
  loadState(): Promise<UnlockState>;
  saveState(state: UnlockState): Promise<void>;
  getTimestamp(): number;
}

export interface UnlockEngine {
  // Initialization
  initialize(): Promise<void>;
  
  // Trigger checking
  checkWordTriggers(word: string): Promise<UnlockResult[]>;
  checkAchievementTriggers(achievement: string): Promise<UnlockResult[]>;
  
  // State queries
  getUnlockedItems(category: 'theme' | 'mechanic' | 'bot'): string[];
  isUnlocked(category: 'theme' | 'mechanic' | 'bot', itemId: string): boolean;
  getCurrentState(): UnlockState;
  
  // Admin/Debug
  resetState(): Promise<void>;
} 