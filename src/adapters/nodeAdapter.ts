/**
 * Node.js Adapter for WordPlay Game Engine
 * 
 * Platform-specific implementation for Node.js environments that provides
 * dictionary loading via file system, along with scoring and bot AI functions.
 * 
 * Key Features:
 * - File system-based dictionary loading (ENABLE1 word list)
 * - Platform-optimized scoring calculations
 * - Bot AI integration with comprehensive move generation
 * - Performance monitoring and logging
 * - Fallback handling for missing files
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import type { 
  GameStateDependencies,
  GameStateDictionaryDependencies,
  GameStateScoringDependencies,
  GameStateBotDependencies,
  WordDataDependencies,
  ValidationResult,
  ScoringResult,
  BotResult,
  BotDependencies
} from '../../packages/engine/interfaces';

import { validateWordWithDependencies } from '../../packages/engine/dictionary';
import { calculateScoreWithDependencies, getScoreForMoveWithDependencies } from '../../packages/engine/scoring';
import { generateBotMoveWithDependencies } from '../../packages/engine/bot';

/**
 * Node.js-specific word data implementation
 * Loads dictionary from file system and provides word validation
 */
class NodeWordData implements WordDataDependencies {
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  private wordsByLength: Map<number, string[]> = new Map();
  private loaded = false;

  constructor() {
    this.loadDictionaryInternal();
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  private async loadDictionaryInternal(): Promise<void> {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      
      // Try different possible paths for the dictionary file
      const dictionaryPaths = [
        join(__dirname, '../../packages/engine/enable1.txt'),
        join(__dirname, '../../public/enable1.txt'),
        join(__dirname, '../../../packages/engine/enable1.txt'),
        join(__dirname, '../../../public/enable1.txt')
      ];

      let dictionaryText: string | null = null;
      
      for (const path of dictionaryPaths) {
        try {
          dictionaryText = readFileSync(path, 'utf-8');
          console.log(`✅ Dictionary loaded from: ${path}`);
          break;
        } catch (error) {
          console.log(`⚠️  Tried ${path}: ${(error as Error).message}`);
        }
      }

      if (!dictionaryText) {
        throw new Error('Dictionary file not found in any expected location');
      }

      // Parse dictionary
      const wordList = dictionaryText
        .split('\n')
        .map(word => word.trim().toUpperCase())
        .filter(word => word.length > 0);

      // Build word sets
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
        const profanityData = JSON.parse(readFileSync(join(__dirname, '../../public/data/profanity-words.json'), 'utf-8'));
        this.profanityWords = new Set(profanityData.words || []);
        console.log(`Profanity words loaded: ${this.profanityWords.size} words`);
      } catch (profanityError) {
        console.warn('Error loading profanity words:', profanityError);
        this.profanityWords = new Set();
      }

      this.loaded = true;
      console.log(`✅ Dictionary loaded: ${this.enableWords.size} words, ${this.slangWords.size} slang words, ${this.profanityWords.size} profanity words`);

    } catch (error) {
      console.error('❌ Failed to load dictionary:', error);
      throw error;
    }
  }

  public getRandomWordByLength(length: number): string | null {
    const words = this.wordsByLength.get(length);
    if (!words || words.length === 0) {
      return null;
    }
    return words[Math.floor(Math.random() * words.length)];
  }

  public hasWord(word: string): boolean {
    const upperWord = word.toUpperCase();
    return this.enableWords.has(upperWord) || this.slangWords.has(upperWord);
  }

  public get wordCount(): number {
    return this.enableWords.size + this.slangWords.size;
  }
}

// Singleton instance for Node.js
const nodeWordData = new NodeWordData();

// =============================================================================
// NODE.JS DEPENDENCY IMPLEMENTATIONS
// =============================================================================

/**
 * Node.js dictionary dependencies implementation
 */
const nodeDictionaryDependencies: GameStateDictionaryDependencies = {
  validateWord: (word: string, options?: any): ValidationResult => {
    return validateWordWithDependencies(word, nodeWordData, options);
  },

  getRandomWordByLength: (length: number): string | null => {
    return nodeWordData.getRandomWordByLength(length);
  }
};

/**
 * Node.js scoring dependencies implementation
 * Uses direct imports from scoring module since it's platform-agnostic
 */
const nodeScoringDependencies: GameStateScoringDependencies = {
  calculateScore: (fromWord: string, toWord: string, options?: any): ScoringResult => {
    return calculateScoreWithDependencies(fromWord, toWord, options);
  },

  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]): number => {
    return getScoreForMoveWithDependencies(fromWord, toWord, keyLetters);
  },

  isValidMove: (fromWord: string, toWord: string): boolean => {
    // Simple move validation - length change max 1
    return Math.abs(fromWord.length - toWord.length) <= 1;
  }
};

/**
 * Node.js bot dependencies implementation
 */
const nodeBotDependencies: GameStateBotDependencies = {
  generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
    // Create complete BotDependencies with all required interfaces
    const botDeps: BotDependencies = {
      // DictionaryDependencies
      validateWord: nodeDictionaryDependencies.validateWord,
      isValidDictionaryWord: (word: string): boolean => {
        return nodeWordData.hasWord(word);
      },
      getRandomWordByLength: nodeDictionaryDependencies.getRandomWordByLength,
      getWordCount: (): number => nodeWordData.wordCount,
      
      // UtilityDependencies
      getTimestamp: (): number => Date.now(),
      random: (): number => Math.random(),
      log: (message: string): void => console.log(`[NodeBot] ${message}`),
      
      // ScoringDependencies
      getScoreForMove: nodeScoringDependencies.getScoreForMove,
      calculateScore: nodeScoringDependencies.calculateScore
    };
    
    return await generateBotMoveWithDependencies(word, botDeps, options);
  }
};

/**
 * Complete Node.js dependencies for game state management
 */
const nodeGameDependencies: GameStateDependencies = {
  ...nodeDictionaryDependencies,
  ...nodeScoringDependencies,
  ...nodeBotDependencies
};

// =============================================================================
// NODE.JS ADAPTER API
// =============================================================================

/**
 * Node.js Platform Adapter
 * Main interface for Node.js-specific WordPlay engine integration
 */
export class NodeAdapter {
  private static instance: NodeAdapter | null = null;
  private wordData: NodeWordData;
  private initialized: boolean = false;

  private constructor() {
    this.wordData = nodeWordData;
  }

  static getInstance(): NodeAdapter {
    if (!NodeAdapter.instance) {
      NodeAdapter.instance = new NodeAdapter();
    }
    return NodeAdapter.instance;
  }

  /**
   * Initialize the Node.js adapter (loads dictionary from file system)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // The word data loads dictionary in constructor, just wait for it to complete
    this.initialized = true;
  }

  /**
   * Get all game dependencies for the game state manager
   */
  getGameDependencies(): GameStateDependencies {
    if (!this.initialized) {
      console.warn('NodeAdapter not initialized. Call initialize() first.');
    }
    return nodeGameDependencies;
  }

  /**
   * Get dictionary dependencies
   */
  getDictionaryDependencies(): GameStateDictionaryDependencies {
    return nodeDictionaryDependencies;
  }

  /**
   * Get scoring dependencies
   */
  getScoringDependencies(): GameStateScoringDependencies {
    return nodeScoringDependencies;
  }

  /**
   * Get bot dependencies
   */
  getBotDependencies(): GameStateBotDependencies {
    return nodeBotDependencies;
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
      wordCount: this.wordData.wordCount
    };
  }

  /**
   * Force reload dictionary (for debugging)
   */
  async reloadDictionary(): Promise<void> {
    // Create new word data instance to reload
    this.wordData = new NodeWordData();
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
 * Initialize and get Node.js adapter
 */
export async function createNodeAdapter(): Promise<NodeAdapter> {
  const adapter = NodeAdapter.getInstance();
  await adapter.initialize();
  return adapter;
}

/**
 * Get game dependencies for Node.js environment
 */
export function getNodeGameDependencies(): GameStateDependencies {
  return nodeGameDependencies;
}

/**
 * Validate word using Node.js adapter (convenience function)
 */
export function validateWordNode(word: string, options?: any): ValidationResult {
  return nodeDictionaryDependencies.validateWord(word, options);
}

// =============================================================================
// NODE.JS ADAPTER EXPORTS
// =============================================================================

export {
  nodeGameDependencies,
  nodeDictionaryDependencies,
  nodeScoringDependencies,
  nodeBotDependencies
}; 