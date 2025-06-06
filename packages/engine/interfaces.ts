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

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  word: string;
  censored?: string;
}

export interface ScoringResult {
  score: number;
  breakdown: ScoringBreakdown;
  actions: string[];
}

export interface ScoringBreakdown {
  addLetterPoints: number;
  removeLetterPoints: number;
  rearrangePoints: number;
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
  candidates: BotMove[];
  processingTime: number;
  totalCandidatesGenerated: number;
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
  usedWords?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  maxCandidates?: number;
  timeLimit?: number; // milliseconds
}

export interface ScoringOptions {
  keyLetterBonus?: number;
  addLetterPoints?: number;
  removeLetterPoints?: number;
  rearrangePoints?: number;
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
 * @returns Deterministic dependencies for tests
 */
export function createTestDependencies(config: {
  timestamp?: number;
  randomSeed?: number;
  validWords?: string[];
}): Partial<GameEngineDependencies> {
  const { timestamp = 1000, randomSeed = 0.5, validWords = ['CAT', 'CATS', 'DOG', 'DOGS'] } = config;
  
  return {
    getTimestamp: () => timestamp,
    random: () => randomSeed,
    log: () => {}, // Silent in tests
    validateWord: (word) => ({
      isValid: validWords.includes(word.toUpperCase()),
      word: word.toUpperCase(),
      reason: validWords.includes(word.toUpperCase()) ? 'Valid word' : 'Not in test dictionary'
    }),
    isValidDictionaryWord: (word) => validWords.includes(word.toUpperCase()),
    getRandomWordByLength: (length) => validWords.find(w => w.length === length) || null,
    getWordCount: () => validWords.length
  };
} 