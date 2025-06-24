/**
 * Browser Platform Adapter
 * 
 * This adapter provides all necessary dependencies for running the WordPlay engine
 * in browser environments. It handles HTTP dictionary loading, React-compatible
 * state management, and browser-specific optimizations.
 * 
 * ARCHITECTURE: This is a platform adapter that implements the dependency
 * interfaces defined in the engine modules. It bridges browser-specific
 * functionality with the platform-agnostic engine.
 */

import type { 
  GameStateDependencies, 
  GameStateDictionaryDependencies, 
  GameStateScoringDependencies, 
  GameStateBotDependencies,
  ValidationResult,
  ScoringResult,
  BotResult
} from '../../packages/engine/gamestate';

import type {
  WordDataDependencies
} from '../../packages/engine/dictionary';

// Import the dependency-injected functions from engine
import { 
  validateWordWithDependencies,
  isValidDictionaryWordWithDependencies,
  getRandomWordByLengthWithDependencies
} from '../../packages/engine/dictionary';

import {
  generateBotMoveWithDependencies
} from '../../packages/engine/bot';

import type {
  BotDependencies
} from '../../packages/engine/bot';

import {
  calculateScore,
  getScoreForMove,
  isValidMove
} from '../../packages/engine/scoring';

// =============================================================================
// BROWSER DICTIONARY SERVICE
// =============================================================================

/**
 * Browser-specific word data implementation
 * Loads dictionary via HTTP and provides fast lookup
 * Implements WordDataDependencies interface for engine compatibility
 */
class BrowserWordData implements WordDataDependencies {
  // WordDataDependencies interface implementation
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  
  // Additional browser-specific features
  private wordsByLength: Map<number, string[]> = new Map();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Load the full ENABLE dictionary via HTTP
   */
  async loadDictionary(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadDictionaryInternal();
    return this.loadPromise;
  }

  private async loadDictionaryInternal(): Promise<void> {
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

      // Initialize slang and profanity sets with basic examples
      this.slangWords = new Set(); // Could be extended with slang list
      this.profanityWords = new Set(['DAMN', 'HELL']); // Basic profanity list
      this.isLoaded = true;
      
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      this.initializeFallback();
    }
  }

  private initializeFallback(): void {
    // Fallback word set for development/testing
    this.enableWords = new Set([
      'CAT', 'DOG', 'FISH', 'BIRD', 'MOUSE', 'HORSE', 'COW', 'PIG', 'SHEEP', 'GOAT',
      'CATS', 'DOGS', 'COAT', 'BOAT', 'GOATS', 'COATS', 'BOATS',
      'HELLO', 'WORLD', 'TEST', 'WORD', 'GAME', 'PLAY', 'TURN', 'MOVE',
      'TESTING', 'BROWSER', 'ADAPTER'
    ]);
    
    // Build words-by-length map for fallback dictionary
    this.wordsByLength.clear();
    for (const word of this.enableWords) {
      const length = word.length;
      if (!this.wordsByLength.has(length)) {
        this.wordsByLength.set(length, []);
      }
      this.wordsByLength.get(length)!.push(word);
    }
    
    this.slangWords = new Set(['BRUH', 'YEET', 'FLEX']);
    this.profanityWords = new Set(['DAMN', 'HELL']);
    this.isLoaded = true;
  }

  /**
   * Check if a word exists in the dictionary
   */
  hasWord(word: string): boolean {
    return this.enableWords.has(word.toUpperCase());
  }

  /**
   * Get a random word of specified length
   */
  getRandomWordByLength(length: number): string | null {
    const wordsOfLength = this.wordsByLength.get(length);
    if (!wordsOfLength || wordsOfLength.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * wordsOfLength.length);
    return wordsOfLength[randomIndex];
  }

  /**
   * Check if dictionary is loaded
   */
  get loaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get word count for debugging
   */
  get wordCount(): number {
    return this.enableWords.size;
  }
}

// Singleton instance for the browser
const browserWordData = new BrowserWordData();

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
    this.wordData = browserWordData;
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

    await this.wordData.loadDictionary();
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
      loaded: this.wordData.loaded,
      wordCount: this.wordData.wordCount
    };
  }

  /**
   * Force reload dictionary (for debugging)
   */
  async reloadDictionary(): Promise<void> {
    this.wordData['loadPromise'] = null;
    this.wordData['isLoaded'] = false;
    await this.wordData.loadDictionary();
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