/**
 * Local GameState Manager - Platform-Agnostic
 * 
 * This module provides comprehensive game state management for the WordPlay game,
 * using dependency injection to avoid platform-specific imports.
 * Platform adapters provide word validation, scoring, and bot AI functions.
 * 
 * DEPENDENCY INJECTION: All functions now accept dependencies as parameters
 * for platform-agnostic operation. Platform adapters provide dictionary,
 * scoring, and bot functions.
 * 
 * Key Features:
 * - Complete game state management (word, key letters, locked letters)
 * - Word validation and scoring integration via dependency injection
 * - Bot AI integration for single-player games via dependency injection
 * - Letter movement and rearrangement system
 * - Turn-based game flow with history tracking
 * - Performance optimized for web compatibility
 * - Observable state changes for UI integration
 */

// Remove direct imports - replaced with dependency injection
// import { validateWord, type ValidationResult } from './dictionary';
// import { calculateScore, getScoreForMove, isValidMove, type ScoringResult } from './scoring';
// import { generateBotMove, type BotMove, type BotResult } from './bot';
// import { getRandomWordByLength } from './dictionary';

import { KeyLetterLogger } from './keyLetterLogger.js';

// =============================================================================
// DEPENDENCY INTERFACES
// =============================================================================

/**
 * Dictionary dependencies for game state management
 */
export interface GameStateDictionaryDependencies {
  validateWord: (word: string, options?: any) => ValidationResult;
  getRandomWordByLength: (length: number) => string | null;
}

/**
 * Scoring dependencies for game state management
 */
export interface GameStateScoringDependencies {
  calculateScore: (fromWord: string, toWord: string, options?: any) => ScoringResult;
  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]) => number;
  isValidMove: (fromWord: string, toWord: string) => boolean;
}

/**
 * Bot dependencies for game state management
 */
export interface GameStateBotDependencies {
  generateBotMove: (word: string, options?: any) => Promise<BotResult>;
}

/**
 * Combined dependencies for complete game state management
 */
export interface GameStateDependencies extends 
  GameStateDictionaryDependencies, 
  GameStateScoringDependencies, 
  GameStateBotDependencies {
}

// =============================================================================
// RESULT TYPES (IMPORTED FROM ENGINE INTERFACES)
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  word: string;
  censored?: string;
  userMessage?: string;
}

export interface ScoringResult {
  totalScore: number;
  breakdown: {
    addLetterPoints: number;
    removeLetterPoints: number;
    movePoints: number;
    keyLetterUsagePoints: number;
  };
  actions: string[];
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

// =============================================================================
// GAME STATE TYPES
// =============================================================================

// Core game state types
export interface GameConfig {
  maxTurns?: number;
  initialWord?: string;
  allowBotPlayer?: boolean;
  enableKeyLetters?: boolean;
  enableLockedLetters?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  score: number;
  isCurrentPlayer: boolean;
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

export interface PublicGameState {
  // Core state
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[]; // NEW: Key letters that are locked for the current player's turn
  usedWords: string[]; // Exposed as array for easier consumption
  
  // Game flow
  players: PlayerState[];
  currentTurn: number;
  maxTurns: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner: PlayerState | null;
  
  // History and scoring
  turnHistory: TurnHistory[];
  totalMoves: number;
  
  // Configuration
  config: GameConfig;
  
  // Timestamps
  gameStartTime: number;
  lastMoveTime: number;
}

export interface GameState {
  // Core state
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[]; // NEW: Key letters that are locked for the current player's turn
  usedWords: Set<string>; // Track all words used in this game
  usedKeyLetters: Set<string>; // Track all key letters used in this game to prevent repetition
  
  // Game flow
  players: PlayerState[];
  currentTurn: number;
  maxTurns: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner: PlayerState | null;
  
  // History and scoring
  turnHistory: TurnHistory[];
  totalMoves: number;
  
  // Configuration
  config: GameConfig;
  
  // Timestamps
  gameStartTime: number;
  lastMoveTime: number;
}

export interface MoveAttempt {
  newWord: string;
  isValid: boolean;
  validationResult: ValidationResult;
  scoringResult: ScoringResult | null;
  canApply: boolean;
  reason?: string;
}

export interface GameStateUpdate {
  type: 'word_changed' | 'turn_completed' | 'game_finished' | 'player_changed' | 'letters_updated';
  data: Record<string, unknown>;
  timestamp: number;
}

// Event system for state change notifications
type GameStateListener = (update: GameStateUpdate) => void;

// =============================================================================
// DEPENDENCY-INJECTED GAME STATE MANAGER (NEW ARCHITECTURE)
// =============================================================================

/**
 * Local GameState Manager Class with Dependency Injection
 * Manages all game state and integrates with validation, scoring, and bot AI via dependencies
 */
export class LocalGameStateManagerWithDependencies {
  private state: GameState;
  private listeners: GameStateListener[] = [];
  private dependencies: GameStateDependencies;
  private botMoveInProgress: boolean = false; // NEW: Prevent concurrent bot moves

  constructor(dependencies: GameStateDependencies, config: GameConfig = {}) {
    this.dependencies = dependencies;
    this.state = this.initializeGameState(config);
  }

  /**
   * Initialize a new game state with default values
   */
  private initializeGameState(config: GameConfig): GameState {
    // Get random 4-letter word if no initial word provided
    let initialWord = config.initialWord;
    if (!initialWord) {
      const randomWord = this.dependencies.getRandomWordByLength(4);
      initialWord = randomWord || 'WORD'; // fallback to 'WORD' if no 4-letter words found
    }

    const defaultConfig: GameConfig = {
      maxTurns: 10,
      allowBotPlayer: true,
      enableKeyLetters: true,
      enableLockedLetters: true,
      ...config,
      initialWord: initialWord
    };

    const humanPlayer: PlayerState = {
      id: 'human',
      name: 'Player',
      isBot: false,
      score: 0,
      isCurrentPlayer: true
    };

    const players = [humanPlayer];

    // Add bot player if enabled
    if (defaultConfig.allowBotPlayer) {
      const botPlayer: PlayerState = {
        id: 'bot',
        name: 'Bot AI',
        isBot: true,
        score: 0,
        isCurrentPlayer: false
      };
      players.push(botPlayer);
    }

    const now = Date.now();

    return {
      currentWord: defaultConfig.initialWord!.toUpperCase(),
      keyLetters: [],
      lockedLetters: [],
      players,
      currentTurn: 1,
      maxTurns: defaultConfig.maxTurns!,
      gameStatus: 'waiting',
      winner: null,
      turnHistory: [],
      totalMoves: 0,
      config: defaultConfig,
      gameStartTime: now,
      lastMoveTime: now,
      usedWords: new Set(),
      usedKeyLetters: new Set(),
      lockedKeyLetters: []
    };
  }

  /**
   * Get the current game state (read-only copy)
   */
  public getState(): PublicGameState {
    return {
      currentWord: this.state.currentWord,
      keyLetters: [...this.state.keyLetters],
      lockedLetters: [...this.state.lockedLetters],
      lockedKeyLetters: [...this.state.lockedKeyLetters],
      usedWords: Array.from(this.state.usedWords),
      players: this.state.players.map(p => ({ ...p })),
      currentTurn: this.state.currentTurn,
      maxTurns: this.state.maxTurns,
      gameStatus: this.state.gameStatus,
      winner: this.state.winner ? { ...this.state.winner } : null,
      turnHistory: this.state.turnHistory.map(h => ({ ...h })),
      totalMoves: this.state.totalMoves,
      config: { ...this.state.config },
      gameStartTime: this.state.gameStartTime,
      lastMoveTime: this.state.lastMoveTime
    };
  }

  /**
   * Get the current player
   */
  public getCurrentPlayer(): PlayerState | null {
    return this.state.players.find(p => p.isCurrentPlayer) || null;
  }

  /**
   * Get the other (non-current) player
   */
  public getOtherPlayer(): PlayerState | null {
    return this.state.players.find(p => !p.isCurrentPlayer) || null;
  }

  /**
   * Start the game
   */
  public startGame(): void {
    console.log('[DEBUG] startGame: Called');
    
    if (this.state.gameStatus === 'waiting') {
      console.log('[DEBUG] startGame: Starting game, current keyLetters:', this.state.keyLetters);
      this.state.gameStatus = 'playing';
      this.state.gameStartTime = Date.now();
      
      // Add initial word to used words set
      this.state.usedWords.add(this.state.currentWord);
      
      // Generate initial key letter so first player can use it for bonus points
      if (this.state.config.enableKeyLetters) {
      this.generateRandomKeyLetter();
      }
      
      console.log('[DEBUG] startGame: Game started, final keyLetters:', this.state.keyLetters);
      
      this.notifyListeners({
        type: 'game_finished',
        data: { gameStatus: this.state.gameStatus },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Attempt a move - validate without applying
   */
  public attemptMove(newWord: string): MoveAttempt {
    const normalizedNewWord = newWord.trim().toUpperCase();
    const currentPlayer = this.getCurrentPlayer();
    
    if (!currentPlayer) {
      return {
        newWord: normalizedNewWord,
        isValid: false,
        validationResult: {
          isValid: false,
          reason: 'No current player',
          word: normalizedNewWord,
          userMessage: 'no player found'
        },
        scoringResult: null,
        canApply: false,
        reason: 'No current player found'
      };
    }

    // Basic validation first
    if (this.state.gameStatus !== 'playing') {
      return {
        newWord: normalizedNewWord,
        isValid: false,
        validationResult: {
          isValid: false,
          reason: 'Game is not in playing state',
          word: normalizedNewWord,
          userMessage: 'game not active'
        },
        scoringResult: null,
        canApply: false,
        reason: 'Game is not in playing state'
      };
    }

    // Check if word has been used before
    if (this.state.usedWords.has(normalizedNewWord)) {
      return {
        newWord: normalizedNewWord,
        isValid: false,
        validationResult: {
          isValid: false,
          reason: 'Word has already been used in this game',
          word: normalizedNewWord,
          userMessage: 'was played'
        },
        scoringResult: null,
        canApply: false,
        reason: 'Word repetition not allowed'
      };
    }

    // Word validation using dependency injection
    const validationResult = this.dependencies.validateWord(normalizedNewWord, {
      isBot: currentPlayer.isBot,
      previousWord: this.state.currentWord
    });

    if (!validationResult.isValid) {
      return {
        newWord: normalizedNewWord,
        isValid: false,
        validationResult,
        scoringResult: null,
        canApply: false,
        reason: validationResult.reason || validationResult.userMessage
      };
    }

    // Enhanced move validation with specific error messages
    const moveValidation = this.validateMoveActions(this.state.currentWord, normalizedNewWord);
    if (!moveValidation.isValid) {
      return {
        newWord: normalizedNewWord,
        isValid: false,
        validationResult: {
          isValid: false,
          reason: moveValidation.reason,
          word: normalizedNewWord,
          userMessage: moveValidation.userMessage
        },
        scoringResult: null,
        canApply: false,
        reason: moveValidation.userMessage
      };
    }

    // Calculate scoring using dependency injection
    const scoringResult = this.dependencies.calculateScore(
      this.state.currentWord,
      normalizedNewWord,
      { keyLetters: this.state.keyLetters }
    );

    return {
      newWord: normalizedNewWord,
      isValid: true,
      validationResult,
      scoringResult,
      canApply: true
    };
  }

  /**
   * Validate move actions (adds, removes) for specific error messages
   */
  private validateMoveActions(previousWord: string, currentWord: string): {
    isValid: boolean;
    reason?: string;
    userMessage?: string;
  } {
    // Import analyzeWordChange for detailed analysis
    // This is a simple analysis without importing the scoring module
    const prevLetters = previousWord.split('');
    const currLetters = currentWord.split('');
    
    // Count letter differences
    const prevMap = new Map<string, number>();
    const currMap = new Map<string, number>();
    
    prevLetters.forEach(letter => {
      prevMap.set(letter, (prevMap.get(letter) || 0) + 1);
    });
    
    currLetters.forEach(letter => {
      currMap.set(letter, (currMap.get(letter) || 0) + 1);
    });
    
    // Calculate added and removed letters
    let addedCount = 0;
    let removedCount = 0;
    
    // Count added letters (letters in current but not in previous, or more in current)
    for (const [letter, currCount] of currMap) {
      const prevCount = prevMap.get(letter) || 0;
      if (currCount > prevCount) {
        addedCount += (currCount - prevCount);
      }
    }
    
    // Count removed letters (letters in previous but not in current, or more in previous)
    for (const [letter, prevCount] of prevMap) {
      const currCount = currMap.get(letter) || 0;
      if (prevCount > currCount) {
        removedCount += (prevCount - currCount);
      }
    }
    
    // Validate game rules: max 1 add, max 1 remove per turn
    if (addedCount > 1) {
      return {
        isValid: false,
        reason: 'TOO_MANY_ADDS',
        userMessage: 'too many adds'
      };
    }
    
    if (removedCount > 1) {
      return {
        isValid: false,
        reason: 'TOO_MANY_REMOVES', 
        userMessage: 'too many removes'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a move (convenience method for tests)
   */
  public validateMove(newWord: string): ValidationResult {
    const moveAttempt = this.attemptMove(newWord);
    return moveAttempt.validationResult;
  }

  /**
   * Apply a move directly from a word (convenience method for tests)
   */
  public applyMove(wordOrAttempt: string | MoveAttempt): boolean {
    if (typeof wordOrAttempt === 'string') {
      const moveAttempt = this.attemptMove(wordOrAttempt);
      return this.applyMoveAttempt(moveAttempt);
    } else {
      return this.applyMoveAttempt(wordOrAttempt);
    }
  }

  /**
   * Apply a move attempt to the game state
   */
  private applyMoveAttempt(moveAttempt: MoveAttempt): boolean {
    console.log('[DEBUG] applyMove: Called with word:', moveAttempt.newWord);
    
    if (!moveAttempt.canApply || !moveAttempt.scoringResult) {
      console.log('[DEBUG] applyMove: Cannot apply move - canApply:', moveAttempt.canApply, 'scoringResult:', !!moveAttempt.scoringResult);
      return false;
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) {
      console.log('[DEBUG] applyMove: No current player found');
      return false;
    }

    console.log('[DEBUG] applyMove: Applying move for player:', currentPlayer.name, 'Current key letters before:', this.state.keyLetters);

    const previousWord = this.state.currentWord;

    // Update game state
    this.state.currentWord = moveAttempt.newWord;
    this.state.lastMoveTime = Date.now();
    this.state.totalMoves++;
    
    // Track this word as used
    this.state.usedWords.add(moveAttempt.newWord);

    // Update player score
    currentPlayer.score += moveAttempt.scoringResult.totalScore;

    // Add to turn history
    const turnRecord: TurnHistory = {
      turnNumber: this.state.currentTurn,
      playerId: currentPlayer.id,
      previousWord,
      newWord: moveAttempt.newWord,
      score: moveAttempt.scoringResult.totalScore,
      scoringBreakdown: moveAttempt.scoringResult,
      timestamp: Date.now()
    };

    this.state.turnHistory.push(turnRecord);

    // KEY LETTER LOCKING FEATURE
    // Clear any existing locked key letters since this player has now completed their turn with them
    this.state.lockedKeyLetters = [];
    
    // If this player used key letters, lock them for the next player
    if (moveAttempt.scoringResult.keyLettersUsed.length > 0) {
      // Find which key letters were used and are now in the new word
      const usedKeyLetters = moveAttempt.scoringResult.keyLettersUsed.filter(letter => 
        moveAttempt.newWord.toUpperCase().includes(letter.toUpperCase())
      );
      
      // These letters will be locked for the next player's turn
      this.state.lockedKeyLetters = usedKeyLetters.map(letter => letter.toUpperCase());
    }

    // Automatic key letter generation - maintain exactly 1 key letter per turn
    if (this.state.config.enableKeyLetters) {
      console.log('[DEBUG] applyMove: Key letters enabled, processing key letter generation');
      console.log('[DEBUG] applyMove: Current keyLetters before processing:', this.state.keyLetters);
      
      // Track the current key letter as used (since it was active for this turn)
      this.state.keyLetters.forEach(letter => {
        console.log('[DEBUG] applyMove: Marking key letter as used:', letter);
        this.state.usedKeyLetters.add(letter);
      });
      
      // Clear current key letters and generate exactly 1 new key letter
      console.log('[DEBUG] applyMove: Clearing key letters. Current keyLetters:', this.state.keyLetters);
      this.state.keyLetters = [];
      console.log('[DEBUG] applyMove: Calling generateRandomKeyLetter');
      this.generateRandomKeyLetter();
      console.log('[DEBUG] applyMove: After generateRandomKeyLetter, keyLetters:', this.state.keyLetters);
    }

    // Notify listeners of word change
    this.notifyListeners({
      type: 'word_changed',
      data: { previousWord, newWord: moveAttempt.newWord, score: moveAttempt.scoringResult.totalScore },
      timestamp: Date.now()
    });

    // Switch to next player
    this.switchToNextPlayer();

    // Check if game is finished
    if (this.state.currentTurn > this.state.maxTurns) {
      this.finishGame();
    }

    console.log('[DEBUG] applyMove: Completed successfully');
    return true;
  }

  /**
   * Make a bot move (if current player is bot)
   */
  public async makeBotMove(): Promise<BotMove | null> {
    console.log('[DEBUG] makeBotMove: Called. botMoveInProgress:', this.botMoveInProgress);
    
    // Prevent concurrent bot moves
    if (this.botMoveInProgress) {
      console.log('[DEBUG] makeBotMove: Bot move already in progress, returning null');
      return null;
    }
    
    const currentPlayer = this.getCurrentPlayer();
    
    if (!currentPlayer || !currentPlayer.isBot) {
      console.log('[DEBUG] makeBotMove: Current player is not a bot, returning null');
      return null;
    }

    if (this.state.gameStatus !== 'playing') {
      console.log('[DEBUG] makeBotMove: Game not in playing status, returning null');
      return null;
    }

    try {
      console.log('[DEBUG] makeBotMove: Setting botMoveInProgress to true');
      this.botMoveInProgress = true;
      
      // Combine all locked letters for bot constraints
      const allLockedLetters = [...this.state.lockedLetters, ...this.state.lockedKeyLetters];
      console.log('[DEBUG] makeBotMove: Current word:', this.state.currentWord);
      console.log('[DEBUG] makeBotMove: Key letters:', this.state.keyLetters);
      console.log('[DEBUG] makeBotMove: Locked letters:', this.state.lockedLetters);
      console.log('[DEBUG] makeBotMove: Locked key letters:', this.state.lockedKeyLetters);
      console.log('[DEBUG] makeBotMove: All locked letters passed to bot:', allLockedLetters);
      
      // Generate bot move
      const botResult: BotResult = await this.dependencies.generateBotMove(this.state.currentWord, {
        keyLetters: this.state.keyLetters,
        lockedLetters: allLockedLetters,
        maxCandidates: 500 // Reasonable limit for responsive gameplay
      });

      console.log('[DEBUG] Bot move generation completed:', botResult.move?.word);

      if (!botResult.move) {
        console.warn('Bot could not generate a valid move, passing turn');
        // Automatically pass when bot can't find a valid move
        this.passTurn();
        return {
          word: this.state.currentWord,
          score: 0,
          confidence: 0,
          reasoning: ['PASS - No valid moves available']
        };
      }

      // Attempt and apply the bot's move
      console.log('[DEBUG] Attempting bot move:', botResult.move.word, 'from word:', this.state.currentWord);
      const moveAttempt = this.attemptMove(botResult.move.word);
      
      if (moveAttempt.canApply) {
        console.log('[DEBUG] Bot move can be applied, calling applyMoveAttempt');
        const success = this.applyMoveAttempt(moveAttempt);
        console.log('[DEBUG] applyMoveAttempt result:', success);
        if (success) {
          console.log('[DEBUG] Bot move successfully applied, returning botResult.move');
          return botResult.move;
        }
      }

      // If bot move failed to apply, pass instead
      this.passTurn();
      return {
        word: this.state.currentWord,
        score: 0,
        confidence: 0,
        reasoning: ['PASS - Move validation failed']
      };

    } catch (error) {
      console.error('Bot move generation failed:', error);
      // Pass on error
      this.passTurn();
      return {
        word: this.state.currentWord,
        score: 0,
        confidence: 0,
        reasoning: ['PASS - Error in move generation']
      };
    } finally {
      console.log('[DEBUG] makeBotMove: Setting botMoveInProgress to false');
      this.botMoveInProgress = false;
    }
  }

  /**
   * Switch to the next player
   */
  private switchToNextPlayer(): void {
    // Find current player before switching
    const currentPlayerIndex = this.state.players.findIndex(p => p.isCurrentPlayer);
    
    // Mark all players as not current
    this.state.players.forEach(player => {
      player.isCurrentPlayer = false;
    });

    // Calculate next player index
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.state.players.length;
    
    this.state.players[nextPlayerIndex].isCurrentPlayer = true;
    this.state.currentTurn++;

    this.notifyListeners({
      type: 'turn_completed',
      data: { 
        currentTurn: this.state.currentTurn,
        currentPlayer: this.state.players[nextPlayerIndex]
      },
      timestamp: Date.now()
    });
  }

  /**
   * Finish the game and determine winner
   */
  private finishGame(): void {
    this.state.gameStatus = 'finished';

    // Determine winner by highest score
    const sortedPlayers = [...this.state.players].sort((a, b) => b.score - a.score);
    this.state.winner = sortedPlayers[0];

    this.notifyListeners({
      type: 'game_finished',
      data: { 
        winner: this.state.winner,
        finalScores: this.state.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      },
      timestamp: Date.now()
    });
  }

  /**
   * Key letters management
   */
  public addKeyLetter(letter: string): void {
    const normalizedLetter = letter.toUpperCase();
    
    if (!this.state.config.enableKeyLetters) {
      return;
    }

    if (!this.state.keyLetters.includes(normalizedLetter)) {
      this.state.keyLetters.push(normalizedLetter);
      
      this.notifyListeners({
        type: 'letters_updated',
        data: { type: 'key_added', letter: normalizedLetter, keyLetters: [...this.state.keyLetters] },
        timestamp: Date.now()
      });
    }
  }

  public removeKeyLetter(letter: string): void {
    const normalizedLetter = letter.toUpperCase();
    const index = this.state.keyLetters.indexOf(normalizedLetter);
    
    if (index > -1) {
      this.state.keyLetters.splice(index, 1);
      
      this.notifyListeners({
        type: 'letters_updated',
        data: { type: 'key_removed', letter: normalizedLetter, keyLetters: [...this.state.keyLetters] },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Locked letters management
   */
  public addLockedLetter(letter: string): void {
    const normalizedLetter = letter.toUpperCase();
    
    if (!this.state.config.enableLockedLetters) {
      return;
    }

    if (!this.state.lockedLetters.includes(normalizedLetter)) {
      this.state.lockedLetters.push(normalizedLetter);
      
      this.notifyListeners({
        type: 'letters_updated',
        data: { type: 'locked_added', letter: normalizedLetter, lockedLetters: [...this.state.lockedLetters] },
        timestamp: Date.now()
      });
    }
  }

  public removeLockedLetter(letter: string): void {
    const normalizedLetter = letter.toUpperCase();
    const index = this.state.lockedLetters.indexOf(normalizedLetter);
    
    if (index > -1) {
      this.state.lockedLetters.splice(index, 1);
      
      this.notifyListeners({
        type: 'letters_updated',
        data: { type: 'locked_removed', letter: normalizedLetter, lockedLetters: [...this.state.lockedLetters] },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Word management with validation
   */
  public setWord(word: string): boolean {
    const normalizedWord = word.trim().toUpperCase();
    
    // Basic validation
    if (!normalizedWord || !/^[A-Z]+$/.test(normalizedWord)) {
      return false;
    }

    this.state.currentWord = normalizedWord;
    
    this.notifyListeners({
      type: 'word_changed',
      data: { newWord: normalizedWord, source: 'manual' },
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Reset game to initial state
   */
  public resetGame(newConfig?: GameConfig): void {
    console.log('[DEBUG] resetGame: Called');
    const configToUse = newConfig ? { ...this.state.config, ...newConfig } : this.state.config;
    this.state = this.initializeGameState(configToUse);
    this.botMoveInProgress = false; // Reset bot move flag

    this.notifyListeners({
      type: 'game_finished', // Use existing event type for simplicity
      data: { type: 'reset' },
      timestamp: Date.now()
    });
  }

  /**
   * Get game statistics
   */
  public getGameStats(): {
    duration: number;
    totalMoves: number;
    averageScore: number;
    playerStats: Array<{
      id: string;
      name: string;
      score: number;
      moveCount: number;
      averageScorePerMove: number;
    }>;
  } {
    const duration = Date.now() - this.state.gameStartTime;
    const totalScore = this.state.players.reduce((sum, player) => sum + player.score, 0);
    const averageScore = this.state.totalMoves > 0 ? totalScore / this.state.totalMoves : 0;

    const playerStats = this.state.players.map(player => {
      const playerMoves = this.state.turnHistory.filter(turn => turn.playerId === player.id);
      const moveCount = playerMoves.length;
      const averageScorePerMove = moveCount > 0 ? player.score / moveCount : 0;

      return {
        id: player.id,
        name: player.name,
        score: player.score,
        moveCount,
        averageScorePerMove
      };
    });

    return {
      duration,
      totalMoves: this.state.totalMoves,
      averageScore,
      playerStats
    };
  }

  /**
   * Event system for UI integration
   */
  public subscribe(listener: GameStateListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(update: GameStateUpdate): void {
    this.listeners.forEach(listener => {
      try {
        listener(update);
      } catch (error) {
        console.error('GameState listener error:', error);
      }
    });
  }

  /**
   * Performance test helper
   */
  public performanceTest(operations = 1000): { averageTime: number; totalTime: number } {
    const startTime = performance.now();
    
    for (let i = 0; i < operations; i++) {
      // Simulate common operations
      this.getState();
      this.getCurrentPlayer();
      this.attemptMove(`TEST${i % 100}`);
      
      if (i % 100 === 0) {
        this.addKeyLetter('A');
        this.removeKeyLetter('A');
      }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / operations;
    
    return { averageTime, totalTime };
  }

  /**
   * Log key letter statistics to persistent file for cross-game analysis
   */
  private async logKeyLetterStats(letter: string): Promise<void> {
    const gameId = `game_${this.state.gameStartTime}`;
    await KeyLetterLogger.logKeyLetter(letter, gameId, this.state.currentTurn);
  }

  /**
   * Generate a random key letter that hasn't been used before in this game
   * and is not already present in the current word
   */
  private generateRandomKeyLetter(): void {
    console.log('[DEBUG] generateRandomKeyLetter: Called. Current keyLetters.length:', this.state.keyLetters.length);
    
    // Ensure we don't have any existing key letters before generating
    if (this.state.keyLetters.length > 0) {
      console.log('[DEBUG] generateRandomKeyLetter: Already have key letters, returning early');
      return; // Silent return, no warning needed
    }
    
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const currentWordLetters = new Set(this.state.currentWord.split(''));
    
    const availableLetters = alphabet.split('').filter(letter => 
      !this.state.usedKeyLetters.has(letter) && 
      !this.state.keyLetters.includes(letter) &&
      !currentWordLetters.has(letter) // NEW: Don't use letters already in the current word
    );
    
    console.log('[DEBUG] generateRandomKeyLetter: Available letters:', availableLetters.length, availableLetters);
    
    if (availableLetters.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableLetters.length);
      const newKeyLetter = availableLetters[randomIndex];
      console.log('[DEBUG] generateRandomKeyLetter: Generated new key letter:', newKeyLetter);
      this.state.keyLetters.push(newKeyLetter);
      // Note: We'll track this letter as used when the next move is made
      
              // Log key letter statistics across all games
        this.logKeyLetterStats(newKeyLetter).catch(error => {
          console.warn('Failed to log key letter statistics:', error);
        });
      
      this.notifyListeners({
        type: 'letters_updated',
        data: { 
          action: 'key_letter_added',
          letter: newKeyLetter,
          keyLetters: [...this.state.keyLetters]
        },
        timestamp: Date.now()
      });
      
      console.log('[DEBUG] generateRandomKeyLetter: Key letter successfully added, final keyLetters:', this.state.keyLetters);
    } else {
      console.log('[DEBUG] generateRandomKeyLetter: No available letters to use as key letter');
    }
  }

  /**
   * Allow the current player to pass their turn
   */
  public passTurn(): boolean {
    if (this.state.gameStatus !== 'playing') {
      return false;
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) {
      return false;
    }

    // Clear locked key letters when passing (locks are removed)
    this.state.lockedKeyLetters = [];

    // Add to turn history to track the pass
    const turnRecord: TurnHistory = {
      turnNumber: this.state.currentTurn,
      playerId: currentPlayer.id,
      previousWord: this.state.currentWord,
      newWord: this.state.currentWord, // Word stays the same
      score: 0, // No points for passing
      scoringBreakdown: {
        totalScore: 0,
        breakdown: {
          addLetterPoints: 0,
          removeLetterPoints: 0,
          movePoints: 0,
          keyLetterUsagePoints: 0,
        },
        actions: ['PASS'],
        keyLettersUsed: []
      },
      timestamp: Date.now()
    };

    this.state.turnHistory.push(turnRecord);

    // Do NOT generate new key letters on pass - this was causing double key letters
    // Key letters should only be generated after successful moves in applyMove()

    // Notify listeners of the pass
    this.notifyListeners({
      type: 'turn_completed',
      data: { 
        type: 'pass',
        playerId: currentPlayer.id,
        playerName: currentPlayer.name
      },
      timestamp: Date.now()
    });

    // Switch to next player
    this.switchToNextPlayer();

    // Check if game is finished
    if (this.state.currentTurn > this.state.maxTurns) {
      this.finishGame();
    }

    return true;
  }
}

// =============================================================================
// LEGACY COMPATIBILITY & DEPRECATED FUNCTIONS
// =============================================================================

/**
 * DEPRECATED: Legacy LocalGameStateManager for backward compatibility
 * 
 * @deprecated Use LocalGameStateManagerWithDependencies instead
 * This class maintains the old interface but requires external dependencies to be set up.
 * It will be removed in a future version.
 */
export class LocalGameStateManager extends LocalGameStateManagerWithDependencies {
  constructor(config: GameConfig = {}) {
    // Requires dependencies to be provided externally - this is a compatibility shim
    // Platform adapters should provide proper dependencies
    const placeholderDependencies: GameStateDependencies = {
      validateWord: () => ({ isValid: false, reason: 'No dependencies provided', word: '' }),
      getRandomWordByLength: () => null,
              calculateScore: () => ({ totalScore: 0, breakdown: { addLetterPoints: 0, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 0 }, actions: [], keyLettersUsed: [] }),
      getScoreForMove: () => 0,
      isValidMove: () => false,
      generateBotMove: async () => ({ move: null, candidates: [], processingTime: 0, totalCandidatesGenerated: 0 })
    };
    
    super(placeholderDependencies, config);
    console.warn('LocalGameStateManager is deprecated. Use LocalGameStateManagerWithDependencies with proper dependency injection.');
  }
}

/**
 * DEPRECATED: Factory function for creating game state managers
 * 
 * @deprecated Use `new LocalGameStateManagerWithDependencies(dependencies, config)` instead
 * This function requires dependencies to be set up externally and will be removed in a future version.
 */
export function createGameStateManager(config?: GameConfig): LocalGameStateManager {
  console.warn('createGameStateManager is deprecated. Use LocalGameStateManagerWithDependencies constructor with proper dependencies.');
  return new LocalGameStateManager(config);
}

/**
 * DEPRECATED: Helper function for quick move scoring
 * 
 * @deprecated This function uses direct imports which violate dependency injection architecture.
 * Use platform-specific scoring functions or create adapter functions instead.
 */
export function quickScoreMove(fromWord: string, toWord: string, keyLetters: string[] = []): number {
  console.warn('quickScoreMove is deprecated due to direct import usage. Use dependency-injected scoring functions.');
  // Return 0 as placeholder - platform adapters should provide proper scoring
  return 0;
}

/**
 * DEPRECATED: Helper function for move validation
 * 
 * @deprecated This function uses direct imports which violate dependency injection architecture.
 * Use platform-specific validation functions or create adapter functions instead.
 */
export function quickValidateMove(word: string, isBot = false, previousWord?: string): boolean {
  console.warn('quickValidateMove is deprecated due to direct import usage. Use dependency-injected validation functions.');
  // Return false as placeholder - platform adapters should provide proper validation
  return false;
}

// =============================================================================
// DEPENDENCY-INJECTED HELPER FUNCTIONS (RECOMMENDED)
// =============================================================================

/**
 * Create a game state manager with proper dependency injection
 * This is the recommended way to create game state managers.
 */
export function createGameStateManagerWithDependencies(
  dependencies: GameStateDependencies, 
  config?: GameConfig
): LocalGameStateManagerWithDependencies {
  return new LocalGameStateManagerWithDependencies(dependencies, config);
}

/**
 * Quick move scoring with dependency injection
 * Use this instead of the deprecated quickScoreMove function.
 */
export function quickScoreMoveWithDependencies(
  fromWord: string, 
  toWord: string, 
  scoring: GameStateScoringDependencies,
  keyLetters: string[] = []
): number {
  return scoring.getScoreForMove(fromWord, toWord, keyLetters);
}

/**
 * Quick move validation with dependency injection
 * Use this instead of the deprecated quickValidateMove function.
 */
export function quickValidateMoveWithDependencies(
  word: string, 
  dictionary: GameStateDictionaryDependencies,
  isBot = false, 
  previousWord?: string
): boolean {
  const result = dictionary.validateWord(word, { isBot, previousWord });
  return result.isValid;
} 