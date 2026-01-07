/**
 * Browser Adapter for WordPlay Game Engine
 * 
 * Platform-specific implementation for browser environments that provides
 * dictionary loading via fetch API and caching strategies.
 */

import type { WordDataDependencies, ValidationResult, BotDependencies } from '../../packages/engine/interfaces';
import { validateWordWithDependencies, isValidDictionaryWordWithDependencies } from '../../packages/engine/dictionary';
import { calculateScore, getScoreForMove, isValidMove } from '../../packages/engine/scoring';
import type { ScoringResult } from '../../packages/engine/scoring';
import { generateBotMoveWithDependencies } from '../../packages/engine/bot';
import type { BotOptions } from '../../packages/engine/bot';
import type { BotMove, BotResult } from '../../packages/engine/interfaces';
import type { 
  GameStateDictionaryDependencies, 
  GameStateScoringDependencies, 
  GameStateBotDependencies,
  GameStateDependencies
} from '../../packages/engine/gamestate';

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
  public wordCount: number = 0;
  private wordsByLength: Map<number, string[]> = new Map();
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.loadingPromise = this.loadDictionary();
  }

  public hasWord(word: string): boolean {
    const upperWord = word.toUpperCase();
    return this.enableWords.has(upperWord) || this.slangWords.has(upperWord);
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Wait for dictionary to be loaded
   */
  public async waitForLoad(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
  }

  public getRandomWordByLength(length: number): string | null {
    if (!this.loaded) {
      console.warn('BrowserWordData: Dictionary not loaded yet, returning null');
      return null;
    }
    const words = this.wordsByLength.get(length);
    if (!words || words.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  private async loadDictionary(): Promise<void> {
    if (this.loaded) return; // Prevent multiple loads
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
      this.wordCount = this.enableWords.size;

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
      
      this.loaded = true;
      console.log('Dictionary loaded successfully.'); // Log successful load
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
    this.wordCount = this.enableWords.size;
    this.slangWords = new Set(['BRUH', 'YEAH', 'YEET', 'SELFIE']);
    
    // Use empty profanity set for fallback
    this.profanityWords = new Set();
    
    this.loaded = true;
  }
}

// =============================================================================
// BROWSER DEPENDENCY IMPLEMENTATIONS
// =============================================================================

// Singleton instance for browser word data
let browserWordData: BrowserWordData | null = null;

function getBrowserWordData(): BrowserWordData {
  if (!browserWordData) {
        browserWordData = new BrowserWordData();
  }
  return browserWordData;
}

// Centralize dependency creation
const browserDictionaryDependencies: GameStateDictionaryDependencies = {
  validateWord: (word: string, options?: any): ValidationResult => {
    return validateWordWithDependencies(word, getBrowserWordData(), options);
  },

  getRandomWordByLength: (length: number): string | null => {
    return getBrowserWordData().getRandomWordByLength(length);
  }
};

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

const browserBotDependencies: GameStateBotDependencies = {
  generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
    // Create complete BotDependencies with all required interfaces
    const botDeps: BotDependencies = {
      // DictionaryDependencies
      validateWord: browserDictionaryDependencies.validateWord,
      isValidDictionaryWord: (word: string): boolean => {
        return isValidDictionaryWordWithDependencies(word, getBrowserWordData());
      },
      getRandomWordByLength: browserDictionaryDependencies.getRandomWordByLength,
      getWordCount: (): number => {
        return getBrowserWordData().wordCount;
      },
      
      // UtilityDependencies  
      getTimestamp: (): number => Date.now(),
      random: (): number => Math.random(),
      log: (message: string): void => console.log(`[Bot] ${message}`),
      
      // ScoringDependencies
      getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]): number => {
        return getScoreForMove(fromWord, toWord, keyLetters || []);
      },
      calculateScore: (fromWord: string, toWord: string, keyLetters: string[], lockedLetters: string[]): ScoringResult => {
        return calculateScore(fromWord, toWord, { keyLetters });
      },
      
      // Bot-specific profanity checking
      isProfanity: (word: string): boolean => {
        return getBrowserWordData().profanityWords.has(word.toUpperCase());
      }
    };
    return generateBotMoveWithDependencies(word, botDeps, { ...options, botId: options.botId });
  }
};

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
    this.wordData = getBrowserWordData();
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
    
    // Wait for dictionary to load before marking as initialized
    await this.wordData.waitForLoad();
    
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
    this.wordData = getBrowserWordData();
    this.initialized = false; // Reset initialized flag
  }

  /**
   * Get word data for direct access (useful for ensuring dictionary is loaded)
   */
  getWordData(): BrowserWordData {
    return this.wordData;
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