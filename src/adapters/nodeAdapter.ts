/**
 * Node.js Platform Adapter
 * 
 * This adapter provides all necessary dependencies for running the WordPlay engine
 * in Node.js environments. It handles file system dictionary loading, direct
 * module access, and Node.js-specific optimizations.
 * 
 * ARCHITECTURE: This is a platform adapter that implements the dependency
 * interfaces defined in the engine modules. It bridges Node.js-specific
 * functionality with the platform-agnostic engine.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
// NODE.JS DICTIONARY SERVICE
// =============================================================================

/**
 * Node.js-specific word data implementation
 * Loads dictionary from file system and provides fast lookup
 */
class NodeWordData implements WordDataDependencies {
  // WordDataDependencies interface implementation
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  
  // Additional Node.js-specific features
  private wordsByLength: Map<number, string[]> = new Map();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Load dictionaries from file system
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
      // Get current module directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      // Look for dictionary files in various locations
      const possiblePaths = [
        path.join(__dirname, '../../public/data/enable1.txt'),
        path.join(__dirname, '../../../public/data/enable1.txt'),
        path.join(process.cwd(), 'public/data/enable1.txt'),
        path.join(process.cwd(), 'data/enable1.txt')
      ];

      let dictionaryPath: string | null = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          dictionaryPath = possiblePath;
          break;
        }
      }

      if (!dictionaryPath) {
        throw new Error('Dictionary file not found in any expected location');
      }

      // Load ENABLE dictionary
      const enableContent = fs.readFileSync(dictionaryPath, 'utf-8');
      const enableWords = enableContent
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

      // Initialize slang words
      this.slangWords = new Set([
        'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG',
        'VLOG', 'WIFI', 'UBER', 'GOOGLE', 'TWEET', 'UNFRIEND', 'HASHTAG',
        'PHOTOBOMB', 'MANSPLAIN', 'GHOSTING', 'CATFISH', 'TROLL', 'MEME',
        'VIRAL', 'CLICKBAIT', 'SPAM', 'PHISHING', 'MALWARE', 'AVATAR',
        'NOOB', 'PWNED', 'EPIC', 'FAIL', 'WIN', 'OWNED', 'LEET', 'HAXOR'
      ]);

      // Initialize profanity words
      this.profanityWords = new Set([
        'DAMN', 'HELL', 'CRAP', 'PISS', 'SHIT', 'FUCK', 'BITCH', 'ASSHOLE',
        'BASTARD', 'WHORE', 'SLUT', 'FART', 'POOP', 'BUTT', 'ASS'
      ]);

      this.isLoaded = true;
      console.log(`✅ Node.js dictionary loaded: ${this.enableWords.size} words`);
      
    } catch (error) {
      console.warn('Failed to load full dictionary, using fallback:', error);
      
      // Fallback to minimal word set
      const fallbackWords = [
        'CAT', 'DOG', 'WORD', 'GAME', 'PLAY', 'MOVE', 'TURN', 'SCORE',
        'CATS', 'DOGS', 'WORDS', 'GAMES', 'PLAYS', 'MOVES', 'TURNS', 'SCORES',
        'HELLO', 'WORLD', 'QUICK', 'BROWN', 'HOUSE', 'WATER', 'LIGHT', 'SOUND'
      ];
      
      this.enableWords = new Set(fallbackWords);
      this.wordsByLength.clear();
      
      for (const word of fallbackWords) {
        const length = word.length;
        if (!this.wordsByLength.has(length)) {
          this.wordsByLength.set(length, []);
        }
        this.wordsByLength.get(length)!.push(word);
      }
      
      // Initialize slang and profanity sets for fallback
      this.slangWords = new Set(['BRUH', 'YEAH']);
      this.profanityWords = new Set(['DAMN', 'HELL']);
      
      this.isLoaded = true;
      console.log(`⚠️ Using fallback dictionary: ${this.enableWords.size} words`);
    }
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
    return getRandomWordByLengthWithDependencies(length, nodeWordData);
  }
};

/**
 * Node.js scoring dependencies implementation
 * Uses direct imports from scoring module since it's platform-agnostic
 */
const nodeScoringDependencies: GameStateScoringDependencies = {
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
 * Node.js bot dependencies implementation
 */
const nodeBotDependencies: GameStateBotDependencies = {
  generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
    // Create combined dependencies for bot
    const botDeps: BotDependencies = {
      ...nodeDictionaryDependencies,
      ...nodeScoringDependencies,
      isValidDictionaryWord: (word: string): boolean => {
        return isValidDictionaryWordWithDependencies(word, nodeWordData);
      }
    };
    
    return generateBotMoveWithDependencies(word, botDeps, options);
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

  /**
   * Get the singleton Node.js adapter instance
   */
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

    await this.wordData.loadDictionary();
    this.initialized = true;
  }

  /**
   * Get game state dependencies for Node.js environment
   */
  getGameDependencies(): GameStateDependencies {
    if (!this.initialized) {
      console.warn('NodeAdapter not initialized. Call initialize() first.');
    }
    return nodeGameDependencies;
  }

  /**
   * Get dictionary dependencies only
   */
  getDictionaryDependencies(): GameStateDictionaryDependencies {
    return nodeDictionaryDependencies;
  }

  /**
   * Get scoring dependencies only
   */
  getScoringDependencies(): GameStateScoringDependencies {
    return nodeScoringDependencies;
  }

  /**
   * Get bot dependencies only
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
 * Initialize and get Node.js adapter
 */
export async function createNodeAdapter(): Promise<NodeAdapter> {
  const adapter = NodeAdapter.getInstance();
  await adapter.initialize();
  return adapter;
}

/**
 * Quick access to Node.js game dependencies (requires initialization)
 */
export function getNodeGameDependencies(): GameStateDependencies {
  return NodeAdapter.getInstance().getGameDependencies();
}

/**
 * Quick validation using Node.js dependencies
 */
export function validateWordNode(word: string, options?: any): ValidationResult {
  return nodeDictionaryDependencies.validateWord(word, options);
}

/**
 * Quick scoring using Node.js dependencies
 */
export function scoreMovesNode(fromWord: string, toWord: string, keyLetters?: string[]): number {
  return nodeScoringDependencies.getScoreForMove(fromWord, toWord, keyLetters);
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

export default NodeAdapter; 