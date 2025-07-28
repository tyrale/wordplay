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

export type GameStatus = 'ready' | 'waiting' | 'playing' | 'finished';

export interface ValidationResult {
  isValid: boolean;
  reason?: 'NOT_IN_DICTIONARY' | 'ALREADY_PLAYED' | 'TOO_MANY_ADDS' | 'TOO_MANY_REMOVES' | 'INVALID_CHARACTERS' | 'TOO_SHORT' | 'EMPTY_WORD' | 'GAME_NOT_PLAYING' | 'NO_PLAYER' | 'LENGTH_CHANGE_TOO_LARGE' | 'INVALID_MOVE' | string;
  word: string;
  userMessage?: string;
  censored?: string;
}

export interface ScoringResult {
  score: number;
  totalScore: number;
  breakdown: string[] | Record<string, number>; // Support both old and new formats
  actions: ScoringAction[];
  keyLetterScore: number;
  baseScore: number;
  keyLettersUsed: string[];
}

export interface ScoringAction {
  type: 'add' | 'remove' | 'rearrange' | 'substitute' | 'key-letter';
  letters?: string[];
  score: number;
}

export interface WordAnalysis {
  addedLetters: string[];
  removedLetters: string[];
  isMoved: boolean;
  keyLettersUsed: string[];
  // New interface compatibility
  added: string[];
  removed: string[];
  rearranged: boolean;
  substituted: { from: string; to: string }[];
  valid: boolean;
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
// DEPENDENCY INTERFACES - CONSOLIDATED
// =============================================================================

/**
 * Word data dependencies interface
 * Platform adapters must provide word sets for validation
 */
export interface WordDataDependencies {
  enableWords: Set<string>;
  slangWords: Set<string>;
  profanityWords: Set<string>;
  wordCount: number;
}

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
  
  /**
   * Get simple numeric score for a move (used by bot AI)
   */
  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]) => number;
}

/**
 * Combined dependencies for bot AI
 * All dependencies the bot needs to generate moves
 */
export interface BotDependencies extends DictionaryDependencies, UtilityDependencies, ScoringDependencies {
  // Bot-specific dependencies can be added here
  getWordCount: () => number;
  getTimestamp: () => number;
  random: () => number;
}

/**
 * Combined dependencies for complete game engine
 * All dependencies needed for full game functionality
 */
export interface GameEngineDependencies extends BotDependencies, ScoringDependencies {
  // Game engine specific bot functions  
  generateBotMove?: (currentWord: string, options?: any) => Promise<BotResult>;
}

// =============================================================================
// GAME STATE INTERFACES - CONSOLIDATED
// =============================================================================

/**
 * Dictionary dependencies for game state management
 * CONSOLIDATED: Matches adapter expectations with consistent signatures
 */
export interface GameStateDictionaryDependencies {
  validateWord: (word: string, options?: any) => ValidationResult;
  getRandomWordByLength: (length: number) => string | null;
}

/**
 * Scoring dependencies for game state management
 * CONSOLIDATED: Matches adapter expectations with consistent signatures
 */
export interface GameStateScoringDependencies {
  calculateScore: (fromWord: string, toWord: string, options?: any) => ScoringResult;
  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]) => number;
  isValidMove: (fromWord: string, toWord: string) => boolean;
}

/**
 * Bot dependencies for game state management
 * CONSOLIDATED: Matches adapter expectations with consistent signatures
 */
export interface GameStateBotDependencies {
  generateBotMove: (word: string, options?: any) => Promise<BotResult>;
}

/**
 * Complete dependencies interface for game state
 * CONSOLIDATED: Unified flat structure that adapters actually use
 */
export interface GameStateDependencies extends 
  GameStateDictionaryDependencies, 
  GameStateScoringDependencies, 
  GameStateBotDependencies {
}

// =============================================================================
// OPTIONS INTERFACES
// =============================================================================

export interface ValidationOptions {
  isBot?: boolean;
  previousWord?: string;
  allowProfanity?: boolean;
  customValidator?: (word: string) => boolean;
}

export interface ScoringOptions {
  keyLetters?: string[];
  lockedLetters?: string[];
  bonusMultiplier?: number;
  penaltyMultiplier?: number;
}

export interface BotOptions {
  keyLetters?: string[];
  lockedLetters?: string[];
  maxCandidates?: number;
  timeLimit?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
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
 * Platform adapter registry
 * Maps platform names to adapter factories
 */
export interface AdapterRegistry {
  [platform: string]: AdapterFactory;
}

/**
 * Platform detection function type
 * How the system determines current platform
 */
export type PlatformDetector = () => string;

/**
 * Cross-platform configuration
 * Settings that apply across all platforms
 */
export interface CrossPlatformConfig {
  enableLogging?: boolean;
  enablePerformanceTracking?: boolean;
  defaultDictionarySize?: number;
  enableCaching?: boolean;
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
 * Test configuration factory
 * Creates consistent test configurations across platforms
 */
export function createTestConfig(overrides?: Partial<GameEngineOptions>): GameEngineOptions {
  const validWords = ['CAT', 'CATS', 'DOG', 'DOGS'];
  
  // Mock implementation for testing
  const defaultConfig: GameEngineOptions = {
    validation: {
      customValidator: (word: string) => {
        return validWords.includes(word.toUpperCase());
      }
    },
    scoring: {
      keyLetters: [],
      lockedLetters: []
    },
    bot: {
      difficulty: 'easy' as const,
      maxCandidates: 10
    }
  };

  return { ...defaultConfig, ...overrides };
}

/**
 * Mock dependencies factory  
 * Creates mock dependencies for testing
 */
export function createMockDependencies(): GameEngineDependencies {
  const testWords = new Set(['CAT', 'CATS', 'DOG', 'DOGS', 'BAT', 'BATS']);
  
  return {
    validateWord: (word: string, options?: ValidationOptions) => {
      const normalizedWord = word.trim().toUpperCase();
      
      if (normalizedWord.length === 0) {
        return { isValid: false, reason: 'EMPTY_WORD', word: normalizedWord };
      }
      
      if (testWords.has(normalizedWord)) {
        return { isValid: true, word: normalizedWord };
      }
      
      return { isValid: false, reason: 'NOT_IN_DICTIONARY', word: normalizedWord };
    },
    
    isValidDictionaryWord: (word: string) => {
      return testWords.has(word.toUpperCase());
    },
    
    getRandomWordByLength: (length: number) => {
      const words = Array.from(testWords).filter(w => w.length === length);
      return words.length > 0 ? words[0] : null;
    },
    
    getWordCount: () => testWords.size,
    
    getTimestamp: () => Date.now(),
    random: () => Math.random(),
    
         calculateScore: (fromWord: string, toWord: string, keyLetters: string[] = []) => {
       return { score: 1, totalScore: 1, breakdown: ['Base score: 1'], actions: [], keyLetterScore: 0, baseScore: 1, keyLettersUsed: [] };
     },
    
    getScoreForMove: (fromWord: string, toWord: string, keyLetters: string[] = []) => {
      return 1; // Simple scoring for tests
    },
    
    generateBotMove: async (currentWord: string, options: any = {}) => {
      // Simple bot that tries to add 'S'
      const candidate = currentWord + 'S';
      const candidateMove = { word: candidate, score: 1, confidence: 0.8, reasoning: ['Added S'] };
      
      if (testWords.has(candidate)) {
        return {
          move: candidateMove,
          candidates: [candidateMove],
          processingTime: 5,
          totalCandidatesGenerated: 1
        };
      }
      
      return {
        move: null,
        candidates: [],
        processingTime: 5,
        totalCandidatesGenerated: 0
      };
    }
  };
}

// =============================================================================
// GAME STATE INTERFACES  
// =============================================================================

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  score: number;
  isCurrentPlayer: boolean;
}

export interface GameState {
  gameStatus: GameStatus;
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  players: Player[];
  currentPlayerIndex: number;
  currentTurn: number;
  maxTurns: number;
  usedWords: Set<string>;
  usedKeyLetters: Set<string>;
  turnHistory: TurnHistory[];
  gameStartTime: number | null;
  lastMoveTime: number | null;
  winner: Player | null;
  totalMoves: number;
  config: GameConfig;
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
  keyLettersUsed: string[];
  scoringBreakdown: ScoringResult;
  timestamp: number;
}

export interface MoveAttempt {
  newWord: string;
  isValid: boolean;
  validationResult: ValidationResult;
  scoringResult: ScoringResult | null;
  canApply: boolean;
  reason?: string;
}

// Event system for state change notifications
export type GameStateListener = (update: GameStateUpdate) => void;

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
  achievements: string[]; // Achievement IDs that are earned (e.g., ['beat-basicBot'])
}

export interface UnlockResult {
  category: 'theme' | 'mechanic' | 'bot';
  itemId: string;
  name: string;
  description: string;
  isNew: boolean; // true if this is a new unlock, false if already unlocked
  target?: string; // Old format compatibility
  immediateEffect?: {
    type: string;
    value: string;
  }; // Old format compatibility
  unlockId?: string; // Old format compatibility
}

export interface UnlockTrigger {
  type: 'word' | 'achievement';
  condition?: string; // New format
  value?: string; // Old format compatibility
  timing?: string; // Old format compatibility
  unlocks?: Array<{
    category: 'theme' | 'mechanic' | 'bot';
    itemId: string;
  }>; // New format
}

export interface UnlockDefinition {
  id?: string; // Old format compatibility
  trigger: UnlockTrigger;
  category: 'theme' | 'mechanic' | 'bot';
  itemId?: string; // Made optional for backward compatibility
  name?: string; // Made optional for backward compatibility
  description?: string; // Made optional for backward compatibility
  target?: string; // Old format compatibility
  immediate_effect?: {
    type: string;
    value: string;
  }; // Old format compatibility
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