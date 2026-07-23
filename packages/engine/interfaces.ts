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

export interface ScoringBreakdown {
  addLetterPoints: number;
  removeLetterPoints: number;
  movePoints: number;
  keyLetterUsagePoints: number;
}

export interface ScoringResult {
  score: number;
  totalScore: number;
  breakdown: ScoringBreakdown;
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
  properNounWords: Set<string>;
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
   * @param options - Scoring options (key letters, locked letters, etc.)
   * @returns Scoring result with breakdown
   */
  calculateScore?(fromWord: string, toWord: string, options?: ScoringOptions): ScoringResult;
  
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
  
  /**
   * Check if a word is profanity
   * @param word - Word to check for profanity
   * @returns true if word is profanity
   */
  isProfanity?: (word: string) => boolean;
}

/**
 * Combined dependencies for complete game engine
 * All dependencies needed for full game functionality
 */
export interface GameEngineDependencies extends BotDependencies, ScoringDependencies {
  // Game engine specific bot functions  
  generateBotMove?: (currentWord: string, options?: BotOptions) => Promise<BotResult>;
}

// =============================================================================
// GAME STATE INTERFACES - CONSOLIDATED
// =============================================================================

/**
 * Dictionary dependencies for game state management
 * CONSOLIDATED: Matches adapter expectations with consistent signatures
 */
export interface GameStateDictionaryDependencies {
  validateWord: (word: string, options?: ValidationOptions) => ValidationResult;
  getRandomWordByLength: (length: number) => string | null;
}

/**
 * Scoring dependencies for game state management
 * CONSOLIDATED: Matches adapter expectations with consistent signatures
 */
export interface GameStateScoringDependencies {
  calculateScore: (fromWord: string, toWord: string, options?: ScoringOptions) => ScoringResult;
  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]) => number;
  isValidMove: (fromWord: string, toWord: string) => boolean;
}

/**
 * Bot dependencies for game state management
 * CONSOLIDATED: Matches adapter expectations with consistent signatures
 */
export interface GameStateBotDependencies {
  generateBotMove: (word: string, options?: BotOptions) => Promise<BotResult>;
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
  /** Which bot (see src/data/botRegistry.ts) is playing, used to select its strategy in bot.ts */
  botId?: string;
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
    validateWord: (word: string, _options?: ValidationOptions) => {
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
    
    calculateScore: (_fromWord: string, _toWord: string, _options: ScoringOptions = {}) => {
      return {
        score: 1,
        totalScore: 1,
        breakdown: { addLetterPoints: 1, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 0 },
        actions: [],
        keyLetterScore: 0,
        baseScore: 1,
        keyLettersUsed: []
      };
    },
    
    getScoreForMove: (_fromWord: string, _toWord: string, _keyLetters: string[] = []) => {
      return 1; // Simple scoring for tests
    },
    
    generateBotMove: async (currentWord: string, _options: BotOptions = {}) => {
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
  usedWords: string[];
  usedKeyLetters: string[];
  turnHistory: TurnHistory[];
  gameStartTime: number | null;
  lastMoveTime: number | null;
  winner: Player | null;
  totalMoves: number;
  config: GameConfig;
}

export interface GameStateUpdate {
  type: string;
  data: Record<string, unknown>;
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
  /** Which bot (see src/data/botRegistry.ts) the human is playing against, forwarded to generateBotMove() */
  botId?: string;
  /** Desired length of the randomly-generated starting word, used when initialWord isn't set. Defaults to 4. */
  startingWordLength?: number;
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

/**
 * Remote Multiplayer (vs Human) Interfaces
 *
 * Platform-agnostic contracts for the async, turn-based "vs human" game
 * manager (`RemoteGameStateManager` in `remoteGamestate.ts`). Mirrors the
 * shape of `GameStateDependencies` but talks to a persisted, shared game
 * (e.g. Supabase) instead of an in-memory bot.
 */

export interface RemoteGameTurnRecord {
  turnNumber: number;
  playerId: string;
  previousWord: string;
  newWord: string;
  scoreEarned: number;
  keyLetterUsed: string | null;
  timestamp: number;
}

export interface RemoteGamePlayerInfo {
  /** Matches the platform's user id (e.g. Supabase auth.uid()) */
  id: string;
  name: string;
  playerIndex: number;
  score: number;
}

export type RemoteGameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export interface RemoteGameSnapshot {
  gameId: string;
  status: RemoteGameStatus;
  currentWord: string;
  usedWords: string[];
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  currentTurn: number;
  currentPlayerIndex: number;
  maxTurns: number;
  players: RemoteGamePlayerInfo[];
  turnHistory: RemoteGameTurnRecord[];
  winnerId: string | null;
}

export interface RemoteGameUpdatedFields {
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  usedWords: string[];
  currentTurn: number;
  currentPlayerIndex: number;
  status: RemoteGameStatus;
  winnerId: string | null;
}

export interface RemoteGameDependencies {
  /** Get the local player's platform user id (must be stable/authenticated) */
  getLocalPlayerId(): string;

  /** Fetch the full current state of a game (players + turn history) */
  fetchGame(gameId: string): Promise<RemoteGameSnapshot>;

  /**
   * Persist a completed move: writes a turn record and the resulting
   * derived game fields. Implementations should perform this as close to
   * atomically as the platform allows (e.g. a single RPC/transaction).
   */
  persistMove(
    gameId: string,
    turn: RemoteGameTurnRecord,
    updatedFields: RemoteGameUpdatedFields
  ): Promise<void>;

  /**
   * Subscribe to remote changes (opponent moves) for this game.
   * `onChange` should be called whenever the remote game may have changed;
   * the manager re-fetches and reconciles rather than trusting push payloads.
   * Returns an unsubscribe function.
   */
  subscribeToGame(gameId: string, onChange: () => void): () => void;

  /** Mark the game abandoned (resign/forfeit) */
  abandonGame(gameId: string, resigningPlayerId: string): Promise<void>;
}

export interface IGameStateManager {
  subscribe(listener: (update: GameStateUpdate) => void): () => void;
  getState(): GameState;
  startGame(initialWord?: string): void;
  resetGame(config?: GameConfig): void;
  passTurn(): boolean;
  attemptMove(newWord: string): MoveAttempt;
  applyMove(wordOrAttempt: string | MoveAttempt): boolean;
  setWord(word: string): boolean;
  validateMove(word: string): ValidationResult;
  makeBotMove(): Promise<BotMove | null>;
  getCurrentPlayer(): Player | null;
  addKeyLetter(letter: string): void;
  removeKeyLetter(letter: string): void;
  addLockedLetter(letter: string): void;
  removeLockedLetter(letter: string): void;
  loadState(state: GameState): void;
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
  reveals: string[];      // Menu-preview reveals unlocked (e.g., ['bots', 'themes', 'mechanics'])
}

export interface UnlockResult {
  category: 'theme' | 'mechanic' | 'bot' | 'reveal';
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
  wasAlreadyUnlocked?: boolean;
}

export interface UnlockTrigger {
  type: 'word' | 'achievement';
  condition?: string; // New format
  value?: string; // Old format compatibility
  timing?: string; // Old format compatibility
  unlocks?: Array<{
    category: 'theme' | 'mechanic' | 'bot' | 'reveal';
    itemId: string;
  }>; // New format
}

export interface UnlockDefinition {
  id?: string; // Old format compatibility
  trigger: UnlockTrigger;
  category: 'theme' | 'mechanic' | 'bot' | 'reveal';
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
  getUnlockedItems(category: 'theme' | 'mechanic' | 'bot' | 'reveal'): string[];
  isUnlocked(category: 'theme' | 'mechanic' | 'bot' | 'reveal', itemId: string): boolean;
  getCurrentState(): UnlockState;
  getUnlockProgress(): { unlocked: number; total: number };
  
  // Admin/Debug
  resetState(): Promise<void>;
} 