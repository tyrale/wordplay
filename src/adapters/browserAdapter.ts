/**
 * Browser Adapter for WordPlay Game Engine
 * 
 * Platform-specific implementation for browser environments that provides
 * dictionary loading via fetch API and caching strategies.
 */

import type { WordDataDependencies, ValidationResult } from '../../packages/engine/dictionary';
import { validateWordWithDependencies, isValidDictionaryWordWithDependencies } from '../../packages/engine/dictionary';
import { calculateScore, getScoreForMove, isValidMove } from '../../packages/engine/scoring';
import type { ScoringResult } from '../../packages/engine/scoring';
import { generateBotMoveWithDependencies } from '../../packages/engine/bot';
import type { BotDependencies, BotResult, BotMove, BotOptions } from '../../packages/engine/bot';
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
  private wordsByLength: Map<number, string[]> = new Map();
  private loaded = false;

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
    return this.loaded;
  }

  private async loadDictionary(): Promise<void> {
    if (this.loaded) return; // Prevent multiple loads
    console.log('Loading dictionary...'); // Log dictionary loading
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
    console.log('Creating new BrowserWordData instance'); // Log instance creation
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
    const botDeps: BotDependencies = {
      ...browserDictionaryDependencies,
      ...browserScoringDependencies,
      isValidDictionaryWord: (word: string): boolean => {
        return isValidDictionaryWordWithDependencies(word, getBrowserWordData());
      }
    };
    return generateBotMoveWithDependencies(word, botDeps, options);
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