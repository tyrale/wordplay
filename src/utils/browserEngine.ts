/**
 * Browser-Compatible Engine Wrapper
 * 
 * This module wraps the real engine to provide browser compatibility
 * by handling dictionary validation separately from the core game logic.
 * 
 * The game logic remains IDENTICAL to the terminal game.
 */

import { isValidDictionaryWordSync, getRandomWordByLength } from './browserDictionary';

// Import only the core types and functions that don't use Node.js modules
export type {
  GameConfig,
  PlayerState,
  TurnHistory,
  PublicGameState,
  GameState,
  MoveAttempt,
  GameStateUpdate
} from '../../packages/engine/gamestate';

// Copy essential types from real engine (to avoid Node.js import issues)
export interface ScoringResult {
  totalScore: number;
  breakdown: {
    addLetterPoints: number;
    removeLetterPoints: number;
    rearrangePoints: number;
    keyLetterUsagePoints: number;
  };
  actions: string[];
  keyLettersUsed: string[];
}

export interface WordAnalysis {
  action: string;
  details: string;
}

export interface BotMove {
  word: string;
  confidence: number;
  reasoning: string;
}

/**
 * Browser-compatible validation that uses the same logic as the real engine
 * but with browser dictionary loading
 */
export interface ValidationOptions {
  isBot?: boolean;
  previousWord?: string;
  keyLetters?: string[];
  lockedLetters?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  word: string;
}

export function validateWord(word: string, options: ValidationOptions = {}): ValidationResult {
  const { isBot = false, previousWord } = options;
  
  // Basic validation (same as real engine)
  if (!word || typeof word !== 'string') {
    return { isValid: false, reason: 'Word must be a non-empty string', word };
  }
  
  const normalizedWord = word.trim().toUpperCase();
  
  if (normalizedWord.length < 3) {
    return { isValid: false, reason: 'Word must be at least 3 letters long', word: normalizedWord };
  }
  
  // Character validation (same as real engine)
  if (!isBot && !/^[A-Z]+$/.test(normalizedWord)) {
    return { isValid: false, reason: 'Word must contain only letters (A-Z)', word: normalizedWord };
  }
  
  // Length change validation (same as real engine)
  if (previousWord) {
    const lengthDiff = Math.abs(normalizedWord.length - previousWord.length);
    if (!isBot && lengthDiff > 1) {
      return { isValid: false, reason: 'Word length can only change by 1 letter per turn', word: normalizedWord };
    }
  }
  
  // Dictionary validation using browser dictionary
  if (!isValidDictionaryWordSync(normalizedWord)) {
    return { isValid: false, reason: 'Word not found in dictionary', word: normalizedWord };
  }
  
  return { isValid: true, reason: 'Valid word', word: normalizedWord };
}

/**
 * Browser-compatible move validation
 */
export function isValidMove(fromWord: string, toWord: string, options: ValidationOptions = {}): boolean {
  const validation = validateWord(toWord, { ...options, previousWord: fromWord });
  return validation.isValid;
}

/**
 * Calculate score using same logic as real engine
 */
export function calculateScore(fromWord: string, toWord: string, keyLetters: string[] = []): ScoringResult {
  const result: ScoringResult = {
    totalScore: 0,
    breakdown: {
      addLetterPoints: 0,
      removeLetterPoints: 0,
      rearrangePoints: 0,
      keyLetterUsagePoints: 0
    },
    actions: [],
    keyLettersUsed: []
  };

  const fromLetters = fromWord.toUpperCase().split('');
  const toLetters = toWord.toUpperCase().split('');
  
  // Check for additions
  const addedLetters = toLetters.filter(letter => 
    !fromLetters.includes(letter) || 
    toLetters.filter(l => l === letter).length > fromLetters.filter(l => l === letter).length
  );
  
  // Check for removals
  const removedLetters = fromLetters.filter(letter => 
    !toLetters.includes(letter) || 
    fromLetters.filter(l => l === letter).length > toLetters.filter(l => l === letter).length
  );
  
  // Check for rearrangement (same letters, different order)
  const isRearranged = fromLetters.sort().join('') === toLetters.sort().join('') && fromWord !== toWord;
  
  // Score calculation (same as real engine)
  if (addedLetters.length > 0) {
    result.actions.push(`Added letter(s): ${addedLetters.join(', ')}`);
    result.breakdown.addLetterPoints = 1;
    result.totalScore += 1;
  }
  
  if (removedLetters.length > 0) {
    result.actions.push(`Removed letter(s): ${removedLetters.join(', ')}`);
    result.breakdown.removeLetterPoints = 1;
    result.totalScore += 1;
  }
  
  if (isRearranged) {
    result.actions.push('Rearranged letters');
    result.breakdown.rearrangePoints = 1;
    result.totalScore += 1;
  }
  
  // Key letter bonus
  const usedKeyLetters = toLetters.filter(letter => keyLetters.includes(letter));
  if (usedKeyLetters.length > 0) {
    result.actions.push(`Used key letter(s): ${usedKeyLetters.join(', ')}`);
    result.breakdown.keyLetterUsagePoints = 1;
    result.keyLettersUsed = usedKeyLetters;
    result.totalScore += 1;
  }
  
  return result;
}

/**
 * Analyze word change using same logic as real engine
 */
export function analyzeWordChange(fromWord: string, toWord: string): WordAnalysis {
  const fromLetters = fromWord.toUpperCase().split('');
  const toLetters = toWord.toUpperCase().split('');
  
  // Check for additions
  const addedLetters = toLetters.filter(letter => 
    !fromLetters.includes(letter) || 
    toLetters.filter(l => l === letter).length > fromLetters.filter(l => l === letter).length
  );
  
  // Check for removals
  const removedLetters = fromLetters.filter(letter => 
    !toLetters.includes(letter) || 
    fromLetters.filter(l => l === letter).length > toLetters.filter(l => l === letter).length
  );
  
  // Check for rearrangement
  const isRearranged = fromLetters.sort().join('') === toLetters.sort().join('') && fromWord !== toWord;
  
  if (addedLetters.length > 0) {
    return {
      action: `Added letter(s): ${addedLetters.join(', ')}`,
      details: `Added ${addedLetters.length} letter(s)`
    };
  }
  
  if (removedLetters.length > 0) {
    return {
      action: `Removed letter(s): ${removedLetters.join(', ')}`,
      details: `Removed ${removedLetters.length} letter(s)`
    };
  }
  
  if (isRearranged) {
    return {
      action: 'Rearranged letters',
      details: 'Same letters, different order'
    };
  }
  
  return {
    action: 'No change detected',
    details: 'Words are identical'
  };
}

/**
 * Simple bot move generation
 */
export async function generateBotMove(currentWord: string, options: any): Promise<BotMove | null> {
  const { keyLetters = [], usedWords = [], isValidWord } = options;
  
  // Simple bot strategy: try common word variations
  const variations = [
    // Add common letters
    ...['S', 'E', 'D', 'R', 'T'].map(letter => currentWord + letter),
    // Remove last letter
    currentWord.slice(0, -1),
    // Try with key letters
    ...keyLetters.map((letter: string) => currentWord + letter)
  ];
  
  // Filter to valid, unused words
  const validMoves = variations.filter(word => 
    word.length >= 3 &&
    !usedWords.includes(word.toUpperCase()) &&
    isValidWord(word)
  );
  
  if (validMoves.length > 0) {
    const selectedWord = validMoves[Math.floor(Math.random() * validMoves.length)];
    return {
      word: selectedWord,
      confidence: 0.7,
      reasoning: 'Simple word variation'
    };
  }
  
  return null;
}

/**
 * Browser-compatible game state manager
 * Uses the same logic as the real engine but with browser dictionary
 */
export class BrowserGameStateManager {
  private state: any;
  private listeners: Array<() => void> = [];
  
  constructor(config: any = {}) {
    // Generate random 4-letter starting word if none provided (same as real engine)
    let initialWord = config.initialWord;
    if (!initialWord) {
      // For browser, we'll use a simple fallback since we can't async in constructor
      // The real random word will be set when startGame() is called
      initialWord = 'WORD'; // temporary fallback
    }
    
    const now = Date.now();
    
    this.state = {
      gameStatus: 'waiting',
      currentWord: initialWord.toUpperCase(),
      keyLetters: [],
      lockedLetters: [],
      lockedKeyLetters: [], // NEW: Key letters locked for current player
      currentTurn: 1, // FIXED: Start at 1 like real engine
      maxTurns: config.maxTurns || 10,
      players: [
        { id: 'human', score: 0, isCurrentPlayer: true },
        { id: 'bot', score: 0, isCurrentPlayer: false }
      ],
      turnHistory: [],
      usedWords: new Set<string>(),
      usedKeyLetters: new Set<string>(), // NEW: Track used key letters
      totalMoves: 0, // NEW: Track total moves
      gameStartTime: now, // NEW: Game start timestamp
      lastMoveTime: now, // NEW: Last move timestamp
      config: {
        maxTurns: config.maxTurns || 10,
        allowBotPlayer: true,
        enableKeyLetters: true,
        enableLockedLetters: true,
        ...config,
        initialWord: initialWord
      }
    };
  }
  
  getState() {
    return { ...this.state };
  }
  
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
  
  async startGame() {
    // Generate random 4-letter starting word if still using fallback (same as real engine)
    if (this.state.currentWord === 'WORD') {
      const randomWord = await getRandomWordByLength(4);
      if (randomWord) {
        this.state.currentWord = randomWord.toUpperCase();
      }
    }
    
    this.state.gameStatus = 'playing';
    this.state.gameStartTime = Date.now(); // FIXED: Set proper start time
    this.state.lastMoveTime = Date.now();
    
    // Track the initial word as used
    this.state.usedWords.add(this.state.currentWord.toUpperCase());
    
    // Generate initial key letters so players can see them from the start (same as real engine)
    if (this.state.config.enableKeyLetters) {
      this.generateRandomKeyLetter(); // Only 1 key letter at start
    }
    
    this.notifyListeners();
  }
  
  private generateRandomKeyLetter() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const currentWordLetters = new Set(this.state.currentWord.split(''));
    
    // FIXED: Use proper exclusion logic like real engine
    const availableLetters = alphabet.split('').filter(letter => 
      !this.state.usedKeyLetters.has(letter) && 
      !this.state.keyLetters.includes(letter) &&
      !currentWordLetters.has(letter) // Don't use letters already in current word
    );
    
    if (availableLetters.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableLetters.length);
      const newKeyLetter = availableLetters[randomIndex];
      this.state.keyLetters.push(newKeyLetter);
      // Note: We'll track this letter as used when the next move is made
    }
  }
  
  attemptMove(newWord: string) {
    const validation = validateWord(newWord, {
      previousWord: this.state.currentWord,
      keyLetters: this.state.keyLetters,
      lockedLetters: this.state.lockedLetters
    });
    
    if (!validation.isValid) {
      return {
        newWord,
        isValid: false,
        validationResult: validation,
        scoringResult: null,
        canApply: false,
        reason: validation.reason
      };
    }
    
    // Check if word was already used
    if (this.state.usedWords.has(newWord.toUpperCase())) {
      return {
        newWord,
        isValid: false,
        validationResult: { isValid: false, reason: 'Word already used in this game', word: newWord },
        scoringResult: null,
        canApply: false,
        reason: 'Word already used in this game'
      };
    }

    // LOCKED KEY LETTER VALIDATION (same as real engine)
    if (this.state.lockedKeyLetters.length > 0) {
      for (const lockedLetter of this.state.lockedKeyLetters) {
        // If the locked letter is in the current word but not in the new word, it's being removed
        if (this.state.currentWord.includes(lockedLetter) && !newWord.toUpperCase().includes(lockedLetter)) {
          return {
            newWord,
            isValid: false,
            validationResult: { 
              isValid: false, 
              reason: `Cannot remove locked key letter '${lockedLetter}' - it was used by the previous player`, 
              word: newWord 
            },
            scoringResult: null,
            canApply: false,
            reason: `Cannot remove locked key letter '${lockedLetter}' - it was used by the previous player`
          };
        }
      }
    }
    
    // Calculate scoring using real engine logic
    const scoringResult = calculateScore(this.state.currentWord, newWord, this.state.keyLetters);
    
    return {
      newWord,
      isValid: true,
      validationResult: validation,
      scoringResult,
      canApply: true,
      reason: 'Valid move'
    };
  }
  
  applyMove(attempt: any): boolean {
    if (!attempt.canApply || !attempt.scoringResult) {
      return false;
    }
    
    const currentPlayer = this.state.players.find((p: any) => p.isCurrentPlayer);
    if (!currentPlayer) {
      return false;
    }

    const previousWord = this.state.currentWord;

    // Update game state (same as real engine)
    this.state.currentWord = attempt.newWord;
    this.state.lastMoveTime = Date.now();
    this.state.totalMoves++;
    
    // Track this word as used
    this.state.usedWords.add(attempt.newWord.toUpperCase());

    // Update player score
    currentPlayer.score += attempt.scoringResult.totalScore;

    // Add to turn history (same format as real engine)
    this.state.turnHistory.push({
      turnNumber: this.state.currentTurn,
      playerId: currentPlayer.id,
      previousWord,
      newWord: attempt.newWord,
      score: attempt.scoringResult.totalScore,
      scoringBreakdown: attempt.scoringResult,
      timestamp: Date.now()
    });

    // KEY LETTER LOCKING FEATURE (same as real engine)
    // Clear any existing locked key letters since this player has now completed their turn with them
    this.state.lockedKeyLetters = [];
    
    // If this player used key letters, lock them for the next player
    if (attempt.scoringResult.keyLettersUsed.length > 0) {
      // Find which key letters were used and are now in the new word
      const usedKeyLetters = attempt.scoringResult.keyLettersUsed.filter((letter: string) => 
        attempt.newWord.toUpperCase().includes(letter.toUpperCase())
      );
      
      // These letters will be locked for the next player's turn
      this.state.lockedKeyLetters = usedKeyLetters.map((letter: string) => letter.toUpperCase());
    }

    // Automatic key letter generation - maintain exactly 1 key letter per turn (same as real engine)
    if (this.state.config.enableKeyLetters) {
      // Track the current key letter as used (since it was active for this turn)
      this.state.keyLetters.forEach((letter: string) => {
        this.state.usedKeyLetters.add(letter);
      });
      
      // Clear current key letters and generate exactly 1 new key letter
      this.state.keyLetters = [];
      this.generateRandomKeyLetter();
    }
    
    // Switch to next player
    this.switchToNextPlayer();
    
    // Check if game is finished
    if (this.state.currentTurn > this.state.maxTurns) {
      this.state.gameStatus = 'finished';
    }
    
    this.notifyListeners();
    return true;
  }
  
  private switchToNextPlayer() {
    this.state.players.forEach((player: any) => {
      player.isCurrentPlayer = !player.isCurrentPlayer;
    });
    
    // Increment turn after switching players (same as real engine)
    this.state.currentTurn++;
  }
  
  async makeBotMove() {
    // Simple bot implementation using real engine bot
    const botMove = await generateBotMove(this.state.currentWord, {
      keyLetters: this.state.keyLetters,
      lockedLetters: this.state.lockedLetters,
      usedWords: Array.from(this.state.usedWords),
      isValidWord: (word: string) => isValidDictionaryWordSync(word),
      isBot: false // Use same validation rules as human for fair play
    });
    
    if (botMove) {
      const attempt = this.attemptMove(botMove.word);
      if (attempt.canApply) {
        this.applyMove(attempt);
      }
    }
    
    return botMove;
  }
  
  resetGame() {
    const now = Date.now();
    
    this.state.gameStatus = 'waiting';
    this.state.currentTurn = 1; // FIXED: Start at 1 like real engine
    this.state.keyLetters = [];
    this.state.lockedLetters = [];
    this.state.lockedKeyLetters = []; // NEW: Reset locked key letters
    this.state.turnHistory = [];
    this.state.usedWords.clear();
    this.state.usedKeyLetters.clear(); // NEW: Reset used key letters
    this.state.totalMoves = 0; // NEW: Reset total moves
    this.state.gameStartTime = now; // NEW: Reset timestamps
    this.state.lastMoveTime = now;
    
    this.state.players.forEach((player: any) => {
      player.score = 0;
      player.isCurrentPlayer = player.id === 'human';
    });
    this.notifyListeners();
  }
  
  passTurn(): boolean {
    if (this.state.gameStatus !== 'playing') {
      return false;
    }

    const currentPlayer = this.state.players.find((p: any) => p.isCurrentPlayer);
    if (!currentPlayer) {
      return false;
    }

    // Clear locked key letters when passing (locks are removed) - same as real engine
    this.state.lockedKeyLetters = [];

    // Add to turn history to track the pass
    this.state.turnHistory.push({
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
          rearrangePoints: 0,
          keyLetterUsagePoints: 0,
        },
        actions: ['PASS'],
        keyLettersUsed: []
      },
      timestamp: Date.now()
    });

    // Generate new key letters even on pass (maintains 1 per turn rule) - same as real engine
    if (this.state.config.enableKeyLetters) {
      // Track the current key letter as used (since it was active for this turn)
      this.state.keyLetters.forEach((letter: string) => {
        this.state.usedKeyLetters.add(letter);
      });
      
      // Clear current key letters and generate exactly 1 new key letter
      this.state.keyLetters = [];
      this.generateRandomKeyLetter();
    }

    // Switch to next player
    this.switchToNextPlayer();

    // Check if game is finished
    if (this.state.currentTurn > this.state.maxTurns) {
      this.state.gameStatus = 'finished';
    }

    this.notifyListeners();
    return true;
  }
  
  setWord(word: string): boolean {
    const validation = validateWord(word);
    if (validation.isValid) {
      this.state.currentWord = validation.word;
      this.notifyListeners();
      return true;
    }
    return false;
  }
  
  addKeyLetter(letter: string) {
    if (!this.state.keyLetters.includes(letter.toUpperCase())) {
      this.state.keyLetters.push(letter.toUpperCase());
      this.notifyListeners();
    }
  }
  
  removeKeyLetter(letter: string) {
    const index = this.state.keyLetters.indexOf(letter.toUpperCase());
    if (index > -1) {
      this.state.keyLetters.splice(index, 1);
      this.notifyListeners();
    }
  }
  
  addLockedLetter(letter: string) {
    if (!this.state.lockedLetters.includes(letter.toUpperCase())) {
      this.state.lockedLetters.push(letter.toUpperCase());
      this.notifyListeners();
    }
  }
  
  removeLockedLetter(letter: string) {
    const index = this.state.lockedLetters.indexOf(letter.toUpperCase());
    if (index > -1) {
      this.state.lockedLetters.splice(index, 1);
      this.notifyListeners();
    }
  }
}

export function createGameStateManager(config: any = {}): BrowserGameStateManager {
  return new BrowserGameStateManager(config);
} 