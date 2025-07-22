/**
 * Browser Adapter for WordPlay Game Engine
 * 
 * Platform-specific implementation for browser environments that provides
 * dictionary loading via fetch API and caching strategies.
 */

import type { WordDataDependencies } from '../../packages/engine/dictionary';

// Import centralized profanity management
import { getComprehensiveProfanityWords } from '../../packages/engine/profanity';

/**
 * Browser-specific word data implementation
 * Loads dictionary via fetch API with caching
 */
class BrowserWordData implements WordDataDependencies {
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  private wordsByLength: Map<number, string[]> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadDictionary();
  }

  public hasWord(word: string): boolean {
    const upperWord = word.toUpperCase();
    return this.enableWords.has(upperWord) || this.slangWords.has(upperWord);
  }

  public getRandomWordByLength(length: number): string | null {
    const words = this.wordsByLength.get(length);
    if (!words || words.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  public isLoaded(): boolean {
    return this.isLoaded;
  }

  private async loadDictionary(): Promise<void> {
    try {
      // Load the full ENABLE dictionary (172,819 words)
      const response = await fetch('/enable1.txt');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const wordList = text
        .split('\n')
        .map(word => word.trim().toUpperCase())
        .filter(word => word.length > 0);

      // Build word set for fast lookup
      this.enableWords = new Set(wordList);

      // Build words-by-length map for random selection
      this.wordsByLength.clear();
      for (const word of wordList) {
        const length = word.length;
        if (!this.wordsByLength.has(length)) {
          this.wordsByLength.set(length, []);
        }
        this.wordsByLength.get(length)!.push(word);
      }

      // Load slang words from shared data file
      try {
        const slangResponse = await fetch('/data/slang-words.json');
        if (slangResponse.ok) {
          const slangData = await slangResponse.json();
          this.slangWords = new Set(slangData.words || []);
          console.log(`Slang words loaded: ${this.slangWords.size} words`);
        } else {
          this.slangWords = new Set();
        }
      } catch (slangError) {
        console.warn('Error loading slang words:', slangError);
        this.slangWords = new Set();
      }
      
      // Load profanity words from shared data file
      try {
        const profanityResponse = await fetch('/data/profanity-words.json');
        if (profanityResponse.ok) {
          const profanityData = await profanityResponse.json();
          this.profanityWords = new Set(profanityData.words || []);
          console.log(`Profanity words loaded: ${this.profanityWords.size} words`);
        } else {
          this.profanityWords = new Set();
        }
      } catch (profanityError) {
        console.warn('Error loading profanity words:', profanityError);
        this.profanityWords = new Set();
      }
      
      this.isLoaded = true;
      
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      this.initializeFallback();
    }
  }

  private initializeFallback(): void {
    const fallbackWords = [
      'CAT', 'DOG', 'WORD', 'GAME', 'PLAY', 'MOVE', 'TURN', 'SCORE',
      'CATS', 'DOGS', 'WORDS', 'GAMES', 'PLAYS', 'MOVES', 'TURNS', 'SCORES',
      'HELLO', 'WORLD', 'TEST', 'TIME', 'GOOD', 'BAD', 'NEW', 'OLD',
      'BIG', 'SMALL', 'HOT', 'COLD', 'LIGHT', 'DARK', 'HAPPY', 'SAD'
    ];
    
    this.enableWords = new Set(fallbackWords);
    this.slangWords = new Set(['BRUH', 'YEAH', 'YEET', 'SELFIE']);
    
    // Use empty profanity set for fallback
    this.profanityWords = new Set();
    
    this.isLoaded = true;
  }
}

// =============================================================================
// BROWSER DEPENDENCY IMPLEMENTATIONS
// =============================================================================

/**
 * Browser dictionary dependencies implementation
 */
const browserDictionaryDependencies: GameStateDictionaryDependencies = {
  validateWord: (word: string, options?: any): ValidationResult => {
    // Use the enhanced validation function with user-friendly messages
    return validateWordWithDependencies(word, browserWordData, options);
  },

  getRandomWordByLength: (length: number): string | null => {
    return browserWordData.getRandomWordByLength(length);
  }
};

/**
 * Browser scoring dependencies implementation
 * Uses direct imports from scoring module since it's platform-agnostic
 */
const browserScoringDependencies: GameStateScoringDependencies = {
  calculateScore: (fromWord: string, toWord: string, options?: any): ScoringResult => {
    return calculateScore(fromWord, toWord, options);
  },

  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]): number => {
    return getScoreForMove(fromWord, toWord, keyLetters);
  },

  isValidMove: (fromWord: string, toWord: string): boolean => {
    return isValidMove(fromWord, toWord);
  }
};

/**
 * Browser bot dependencies implementation
 */
const browserBotDependencies: GameStateBotDependencies = {
  generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
    // Create combined dependencies for bot
    const botDeps: BotDependencies = {
      ...browserDictionaryDependencies,
      ...browserScoringDependencies,
      isValidDictionaryWord: (word: string): boolean => {
        return isValidDictionaryWordWithDependencies(word, browserWordData);
      }
    };
    
    return generateBotMoveWithDependencies(word, botDeps, options);
  }
};

/**
 * Complete browser dependencies for game state management
 */
const browserGameDependencies: GameStateDependencies = {
  ...browserDictionaryDependencies,
  ...browserScoringDependencies,
  ...browserBotDependencies
};

// =============================================================================
// BROWSER ADAPTER API
// =============================================================================

/**
 * Browser Platform Adapter
 * Main interface for browser-specific WordPlay engine integration
 */
export class BrowserAdapter {
  private static instance: BrowserAdapter | null = null;
  private wordData: BrowserWordData;
  private initialized: boolean = false;

  private constructor() {
    this.wordData = new BrowserWordData(); // Initialize the new BrowserWordData
  }

  /**
   * Get the singleton browser adapter instance
   */
  static getInstance(): BrowserAdapter {
    if (!BrowserAdapter.instance) {
      BrowserAdapter.instance = new BrowserAdapter();
    }
    return BrowserAdapter.instance;
  }

  /**
   * Initialize the browser adapter (loads dictionary)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // The new BrowserWordData constructor now handles loading
    this.initialized = true;
  }

  /**
   * Get game state dependencies for browser environment
   */
  getGameDependencies(): GameStateDependencies {
    if (!this.initialized) {
      console.warn('BrowserAdapter not initialized. Call initialize() first.');
    }
    return browserGameDependencies;
  }

  /**
   * Get dictionary dependencies only
   */
  getDictionaryDependencies(): GameStateDictionaryDependencies {
    return browserDictionaryDependencies;
  }

  /**
   * Get scoring dependencies only
   */
  getScoringDependencies(): GameStateScoringDependencies {
    return browserScoringDependencies;
  }

  /**
   * Get bot dependencies only
   */
  getBotDependencies(): GameStateBotDependencies {
    return browserBotDependencies;
  }

  /**
   * Check if adapter is initialized
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get dictionary status for debugging
   */
  getDictionaryStatus(): { loaded: boolean; wordCount: number } {
    return {
      loaded: this.wordData.isLoaded(), // Use the new isLoaded()
      wordCount: this.wordData.enableWords.size // Use the new enableWords size
    };
  }

  /**
   * Force reload dictionary (for debugging)
   */
  async reloadDictionary(): Promise<void> {
    // The new BrowserWordData constructor now handles loading
    this.wordData = new BrowserWordData();
    this.initialized = false; // Reset initialized flag
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Initialize and get browser adapter
 */
export async function createBrowserAdapter(): Promise<BrowserAdapter> {
  const adapter = BrowserAdapter.getInstance();
  await adapter.initialize();
  return adapter;
}

/**
 * Quick access to browser game dependencies (requires initialization)
 */
export function getBrowserGameDependencies(): GameStateDependencies {
  return BrowserAdapter.getInstance().getGameDependencies();
}

/**
 * Quick validation using browser dependencies
 */
export function validateWordBrowser(word: string, options?: any): ValidationResult {
  return browserDictionaryDependencies.validateWord(word);
}

/**
 * Quick scoring using browser dependencies
 */
export function scoreMovesBrowser(fromWord: string, toWord: string, keyLetters?: string[]): number {
  return browserScoringDependencies.getScoreForMove(fromWord, toWord, keyLetters);
}

// =============================================================================
// BROWSER ADAPTER EXPORTS
// =============================================================================

export {
  browserGameDependencies,
  browserDictionaryDependencies,
  browserScoringDependencies,
  browserBotDependencies
};

export default BrowserAdapter; 