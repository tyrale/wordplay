/**
 * Web Platform Adapter
 * 
 * This adapter provides all necessary dependencies for running the WordPlay engine
 * in web browser environments. It handles HTTP dictionary loading, browser-specific
 * optimizations, and provides the same interface as the Node.js adapter.
 * 
 * ARCHITECTURE: This is a platform adapter that implements the dependency
 * interfaces defined in the engine modules. It bridges web-specific
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
// WEB DICTIONARY SERVICE
// =============================================================================

/**
 * Web-specific word data implementation
 * Loads dictionary from HTTP requests and provides fast lookup
 */
class WebWordData implements WordDataDependencies {
  // WordDataDependencies interface implementation
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  
  // Additional web-specific features
  private wordsByLength: Map<number, string[]> = new Map();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Load dictionaries from HTTP requests
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
      // Try to load the full ENABLE dictionary from public folder
      const possiblePaths = [
        '/enable1.txt',
        '/public/enable1.txt',
        '/data/enable1.txt',
        '/assets/enable1.txt'
      ];

      let dictionaryContent: string | null = null;
      
      for (const path of possiblePaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            dictionaryContent = await response.text();
            console.log(`Dictionary loaded from: ${path}`);
            break;
          }
        } catch (error) {
          // Continue to next path
          console.warn(`Failed to load dictionary from ${path}:`, error);
        }
      }

      if (!dictionaryContent) {
        throw new Error('Dictionary file not found at any expected URL');
      }

      // Parse ENABLE dictionary
      const enableWords = dictionaryContent
        .split('\n')
        .map(word => word.trim().toUpperCase())
        .filter(word => word.length > 0);

      this.enableWords = new Set(enableWords);

      // Build words-by-length map for random selection
      this.wordsByLength.clear();
      for (const word of enableWords) {
        const length = word.length;
        if (!this.wordsByLength.has(length)) {
          this.wordsByLength.set(length, []);
        }
        this.wordsByLength.get(length)!.push(word);
      }

      // Initialize slang words (same as Node adapter for consistency)
      this.slangWords = new Set([
        'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG',
        'VLOG', 'WIFI', 'UBER', 'GOOGLE', 'TWEET', 'UNFRIEND', 'HASHTAG',
        'PHOTOBOMB', 'MANSPLAIN', 'GHOSTING', 'CATFISH', 'TROLL', 'MEME',
        'VIRAL', 'CLICKBAIT', 'SPAM', 'PHISHING', 'MALWARE', 'AVATAR',
        'NOOB', 'PWNED', 'EPIC', 'FAIL', 'WIN', 'OWNED', 'LEET', 'HAXOR'
      ]);

      // Initialize profanity words (same as Node adapter for consistency)
      this.profanityWords = new Set([
        'DAMN', 'HELL', 'CRAP', 'PISS', 'SHIT', 'FUCK', 'BITCH', 'ASSHOLE',
        'BASTARD', 'WHORE', 'SLUT', 'FART', 'POOP', 'BUTT', 'ASS'
      ]);

      this.isLoaded = true;
      console.log(`Dictionary loaded successfully: ${this.enableWords.size} words`);
      
    } catch (error) {
      console.error(`Failed to load dictionary:`, error);
      this.initializeFallback();
    }
  }

  private initializeFallback(): void {
    console.warn('Using fallback dictionary with limited words');
    
    const fallbackWords = [
      'CAT', 'DOG', 'WORD', 'GAME', 'PLAY', 'MOVE', 'TURN', 'SCORE',
      'CATS', 'DOGS', 'WORDS', 'GAMES', 'PLAYS', 'MOVES', 'TURNS', 'SCORES',
      'HELLO', 'WORLD', 'TEST', 'TIME', 'GOOD', 'BAD', 'NEW', 'OLD',
      'BIG', 'SMALL', 'HOT', 'COLD', 'LIGHT', 'DARK', 'HAPPY', 'SAD'
    ];
    
    this.enableWords = new Set(fallbackWords);
    this.slangWords = new Set(['BRUH', 'YEAH', 'YEET', 'SELFIE']);
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

// =============================================================================
// WEB ADAPTER CLASS
// =============================================================================

/**
 * Web platform adapter - provides all game dependencies for browser environments
 */
export class WebAdapter {
  private static instance: WebAdapter | null = null;
  private wordData: WebWordData;
  private initialized: boolean = false;

  private constructor() {
    this.wordData = new WebWordData();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebAdapter {
    if (!WebAdapter.instance) {
      WebAdapter.instance = new WebAdapter();
    }
    return WebAdapter.instance;
  }

  /**
   * Initialize the adapter (load dictionaries)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.wordData.loadDictionary();
    this.initialized = true;
  }

  /**
   * Get all game dependencies for the game state manager
   */
  getGameDependencies(): GameStateDependencies {
    const dictionaryDeps = this.getDictionaryDependencies();
    const scoringDeps = this.getScoringDependencies();
    const botDeps = this.getBotDependencies();
    
    return {
      ...dictionaryDeps,
      ...scoringDeps,
      ...botDeps
    };
  }

  /**
   * Get dictionary dependencies
   */
  getDictionaryDependencies(): GameStateDictionaryDependencies {
    return {
      validateWord: (word: string, options?: any) => validateWordWithDependencies(word, this.wordData, options),
      getRandomWordByLength: (length: number) => getRandomWordByLengthWithDependencies(length, this.wordData)
    };
  }

  /**
   * Get scoring dependencies
   */
  getScoringDependencies(): GameStateScoringDependencies {
    return {
      calculateScore,
      getScoreForMove,
      isValidMove
    };
  }

  /**
   * Get bot dependencies
   */
  getBotDependencies(): GameStateBotDependencies {
    const botDeps: BotDependencies = {
      validateWord: (word: string, options?: any) => validateWordWithDependencies(word, this.wordData, options),
      isValidDictionaryWord: (word: string) => isValidDictionaryWordWithDependencies(word, this.wordData),
      getScoreForMove,
      calculateScore
    };

    return {
      generateBotMove: async (word: string, options?: any) => 
        generateBotMoveWithDependencies(word, botDeps, {
          keyLetters: options?.keyLetters || [],
          lockedLetters: options?.lockedLetters || []
        })
    };
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
   * Reload dictionary (useful for development)
   */
  async reloadDictionary(): Promise<void> {
    this.wordData = new WebWordData();
    await this.wordData.loadDictionary();
  }

  /**
   * Get word data for direct access (useful for validation)
   */
  getWordData(): WordDataDependencies {
    return this.wordData;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create and initialize web adapter
 */
export async function createWebAdapter(): Promise<WebAdapter> {
  const adapter = WebAdapter.getInstance();
  await adapter.initialize();
  return adapter;
}

/**
 * Get game dependencies for web environment
 */
export function getWebGameDependencies(): GameStateDependencies {
  const adapter = WebAdapter.getInstance();
  if (!adapter.isInitialized) {
    throw new Error('WebAdapter must be initialized before getting dependencies');
  }
  return adapter.getGameDependencies();
}

/**
 * Validate word using web adapter
 */
export function validateWordWeb(word: string, options?: any): ValidationResult {
  const adapter = WebAdapter.getInstance();
  const deps = adapter.getDictionaryDependencies();
  return deps.validateWord(word, options);
}

/**
 * Score moves using web adapter
 */
export function scoreMovesWeb(fromWord: string, toWord: string, keyLetters?: string[]): number {
  const adapter = WebAdapter.getInstance();
  const deps = adapter.getScoringDependencies();
  return deps.getScoreForMove(fromWord, toWord, keyLetters || []);
} 