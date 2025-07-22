/**
 * Test Adapter for WordPlay Game Engine
 * 
 * Platform-specific implementation for testing environments that provides
 * predictable word data and deterministic behavior for test scenarios.
 */

import type { WordDataDependencies } from '../../packages/engine/dictionary';

// Import centralized profanity management
import { getComprehensiveProfanityWords, getBasicProfanityWords } from '../../packages/engine/profanity';

/**
 * Test-specific word data implementation
 * Provides controllable word sets for testing
 */
class TestWordData implements WordDataDependencies {
  public enableWords: Set<string> = new Set();
  public slangWords: Set<string> = new Set();
  public profanityWords: Set<string> = new Set();
  private wordsByLength: Map<number, string[]> = new Map();
  private isLoaded = true; // Always loaded for tests

  constructor() {
    this.initializeTestWords();
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

  private initializeTestWords(): void {
    // Predictable test words for deterministic testing
    const testWords = [
      // 3-letter words
      'CAT', 'DOG', 'BAT', 'RAT', 'HAT', 'MAT', 'SAT', 'FAT',
      'COW', 'HOW', 'NOW', 'WOW', 'BOW', 'ROW', 'TOW', 'LOW',
      
      // 4-letter words  
      'CATS', 'DOGS', 'BATS', 'RATS', 'HATS', 'MATS', 'FAST', 'LAST',
      'GAME', 'NAME', 'SAME', 'CAME', 'FAME', 'TAME', 'LAME', 'DAME',
      'PLAY', 'CLAY', 'STAY', 'SLAY', 'GRAY', 'PRAY', 'FRAY', 'TRAY',
      'TEST', 'BEST', 'REST', 'NEST', 'WEST', 'PEST', 'VEST', 'GUEST',
      'WORD', 'CORD', 'LORD', 'FORD', 'WARD', 'HARD', 'CARD', 'YARD',
      'HELLO', 'WORLD', 'HOUSE', 'MOUSE', 'HORSE', 'NURSE', 'PURSE', 'CURSE',
      
      // 5-letter words
      'GAMES', 'NAMES', 'TESTS', 'WORDS', 'PLAYS', 'HELLO', 'WORLD',
      'HOUSE', 'MOUSE', 'HORSE', 'HEART', 'START', 'SMART', 'CHART', 
      
      // 6+ letter words
      'TESTING', 'PLAYING', 'WORKING', 'TALKING', 'WALKING', 'RUNNING'
    ];

    this.enableWords = new Set(testWords);
    
    // Build words-by-length map for random selection
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

    // Use centralized profanity management for testing
    // Use comprehensive profanity for complete coverage
    this.profanityWords = new Set(getComprehensiveProfanityWords());

    this.isLoaded = true;
  }

  // Test-specific methods for controlling word data during tests
  public addWord(word: string): void {
    const upperWord = word.toUpperCase();
    this.enableWords.add(upperWord);
    
    const length = upperWord.length;
    if (!this.wordsByLength.has(length)) {
      this.wordsByLength.set(length, []);
    }
    if (!this.wordsByLength.get(length)!.includes(upperWord)) {
      this.wordsByLength.get(length)!.push(upperWord);
    }
  }

  public removeWord(word: string): void {
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

  public clearWords(): void {
    this.enableWords.clear();
    this.slangWords.clear();
    this.wordsByLength.clear();
  }

  public addProfanityWord(word: string): void {
    this.profanityWords.add(word.toUpperCase());
  }

  public removeProfanityWord(word: string): void {
    this.profanityWords.delete(word.toUpperCase());
  }

  public switchToComprehensiveProfanity(): void {
    this.profanityWords = new Set(getComprehensiveProfanityWords());
  }

  public switchToBasicProfanity(): void {
    this.profanityWords = new Set(getBasicProfanityWords());
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
  validateWord: (word: string): ValidationResult => {
    const normalizedWord = word.trim().toUpperCase();
    if (normalizedWord.length < 3) {
      return { isValid: false, reason: 'TOO_SHORT', word: normalizedWord };
    }
    if (testWordData.hasWord(normalizedWord)) {
      return { isValid: true, word: normalizedWord };
    }
    return { isValid: false, reason: 'NOT_IN_DICTIONARY', word: normalizedWord };
  },

  getRandomWordByLength: (length: number): string | null => {
    const words = Array.from(testWordData.enableWords).filter(w => w.length === length);
    if (words.length > 0) {
      return words[Math.floor(Math.random() * words.length)];
    }
    return null;
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
      loaded: this.wordData.isLoaded(),
      wordCount: this.wordData.enableWords.size
    };
  }

  /**
   * Reset test data to defaults
   */
  reset(): void {
    this.wordData.clearWords();
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
  return testDictionaryDependencies.validateWord(word);
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
  customWordData.clearWords(); // Clear default words
  
  // Add custom words
  for (const word of words) {
    customWordData.addWord(word);
  }

  const customDictionaryDependencies: GameStateDictionaryDependencies = {
    validateWord: (word: string): ValidationResult => {
      const normalizedWord = word.trim().toUpperCase();
      if (normalizedWord.length < 3) {
        return { isValid: false, reason: 'TOO_SHORT', word: normalizedWord };
      }
      if (customWordData.hasWord(normalizedWord)) {
        return { isValid: true, word: normalizedWord };
      }
      return { isValid: false, reason: 'NOT_IN_DICTIONARY', word: normalizedWord };
    },

    getRandomWordByLength: (length: number): string | null => {
      const words = Array.from(customWordData.enableWords).filter(w => w.length === length);
      if (words.length > 0) {
        return words[Math.floor(Math.random() * words.length)];
      }
      return null;
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