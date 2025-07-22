/**
 * Web Adapter for WordPlay Game Engine
 * 
 * Platform-specific implementation for web environments that provides
 * dictionary loading via HTTP requests, along with scoring and bot AI functions.
 */

import type {
  GameStateDependencies,
  GameStateDictionaryDependencies,
  GameStateScoringDependencies,
  GameStateBotDependencies,
  WordDataDependencies,
  ValidationResult,
  ScoringResult,
  BotResult
} from '../../packages/engine/interfaces';

import { validateWordWithDependencies, isValidDictionaryWordWithDependencies } from '../../packages/engine/dictionary';
import { calculateScore, getScoreForMove, isValidMove } from '../../packages/engine/scoring';
import { generateBotMoveWithDependencies } from '../../packages/engine/bot';

/**
 * Web-specific word data implementation
 * Loads dictionary via HTTP and provides word validation
 */
class WebWordData implements WordDataDependencies {
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
    try {
      // Load dictionary file via HTTP request
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

      // Initialize slang words
      this.slangWords = new Set([
        'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG',
        'VLOG', 'WIFI', 'UBER', 'GOOGLE', 'TWEET', 'UNFRIEND', 'HASHTAG',
        'PHOTOBOMB', 'MANSPLAIN', 'GHOSTING', 'CATFISH', 'TROLL', 'MEME',
        'VIRAL', 'CLICKBAIT', 'SPAM', 'PHISHING', 'MALWARE', 'AVATAR',
        'NOOB', 'PWNED', 'EPIC', 'FAIL', 'WIN', 'OWNED', 'LEET', 'HAXOR'
      ]);

      // Load profanity words from shared data file
      try {
        const profanityResponse = await fetch('/data/profanity-words.json');
        if (profanityResponse.ok) {
          const profanityData = await profanityResponse.json();
          this.profanityWords = new Set(profanityData.words || []);
          console.log(`Profanity words loaded: ${this.profanityWords.size} words`);
        } else {
          console.warn('Failed to load profanity words, using empty set');
          this.profanityWords = new Set();
        }
      } catch (profanityError) {
        console.warn('Error loading profanity words:', profanityError);
        this.profanityWords = new Set();
      }

      this.loaded = true;
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
    
    // Use empty profanity set for fallback
    this.profanityWords = new Set();
    
    this.loaded = true;
  }
}

// =============================================================================
// WEB ADAPTER CLASS
// =============================================================================

// Singleton instance for web word data
let webWordData: WebWordData | null = null;

function getWebWordData(): WebWordData {
  if (!webWordData) {
    console.log('Creating new WebWordData instance'); // Log instance creation
    webWordData = new WebWordData();
  }
  return webWordData;
}

// Centralize dependency creation
const webDictionaryDependencies: GameStateDictionaryDependencies = {
  validateWord: (word: string, options?: any): ValidationResult => {
    return validateWordWithDependencies(word, getWebWordData(), options);
  },

  getRandomWordByLength: (length: number): string | null => {
    return getWebWordData().getRandomWordByLength(length);
  }
};

const webScoringDependencies: GameStateScoringDependencies = {
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

const webBotDependencies: GameStateBotDependencies = {
  generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
    const botDeps: GameStateBotDependencies = {
      ...webDictionaryDependencies,
      ...webScoringDependencies,
      isValidDictionaryWord: (word: string): boolean => {
        return isValidDictionaryWordWithDependencies(word, getWebWordData());
      }
    };
    return generateBotMoveWithDependencies(word, botDeps, options);
  }
};

const webGameDependencies: GameStateDependencies = {
  ...webDictionaryDependencies,
  ...webScoringDependencies,
  ...webBotDependencies
};

/**
 * Web platform adapter - provides all game dependencies for browser environments
 */
export class WebAdapter {
  private static instance: WebAdapter | null = null;
  private wordData: WebWordData;
  private initialized: boolean = false;

  private constructor() {
    this.wordData = getWebWordData();
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
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  /**
   * Get all game dependencies for the game state manager
   */
  getGameDependencies(): GameStateDependencies {
    if (!this.initialized) {
      console.warn('WebAdapter not initialized. Call initialize() first.');
    }
    return webGameDependencies;
  }

  /**
   * Get dictionary dependencies
   */
  getDictionaryDependencies(): GameStateDictionaryDependencies {
    return webDictionaryDependencies;
  }

  /**
   * Get scoring dependencies
   */
  getScoringDependencies(): GameStateScoringDependencies {
    return webScoringDependencies;
  }

  /**
   * Get bot dependencies
   */
  getBotDependencies(): GameStateBotDependencies {
    return webBotDependencies;
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
      loaded: this.wordData.isLoaded(),
      wordCount: this.wordData.enableWords.size
    };
  }

  /**
   * Reload dictionary (useful for development)
   */
  async reloadDictionary(): Promise<void> {
    this.wordData = getWebWordData();
    this.initialized = false;
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