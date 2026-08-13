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
  ValidationOptions,
  ScoringResult,
  ScoringOptions,
  BotResult,
  BotOptions,
  BotDependencies
} from '../interfaces';

import { validateWordWithDependencies } from '../dictionary';
import { calculateScoreWithDependencies, getScoreForMoveWithDependencies } from '../scoring';
import { generateBotMoveWithDependencies } from '../bot';

/**
 * Resolve a shared word-list JSON data file under `apps/web/public/data/`.
 * `packages/engine` has no data files of its own - these are authored once
 * for the web app's browser adapter and reused here so the Node.js adapter's
 * word sets don't drift from what the browser loads. Tries a few candidate
 * locations for robustness across invocation directories/legacy layouts.
 */
function readDataFile(dirname: string | null, filename: string): { words?: string[] } {
  const candidates = [
    ...(dirname ? [
      join(dirname, '../../../apps/web/public/data', filename),
      join(dirname, '../data', filename),
      join(dirname, '../../public/data', filename),
      join(dirname, '../../../public/data', filename)
    ] : []),
    join(process.cwd(), 'apps/web/public/data', filename),
    join(process.cwd(), 'public/data', filename)
  ];
  for (const candidatePath of candidates) {
    try {
      return JSON.parse(readFileSync(candidatePath, 'utf-8'));
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Could not find ${filename} in any candidate data directory`);
}

/**
 * Node.js-specific word data implementation
 * Loads dictionary from file system and provides word validation
 */
class NodeWordData implements WordDataDependencies {
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  public properNounWords: Set<string> = new Set();
  public seussCanonicalWords: Set<string> = new Set();
  public seussInventedWords: Set<string> = new Set();
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
      // `import.meta.url` is syntactically supported but not reliably
      // resolvable to a real URL under every consumer's module system (e.g.
      // React Native's Jest/Babel transform), so this is best-effort with
      // process.cwd()-based fallbacks below.
      let __dirname: string | null = null;
      try {
        __dirname = dirname(fileURLToPath(import.meta.url));
      } catch {
        __dirname = null;
      }

      // Try different possible paths for the dictionary file. This file now
      // lives at packages/engine/adapters/, so the canonical location
      // (apps/web/public/enable1.txt) is three levels up + into apps/web.
      // Older/alternate layouts and a process.cwd()-relative fallback are
      // kept for robustness.
      const dictionaryPaths = [
        ...(__dirname ? [
          join(__dirname, '../../../apps/web/public/enable1.txt'),
          join(__dirname, '../enable1.txt'),
          join(__dirname, '../../public/enable1.txt'),
          join(__dirname, '../../../public/enable1.txt')
        ] : []),
        join(process.cwd(), 'apps/web/public/enable1.txt'),
        join(process.cwd(), 'public/enable1.txt')
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

      // Load slang words from shared data file
      try {
        const slangData = readDataFile(__dirname, 'slang-words.json');
        this.slangWords = new Set(slangData.words || []);
        console.log(`Slang words loaded: ${this.slangWords.size} words`);
      } catch (slangError) {
        console.warn('Error loading slang words:', slangError);
        this.slangWords = new Set();
      }

      // Load profanity words from shared data file
      try {
        const profanityData = readDataFile(__dirname, 'profanity-words.json');
        this.profanityWords = new Set(profanityData.words || []);
        console.log(`Profanity words loaded: ${this.profanityWords.size} words`);
      } catch (profanityError) {
        console.warn('Error loading profanity words:', profanityError);
        this.profanityWords = new Set();
      }

      // Load common proper nouns (months, days, common names) from shared data file
      try {
        const properNounData = readDataFile(__dirname, 'common-proper-nouns.json');
        this.properNounWords = new Set(properNounData.words || []);
        console.log(`Common proper nouns loaded: ${this.properNounWords.size} words`);
      } catch (properNounError) {
        console.warn('Error loading common proper nouns:', properNounError);
        this.properNounWords = new Set();
      }

      // Load canonical Dr. Seuss words from shared data file
      try {
        const seussCanonicalData = readDataFile(__dirname, 'seuss-words-canonical.json');
        this.seussCanonicalWords = new Set(seussCanonicalData.words || []);
        console.log(`Seuss canonical words loaded: ${this.seussCanonicalWords.size} words`);
      } catch (seussCanonicalError) {
        console.warn('Error loading Seuss canonical words:', seussCanonicalError);
        this.seussCanonicalWords = new Set();
      }

      // Load invented Dr. Seuss-style words from shared data file
      try {
        const seussInventedData = readDataFile(__dirname, 'seuss-words-invented.json');
        this.seussInventedWords = new Set(seussInventedData.words || []);
        console.log(`Seuss invented words loaded: ${this.seussInventedWords.size} words`);
      } catch (seussInventedError) {
        console.warn('Error loading Seuss invented words:', seussInventedError);
        this.seussInventedWords = new Set();
      }

      this.loaded = true;
      console.log(`✅ Dictionary loaded: ${this.enableWords.size} words, ${this.slangWords.size} slang words, ${this.profanityWords.size} profanity words, ${this.seussCanonicalWords.size} Seuss canonical words`);

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
    const nonProfaneWords = words.filter(word => !this.profanityWords.has(word));
    const pool = nonProfaneWords.length > 0 ? nonProfaneWords : words;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  public hasWord(word: string): boolean {
    const upperWord = word.toUpperCase();
    return this.enableWords.has(upperWord) || this.slangWords.has(upperWord) || this.properNounWords.has(upperWord);
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
  validateWord: (word: string, options?: ValidationOptions): ValidationResult => {
    return validateWordWithDependencies(word, nodeWordData, options);
  },

  getRandomWordByLength: (length: number): string | null => {
    return nodeWordData.getRandomWordByLength(length);
  },

  getRandomSeussCanonicalWord: (length?: number): string | null => {
    let words = Array.from(nodeWordData.seussCanonicalWords);
    if (length !== undefined) {
      words = words.filter(w => w.length === length);
    }
    if (words.length === 0) return null;
    return words[Math.floor(Math.random() * words.length)];
  }
};

/**
 * Node.js scoring dependencies implementation
 * Uses direct imports from scoring module since it's platform-agnostic
 */
const nodeScoringDependencies: GameStateScoringDependencies = {
  calculateScore: (fromWord: string, toWord: string, options?: ScoringOptions): ScoringResult => {
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
  generateBotMove: async (word: string, options?: BotOptions): Promise<BotResult> => {
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
      calculateScore: nodeScoringDependencies.calculateScore,
      
      // Bot-specific profanity checking
      isProfanity: (word: string): boolean => {
        return nodeWordData.profanityWords.has(word.toUpperCase());
      },

      // Bot-specific Seuss dictionary checking (used by grinch-bot strategy)
      isSeussWord: (word: string): boolean => {
        const w = word.toUpperCase();
        return nodeWordData.seussCanonicalWords.has(w) || nodeWordData.seussInventedWords.has(w);
      },

      isSeussCanonicalWord: (word: string): boolean => {
        return nodeWordData.seussCanonicalWords.has(word.toUpperCase());
      }
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
export function validateWordNode(word: string, options?: ValidationOptions): ValidationResult {
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