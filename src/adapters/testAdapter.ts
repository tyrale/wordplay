/**
 * Test Platform Adapter
 * 
 * This adapter provides minimal, predictable dependencies for unit testing.
 * It uses controlled word lists and deterministic behavior to ensure
 * consistent test results across different environments.
 * 
 * ARCHITECTURE: This is a test adapter that implements the dependency
 * interfaces with minimal, controlled implementations suitable for testing.
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

import type {
  BotDependencies
} from '../../packages/engine/bot';

// Import the dependency-injected functions from engine
import { 
  validateWordWithDependencies,
  isValidDictionaryWordWithDependencies,
  getRandomWordByLengthWithDependencies
} from '../../packages/engine/dictionary';

import {
  generateBotMoveWithDependencies
} from '../../packages/engine/bot';

import {
  calculateScore,
  getScoreForMove,
  isValidMove
} from '../../packages/engine/scoring';

// =============================================================================
// TEST DICTIONARY SERVICE
// =============================================================================

/**
 * Test-specific word data implementation
 * Uses minimal, controlled word sets for predictable testing
 */
class TestWordData implements WordDataDependencies {
  // WordDataDependencies interface implementation
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  
  private wordsByLength: Map<number, string[]> = new Map();
  private isLoaded: boolean = false;

  constructor() {
    this.initializeTestWords();
  }

  private initializeTestWords(): void {
    // Minimal test dictionary for predictable testing
    const testWords = [
      // 3-letter words
      'CAT', 'DOG', 'BAT', 'HAT', 'COT', 'HOT', 'COW', 'HOW', 'BOW', 'ROW',
      'RUN', 'SUN', 'FUN', 'GUN', 'BUN', 'NUN', 'PUN', 'TUN', 'WON', 'SON',
      'TWO', 'TOO', 'TOP', 'TAP', 'TIP', 'TEN', 'TEA', 'SEA', 'BEE', 'SEE',
      
      // 4-letter words
      'CATS', 'DOGS', 'BATS', 'HATS', 'COTS', 'HOTS', 'COWS', 'HOWS', 'BOWS', 'ROWS',
      'RUNS', 'SUNS', 'FUNS', 'GUNS', 'BUNS', 'NUNS', 'PUNS', 'TUNS', 'WONS', 'SONS',
      'WORD', 'WORK', 'WALK', 'TALK', 'TAKE', 'MAKE', 'CAKE', 'LAKE', 'WAKE', 'BAKE',
      'COAT', 'BOAT', 'GOAT', 'BEAT', 'HEAT', 'NEAT', 'SEAT', 'MEAT', 'FEAT', 'PEAT',
      'TOWS', 'TOWN', 'GOWN', 'DOWN', 'DOWS', 'COWS', 'BOWS', 'ROWS', 'SOWS', 'LOWS',
      'SOWN', 'SEWN', 'DAWN', 'LAWN', 'PAWN', 'YAWN', 'FAWN', 'DRAWN', 'BRAWN', 'SPAWN',
      
      // 5-letter words  
      'WORDS', 'WORKS', 'WALKS', 'TALKS', 'TAKES', 'MAKES', 'CAKES', 'LAKES', 'WAKES', 'BAKES',
      'COATS', 'BOATS', 'GOATS', 'BEATS', 'HEATS', 'NEATS', 'SEATS', 'MEATS', 'FEATS', 'PEATS',
      'TOWNS', 'GOWNS', 'DOWNS', 'BOWLS', 'FOWLS', 'HOWLS', 'JOWLS', 'COWLS', 'YOWLS', 'POWLS',
      'SOWN', 'SEWN', 'DAWN', 'LAWN', 'PAWN', 'YAWN', 'FAWN', 'DRAWN', 'BRAWN', 'SPAWN',
      'HOUSE', 'MOUSE', 'LOUSE', 'ROUSE', 'DOUSE', 'SOUSE', 'TOUSE', 'COUSE', 'BOUSE', 'NOUSE',
      'BROWN', 'CROWN', 'DROWN', 'FROWN', 'GROWN', 'SHOWN', 'THROWN', 'CLOWN', 'BLOWN', 'FLOWN',
      
      // 6-letter words
      'HOUSES', 'MOUSES', 'LOUSES', 'ROUSES', 'DOUSES', 'SOUSES', 'TOUSES', 'COUSES', 'BOUSES', 'NOUSES',
      'BROWNS', 'CROWNS', 'DROWNS', 'FROWNS', 'GROWNS', 'SHOWNS', 'CLOWNS', 'BLOWNS', 'FLOWNS', 'THROWNS'
    ];

    this.enableWords = new Set(testWords);

    // Build words-by-length map
    this.wordsByLength.clear();
    for (const word of testWords) {
      const length = word.length;
      if (!this.wordsByLength.has(length)) {
        this.wordsByLength.set(length, []);
      }
      this.wordsByLength.get(length)!.push(word);
    }

    // Initialize test slang words
    this.slangWords = new Set([
      'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG'
    ]);

    // Initialize test profanity words
    this.profanityWords = new Set([
      'DAMN', 'HELL', 'CRAP', 'PISS'
    ]);

    this.isLoaded = true;
  }

  /**
   * Check if a word exists in the dictionary
   */
  hasWord(word: string): boolean {
    return this.enableWords.has(word.toUpperCase());
  }

  /**
   * Get a predictable "random" word of specified length for testing
   * Always returns the first word of the specified length for predictability
   */
  getRandomWordByLength(length: number): string | null {
    const wordsOfLength = this.wordsByLength.get(length);
    if (!wordsOfLength || wordsOfLength.length === 0) {
      return null;
    }
    
    // Return first word for predictable testing
    return wordsOfLength[0];
  }

  /**
   * Get a specific word by index for testing
   */
  getWordByIndex(length: number, index: number): string | null {
    const wordsOfLength = this.wordsByLength.get(length);
    if (!wordsOfLength || wordsOfLength.length === 0 || index >= wordsOfLength.length) {
      return null;
    }
    
    return wordsOfLength[index];
  }

  /**
   * Get all words of a specific length for testing
   */
  getWordsOfLength(length: number): string[] {
    return this.wordsByLength.get(length) || [];
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

  /**
   * Add a word to the test dictionary (for dynamic testing)
   */
  addWord(word: string): void {
    const upperWord = word.toUpperCase();
    this.enableWords.add(upperWord);
    
    const length = upperWord.length;
    if (!this.wordsByLength.has(length)) {
      this.wordsByLength.set(length, []);
    }
    this.wordsByLength.get(length)!.push(upperWord);
  }

  /**
   * Remove a word from the test dictionary (for dynamic testing)
   */
  removeWord(word: string): void {
    const upperWord = word.toUpperCase();
    this.enableWords.delete(upperWord);
    
    const length = upperWord.length;
    const wordsOfLength = this.wordsByLength.get(length);
    if (wordsOfLength) {
      const index = wordsOfLength.indexOf(upperWord);
      if (index > -1) {
        wordsOfLength.splice(index, 1);
      }
    }
  }

  /**
   * Reset to default test words
   */
  reset(): void {
    this.enableWords.clear();
    this.wordsByLength.clear();
    this.slangWords.clear();
    this.profanityWords.clear();
    this.initializeTestWords();
  }
}

// Singleton test word data
const testWordData = new TestWordData();

// =============================================================================
// TEST DEPENDENCY IMPLEMENTATIONS
// =============================================================================

/**
 * Test dictionary dependencies implementation
 */
const testDictionaryDependencies: GameStateDictionaryDependencies = {
  validateWord: (word: string, options?: any): ValidationResult => {
    return validateWordWithDependencies(word, testWordData, options);
  },

  getRandomWordByLength: (length: number): string | null => {
    return getRandomWordByLengthWithDependencies(length, testWordData);
  }
};

/**
 * Test scoring dependencies implementation
 * Uses direct imports from scoring module since it's platform-agnostic
 */
const testScoringDependencies: GameStateScoringDependencies = {
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
 * Test bot dependencies implementation
 */
const testBotDependencies: GameStateBotDependencies = {
  generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
    // Create combined dependencies for bot
    const botDeps: BotDependencies = {
      ...testDictionaryDependencies,
      ...testScoringDependencies,
      isValidDictionaryWord: (word: string): boolean => {
        return isValidDictionaryWordWithDependencies(word, testWordData);
      }
    };
    
    return generateBotMoveWithDependencies(word, botDeps, options);
  }
};

/**
 * Complete test dependencies for game state management
 */
const testGameDependencies: GameStateDependencies = {
  ...testDictionaryDependencies,
  ...testScoringDependencies,
  ...testBotDependencies
};

// =============================================================================
// TEST ADAPTER API
// =============================================================================

/**
 * Test Platform Adapter
 * Main interface for test-specific WordPlay engine integration
 */
export class TestAdapter {
  private static instance: TestAdapter | null = null;
  private wordData: TestWordData;

  private constructor() {
    this.wordData = testWordData;
  }

  /**
   * Get the singleton test adapter instance
   */
  static getInstance(): TestAdapter {
    if (!TestAdapter.instance) {
      TestAdapter.instance = new TestAdapter();
    }
    return TestAdapter.instance;
  }

  /**
   * Initialize the test adapter (synchronous for testing)
   */
  initialize(): void {
    // Test adapter is always initialized
    // This method exists for API consistency
  }

  /**
   * Get game state dependencies for test environment
   */
  getGameDependencies(): GameStateDependencies {
    return testGameDependencies;
  }

  /**
   * Get dictionary dependencies only
   */
  getDictionaryDependencies(): GameStateDictionaryDependencies {
    return testDictionaryDependencies;
  }

  /**
   * Get scoring dependencies only
   */
  getScoringDependencies(): GameStateScoringDependencies {
    return testScoringDependencies;
  }

  /**
   * Get bot dependencies only
   */
  getBotDependencies(): GameStateBotDependencies {
    return testBotDependencies;
  }

  /**
   * Get direct access to test word data for test manipulation
   */
  getWordData(): TestWordData {
    return this.wordData;
  }

  /**
   * Get dictionary status for testing
   */
  getDictionaryStatus(): { loaded: boolean; wordCount: number } {
    return {
      loaded: this.wordData.loaded,
      wordCount: this.wordData.wordCount
    };
  }

  /**
   * Reset test data to defaults
   */
  reset(): void {
    this.wordData.reset();
  }

  /**
   * Add a word to test dictionary
   */
  addWord(word: string): void {
    this.wordData.addWord(word);
  }

  /**
   * Remove a word from test dictionary
   */
  removeWord(word: string): void {
    this.wordData.removeWord(word);
  }

  /**
   * Get words of specific length for test assertions
   */
  getWordsOfLength(length: number): string[] {
    return this.wordData.getWordsOfLength(length);
  }

  /**
   * Check if adapter is initialized (always true for tests)
   */
  get isInitialized(): boolean {
    return true;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get test adapter (no async initialization needed)
 */
export function createTestAdapter(): TestAdapter {
  const adapter = TestAdapter.getInstance();
  adapter.initialize();
  return adapter;
}

/**
 * Quick access to test game dependencies
 */
export function getTestGameDependencies(): GameStateDependencies {
  return TestAdapter.getInstance().getGameDependencies();
}

/**
 * Quick validation using test dependencies
 */
export function validateWordTest(word: string, options?: any): ValidationResult {
  return testDictionaryDependencies.validateWord(word, options);
}

/**
 * Quick scoring using test dependencies
 */
export function scoreMoveTest(fromWord: string, toWord: string, keyLetters?: string[]): number {
  return testScoringDependencies.getScoreForMove(fromWord, toWord, keyLetters);
}

/**
 * Create a test game dependencies with custom word list
 */
export function createCustomTestDependencies(words: string[]): GameStateDependencies {
  const customWordData = new TestWordData();
  customWordData.reset();
  
  // Add custom words
  for (const word of words) {
    customWordData.addWord(word);
  }

  const customDictionaryDependencies: GameStateDictionaryDependencies = {
    validateWord: (word: string, options?: any): ValidationResult => {
      return validateWordWithDependencies(word, customWordData, options);
    },

    getRandomWordByLength: (length: number): string | null => {
      return getRandomWordByLengthWithDependencies(length, customWordData);
    }
  };

  const customBotDependencies: GameStateBotDependencies = {
    generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
      const botDeps: BotDependencies = {
        ...customDictionaryDependencies,
        ...testScoringDependencies,
        isValidDictionaryWord: (word: string): boolean => {
          return isValidDictionaryWordWithDependencies(word, customWordData);
        }
      };
      
      return generateBotMoveWithDependencies(word, botDeps, options);
    }
  };

  return {
    ...customDictionaryDependencies,
    ...testScoringDependencies,
    ...customBotDependencies
  };
}

// =============================================================================
// TEST ADAPTER EXPORTS
// =============================================================================

export {
  testGameDependencies,
  testDictionaryDependencies,
  testScoringDependencies,
  testBotDependencies,
  TestWordData
};

export default TestAdapter; 