/**
 * Browser-Compatible Game Engine
 * 
 * This provides the same interface as the Node.js game engine
 * but works in browser environments.
 */

import { validateWordSync, getRandomWordByLength, type ValidationResult } from './browserDictionary';

// Simple interfaces needed for browser compatibility
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
  currentWord: string;
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  usedWords: string[];
  players: PlayerState[];
  currentTurn: number;
  maxTurns: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner: PlayerState | null;
  turnHistory: TurnHistory[];
  totalMoves: number;
  config: GameConfig;
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

export interface BotMove {
  word: string;
  score: number;
  confidence: number;
  reasoning: string[];
}

export interface GameStateUpdate {
  type: 'word_changed' | 'turn_completed' | 'game_finished' | 'player_changed' | 'letters_updated';
  data: Record<string, unknown>;
  timestamp: number;
}

type GameStateListener = (update: GameStateUpdate) => void;

// Simple bot for browser environment
function generateSimpleBotMove(currentWord: string): BotMove | null {
  const attempts = [
    // Try adding common letters
    ...['S', 'E', 'D', 'R', 'Y'].map(letter => currentWord + letter),
    ...['S', 'E', 'D', 'R', 'Y'].map(letter => letter + currentWord),
    // Try removing last letter if word is long enough
    ...(currentWord.length > 3 ? [currentWord.slice(0, -1)] : []),
    // Try removing first letter if word is long enough
    ...(currentWord.length > 3 ? [currentWord.slice(1)] : []),
    // Try simple substitutions
    ...['CAT', 'BAT', 'HAT', 'MAT', 'RAT', 'CATS', 'BATS', 'HATS', 'RATS']
  ];

  for (const word of attempts) {
    const validation = validateWordSync(word, { isBot: false });
    if (validation.isValid && word !== currentWord) {
      return {
        word: word.toUpperCase(),
        score: 1,
        confidence: 0.7,
        reasoning: [`Changed ${currentWord} to ${word}`]
      };
    }
  }

  return null;
}

/**
 * Browser-Compatible Game State Manager
 */
export class LocalGameStateManager {
  private state: any;
  private listeners: GameStateListener[] = [];

  constructor(config: GameConfig = {}) {
    this.state = this.initializeGameState(config);
  }

  private initializeGameState(config: GameConfig) {
    let initialWord = config.initialWord;
    if (!initialWord) {
      const randomWord = getRandomWordByLength(4);
      initialWord = randomWord || 'WORD';
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

  public getState(): PublicGameState {
    return {
      ...this.state,
      usedWords: Array.from(this.state.usedWords || [])
    };
  }

  public getCurrentPlayer(): PlayerState | null {
    return this.state.players.find((p: PlayerState) => p.isCurrentPlayer) || null;
  }

  public startGame(): void {
    this.state.gameStatus = 'playing';
    this.state.usedWords.add(this.state.currentWord.toUpperCase());
    this.generateRandomKeyLetter();
    this.notifyListeners({
      type: 'game_finished',
      data: { status: 'playing' },
      timestamp: Date.now()
    });
  }

  public attemptMove(newWord: string): MoveAttempt {
    console.log('attemptMove called:', { newWord, currentWord: this.state.currentWord, gameStatus: this.state.gameStatus });
    
    const validation = validateWordSync(newWord, { 
      isBot: false,
      previousWord: this.state.currentWord 
    });

    console.log('usedWords check:', { 
      newWordUpper: newWord.toUpperCase(), 
      usedWords: Array.from(this.state.usedWords),
      hasWord: this.state.usedWords.has(newWord.toUpperCase())
    });

    if (this.state.usedWords.has(newWord.toUpperCase())) {
      console.log('Word already used');
      return {
        newWord,
        isValid: false,
        validationResult: {
          isValid: false,
          reason: 'Word has already been used in this game',
          word: newWord
        },
        scoringResult: null,
        canApply: false,
        reason: 'Word has already been used in this game'
      };
    }

    if (!validation.isValid) {
      console.log('Validation failed:', validation);
      return {
        newWord,
        isValid: false,
        validationResult: validation,
        scoringResult: null,
        canApply: false,
        reason: validation.reason
      };
    }

    // Detect what actions were taken using character frequency analysis
    const actions = [];
    const currentWordUpper = this.state.currentWord.toUpperCase();
    const newWordUpper = newWord.toUpperCase();
    
    // Create character frequency maps
    const currentFreq = new Map<string, number>();
    const newFreq = new Map<string, number>();
    
    currentWordUpper.split('').forEach((char: string) => {
      currentFreq.set(char, (currentFreq.get(char) || 0) + 1);
    });
    
    newWordUpper.split('').forEach((char: string) => {
      newFreq.set(char, (newFreq.get(char) || 0) + 1);
    });
    
    // Find added and removed letters
    const addedLetters: string[] = [];
    const removedLetters: string[] = [];
    
    const allChars = new Set([...currentFreq.keys(), ...newFreq.keys()]);
    
    allChars.forEach((char: string) => {
      const currentCount = currentFreq.get(char) || 0;
      const newCount = newFreq.get(char) || 0;
      const diff = newCount - currentCount;
      
      if (diff > 0) {
        // Letter was added
        for (let i = 0; i < diff; i++) {
          addedLetters.push(char);
        }
      } else if (diff < 0) {
        // Letter was removed
        for (let i = 0; i < Math.abs(diff); i++) {
          removedLetters.push(char);
        }
      }
    });
    
    // Check if letters were rearranged (same letters, different order)
    const isRearranged = currentWordUpper.length === newWordUpper.length && 
                        addedLetters.length === 0 && 
                        removedLetters.length === 0 && 
                        currentWordUpper !== newWordUpper;
    
    // Score calculation
    let addLetterPoints = 0;
    let removeLetterPoints = 0;
    let rearrangePoints = 0;
    
    if (addedLetters.length > 0) {
      addLetterPoints = 1;
      actions.push('add');
    }
    
    if (removedLetters.length > 0) {
      removeLetterPoints = 1;
      actions.push('remove');
    }
    
    if (isRearranged) {
      rearrangePoints = 1;
      actions.push('rearrange');
    }
    
    // Check for key letter usage
    const keyLettersUsed = this.state.keyLetters.filter((letter: string) => newWordUpper.includes(letter));
    const keyLetterUsagePoints = keyLettersUsed.length > 0 ? 1 : 0;
    
    const totalScore = addLetterPoints + removeLetterPoints + rearrangePoints + keyLetterUsagePoints;
    
    const scoringResult: ScoringResult = {
      totalScore,
      breakdown: {
        addLetterPoints,
        removeLetterPoints,
        rearrangePoints,
        keyLetterUsagePoints,
      },
      actions,
      keyLettersUsed
    };

    console.log('Move attempt successful:', { newWord, scoringResult });

    return {
      newWord,
      isValid: true,
      validationResult: validation,
      scoringResult,
      canApply: true
    };
  }

  public applyMove(moveAttempt: MoveAttempt): boolean {
    if (!moveAttempt.canApply) return false;

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return false;

    this.state.usedWords.add(this.state.currentWord);
    this.state.currentWord = moveAttempt.newWord.toUpperCase();
    
    currentPlayer.score += moveAttempt.scoringResult?.totalScore || 0;
    
    this.state.turnHistory.push({
      turnNumber: this.state.currentTurn,
      playerId: currentPlayer.id,
      previousWord: this.state.currentWord,
      newWord: moveAttempt.newWord.toUpperCase(),
      score: moveAttempt.scoringResult?.totalScore || 0,
      scoringBreakdown: moveAttempt.scoringResult!,
      timestamp: Date.now()
    });

    this.state.totalMoves++;
    this.switchToNextPlayer();

    this.notifyListeners({
      type: 'turn_completed',
      data: { move: moveAttempt },
      timestamp: Date.now()
    });

    return true;
  }

  public async makeBotMove(): Promise<BotMove | null> {
    const botMove = generateSimpleBotMove(this.state.currentWord);
    
    if (botMove) {
      const moveAttempt = this.attemptMove(botMove.word);
      if (moveAttempt.canApply) {
        this.applyMove(moveAttempt);
      }
    } else {
      this.passTurn();
    }

    return botMove;
  }

  public passTurn(): boolean {
    this.switchToNextPlayer();
    return true;
  }

  private switchToNextPlayer(): void {
    const currentPlayerIndex = this.state.players.findIndex((p: PlayerState) => p.isCurrentPlayer);
    
    this.state.players[currentPlayerIndex].isCurrentPlayer = false;
    
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.state.players.length;
    this.state.players[nextPlayerIndex].isCurrentPlayer = true;
    
    if (nextPlayerIndex === 0) {
      this.state.currentTurn++;
      this.generateRandomKeyLetter();
      
      if (this.state.currentTurn > this.state.maxTurns) {
        this.finishGame();
      }
    }
  }

  private finishGame(): void {
    this.state.gameStatus = 'finished';
    
    const sortedPlayers = [...this.state.players].sort((a, b) => b.score - a.score);
    if (sortedPlayers[0].score > sortedPlayers[1]?.score) {
      this.state.winner = sortedPlayers[0];
    } else {
      this.state.winner = null;
    }

    this.notifyListeners({
      type: 'game_finished',
      data: { winner: this.state.winner },
      timestamp: Date.now()
    });
  }

  private generateRandomKeyLetter(): void {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const currentWordLetters = this.state.currentWord.split('');
    const availableLetters = alphabet.split('').filter(
      letter => !this.state.usedKeyLetters.has(letter) && !currentWordLetters.includes(letter)
    );

    if (availableLetters.length > 0) {
      const randomLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
      this.state.keyLetters = [randomLetter];
      this.state.usedKeyLetters.add(randomLetter);
    }
  }

  public resetGame(): void {
    this.state = this.initializeGameState(this.state.config);
    this.notifyListeners({
      type: 'game_finished',
      data: { reset: true },
      timestamp: Date.now()
    });
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.push(listener);
    
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
        console.error('Error in game state listener:', error);
      }
    });
  }

  public addKeyLetter(letter: string): void {
    if (!this.state.keyLetters.includes(letter)) {
      this.state.keyLetters.push(letter);
    }
  }

  public removeKeyLetter(letter: string): void {
    this.state.keyLetters = this.state.keyLetters.filter((l: string) => l !== letter);
  }

  public addLockedLetter(letter: string): void {
    if (!this.state.lockedLetters.includes(letter)) {
      this.state.lockedLetters.push(letter);
    }
  }

  public removeLockedLetter(letter: string): void {
    this.state.lockedLetters = this.state.lockedLetters.filter((l: string) => l !== letter);
  }

  public setWord(word: string): boolean {
    this.state.currentWord = word.toUpperCase();
    return true;
  }
} 