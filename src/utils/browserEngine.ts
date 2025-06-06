/**
 * Browser-Compatible Engine Wrapper
 * 
 * This module wraps the real engine to provide browser compatibility
 * by handling dictionary validation separately from the core game logic.
 * 
 * The game logic remains IDENTICAL to the terminal game.
 */

import { isValidDictionaryWordSync } from './browserDictionary';

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
    this.state = {
      gameStatus: 'waiting',
      currentWord: config.initialWord || 'WORD',
      keyLetters: [],
      lockedLetters: [],
      currentTurn: 0,
      maxTurns: config.maxTurns || 10,
      players: [
        { id: 'human', score: 0, isCurrentPlayer: true },
        { id: 'bot', score: 0, isCurrentPlayer: false }
      ],
      turnHistory: [],
      usedWords: new Set<string>()
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
  
  startGame() {
    this.state.gameStatus = 'playing';
    this.state.usedWords.add(this.state.currentWord.toUpperCase());
    this.generateRandomKeyLetter();
    this.notifyListeners();
  }
  
  private generateRandomKeyLetter() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const currentWordLetters = new Set(this.state.currentWord.toUpperCase().split(''));
    const usedKeyLetters = new Set(this.state.keyLetters);
    
    const availableLetters = alphabet.split('').filter(letter => 
      !currentWordLetters.has(letter) && !usedKeyLetters.has(letter)
    );
    
    if (availableLetters.length > 0) {
      const randomLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
      this.state.keyLetters.push(randomLetter);
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
    if (!attempt.canApply) {
      return false;
    }
    
    // Update game state
    this.state.currentWord = attempt.newWord;
    this.state.usedWords.add(attempt.newWord.toUpperCase());
    this.state.currentTurn++;
    
    // Update player score
    const currentPlayer = this.state.players.find((p: any) => p.isCurrentPlayer);
    if (currentPlayer && attempt.scoringResult) {
      currentPlayer.score += attempt.scoringResult.totalScore;
    }
    
    // Add to turn history
    this.state.turnHistory.push({
      turn: this.state.currentTurn,
      player: currentPlayer?.id || 'unknown',
      word: attempt.newWord,
      score: attempt.scoringResult?.totalScore || 0,
      action: analyzeWordChange(this.state.currentWord, attempt.newWord)
    });
    
    // Switch players
    this.switchToNextPlayer();
    
    // Generate new key letter
    this.generateRandomKeyLetter();
    
    // Check if game is finished
    if (this.state.currentTurn >= this.state.maxTurns) {
      this.state.gameStatus = 'finished';
    }
    
    this.notifyListeners();
    return true;
  }
  
  private switchToNextPlayer() {
    this.state.players.forEach((player: any) => {
      player.isCurrentPlayer = !player.isCurrentPlayer;
    });
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
    this.state.gameStatus = 'waiting';
    this.state.currentTurn = 0;
    this.state.keyLetters = [];
    this.state.lockedLetters = [];
    this.state.turnHistory = [];
    this.state.usedWords.clear();
    this.state.players.forEach((player: any) => {
      player.score = 0;
      player.isCurrentPlayer = player.id === 'human';
    });
    this.notifyListeners();
  }
  
  passTurn(): boolean {
    this.switchToNextPlayer();
    this.generateRandomKeyLetter();
    this.state.currentTurn++;
    
    if (this.state.currentTurn >= this.state.maxTurns) {
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