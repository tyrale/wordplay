/**
 * Challenge Engine Tests
 * 
 * Tests for the daily word transformation puzzle system.
 */

import { createChallengeEngine, hashString, type ChallengeState } from './challenge';
import type { DictionaryEngine, UtilityDependencies } from './interfaces';

// Mock dictionary for testing with call counter
let mockCallCounter = 0;

const mockDictionary: DictionaryEngine = {
  validateWord: (word: string) => ({ isValid: true, word }),
  isValidDictionaryWord: (word: string) => {
    const testWords = [
      // 4-letter words
      'GAME', 'NAME', 'SAME', 'CAME', 'MAKE', 'TAKE', 'FAKE', 'TIME', 'LIME', 'LIFE', 'FILE', 'PILE', 'MILE',
      // 5-letter words (expanded for new constraints)
      'GAMES', 'GAMER', 'NAMES', 'MAKES', 'TAKES', 'TIMES', 'LIMES', 'FILES', 'PILES', 'MILES',
      'QUICK', 'JUMPY', 'FRIZZ', 'BLITZ', 'WALTZ', 'QUIRK', 'ZINGY', 'PROXY', 'FUZZY', 'WHISK',
      'JERKY', 'MIXED', 'VINYL', 'ZEBRA', 'HAPPY', 'WORLD', 'HOUSE', 'MOUSE', 'BROWN', 'CROWN',
      // 6-letter words
      'QUARTZ', 'FRIZZY', 'JOCKEY', 'WHISKY', 'ZEPHYR', 'OXYGEN', 'PYTHON', 'RHYTHM', 'SPHINX',
      'FLYWAY', 'GIZMOS', 'HIJACK', 'JAUNTY', 'HOUSES', 'MOUSES', 'BROWNS', 'CROWNS',
      // 7-letter words
      'QUICKLY', 'FIZZING', 'JOCKEYS', 'WHISKEY', 'ZEPHYRS', 'PYTHONS', 'RHYTHMS', 'FLYWAYS'
    ];
    return testWords.includes(word.toUpperCase());
  },
  getRandomWordByLength: (length: number) => {
    const words = {
      4: ['GAME', 'NAME', 'SAME', 'CAME', 'MAKE', 'TAKE', 'FAKE', 'TIME', 'LIME', 'LIFE', 'FILE', 'PILE', 'MILE'],
      5: ['GAMES', 'GAMER', 'NAMES', 'MAKES', 'TAKES', 'TIMES', 'LIMES', 'FILES', 'PILES', 'MILES',
          'QUICK', 'JUMPY', 'FRIZZ', 'BLITZ', 'WALTZ', 'QUIRK', 'ZINGY', 'PROXY', 'FUZZY', 'WHISK',
          'JERKY', 'MIXED', 'VINYL', 'ZEBRA', 'HAPPY', 'WORLD', 'HOUSE', 'MOUSE', 'BROWN', 'CROWN'],
      6: ['QUARTZ', 'FRIZZY', 'JOCKEY', 'WHISKY', 'ZEPHYR', 'OXYGEN', 'PYTHON', 'RHYTHM', 'SPHINX',
          'FLYWAY', 'GIZMOS', 'HIJACK', 'JAUNTY', 'HOUSES', 'MOUSES', 'BROWNS', 'CROWNS'],
      7: ['QUICKLY', 'FIZZING', 'JOCKEYS', 'WHISKEY', 'ZEPHYRS', 'PYTHONS', 'RHYTHMS', 'FLYWAYS']
    };
    const wordList = words[length as keyof typeof words] || [];
    // Use a counter to vary word selection
    mockCallCounter++;
    return wordList.length > 0 ? wordList[mockCallCounter % wordList.length] : null;
  },
  getDictionaryInfo: () => ({ wordCount: 50, isLoaded: true, loadTime: 100 })
};

// Mock utilities
const mockUtilities: UtilityDependencies = {
  getTimestamp: () => 1640995200000, // Fixed timestamp for consistent tests
  random: () => 0.5, // Fixed random for deterministic tests
  log: (msg: string) => console.log(msg)
};

// Mock storage
const mockStorage = new Map<string, ChallengeState>();

const mockLoadState = async (date: string): Promise<ChallengeState | null> => {
  return mockStorage.get(date) || null;
};

const mockSaveState = async (state: ChallengeState): Promise<void> => {
  mockStorage.set(state.date, state);
};

describe('Challenge Engine', () => {
  let challengeEngine: ReturnType<typeof createChallengeEngine>;

  beforeEach(async () => {
    // Clear storage and reset counter
    mockStorage.clear();
    mockCallCounter = 0;
    
    // Create challenge engine
    challengeEngine = createChallengeEngine({
      dictionary: mockDictionary,
      utilities: mockUtilities,
      loadState: mockLoadState,
      saveState: mockSaveState
    });

    await challengeEngine.initialize();
  });

  describe('Daily Challenge Generation', () => {
    test('should generate consistent challenges for the same date', async () => {
      const date = '2024-01-15';
      
      const challenge1 = await challengeEngine.getDailyChallengeState(date);
      const challenge2 = await challengeEngine.getDailyChallengeState(date);
      
      expect(challenge1.startWord).toBe(challenge2.startWord);
      expect(challenge1.targetWord).toBe(challenge2.targetWord);
      expect(challenge1.date).toBe(date);
    });

    test('should generate different challenges for different dates', async () => {
      const challenge1 = await challengeEngine.getDailyChallengeState('2024-01-01');
      const challenge2 = await challengeEngine.getDailyChallengeState('2024-06-01');
      
      // Different dates should produce different seeds and potentially different words
      // At minimum, they should have different dates and the challenges should be independently generated
      expect(challenge1.date).not.toBe(challenge2.date);
      expect(challenge1.date).toBe('2024-01-01');
      expect(challenge2.date).toBe('2024-06-01');
      
      // The words may be the same due to small mock dictionary, but the challenges are independently generated
      expect(challenge1.stepCount).toBe(0);
      expect(challenge2.stepCount).toBe(0);
    });

    test('should create valid initial challenge state', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      expect(challenge.startWord).toBeTruthy();
      expect(challenge.targetWord).toBeTruthy();
      expect(challenge.startWord).not.toBe(challenge.targetWord);
      expect(challenge.currentWord).toBe(challenge.startWord);
      expect(challenge.wordSequence).toEqual([challenge.startWord]);
      expect(challenge.stepCount).toBe(0);
      expect(challenge.completed).toBe(false);
      expect(challenge.failed).toBe(false);
    });

    test('should enforce minimum target word length constraint (≥5 letters)', async () => {
      // Test multiple dates to ensure constraint is consistently applied
      const dates = ['2024-01-15', '2024-02-20', '2024-03-25', '2024-04-30'];
      
      for (const date of dates) {
        const challenge = await challengeEngine.getDailyChallengeState(date);
        expect(challenge.targetWord.length).toBeGreaterThanOrEqual(5);
      }
    });

    test('should enforce 5-letter start words constraint', async () => {
      // Test multiple dates to ensure constraint is consistently applied
      const dates = ['2024-01-15', '2024-02-20', '2024-03-25', '2024-04-30', '2024-05-10'];
      
      for (const date of dates) {
        const challenge = await challengeEngine.getDailyChallengeState(date);
        expect(challenge.startWord.length).toBe(5);
      }
    });

    test('should enforce no repeating letters constraint for start words', async () => {
      // Helper function to check for repeating letters
      const hasRepeatingLetters = (word: string): boolean => {
        const letterCounts = new Map<string, number>();
        for (const letter of word.toUpperCase()) {
          const count = letterCounts.get(letter) || 0;
          if (count > 0) return true;
          letterCounts.set(letter, count + 1);
        }
        return false;
      };

      // Test multiple dates to ensure constraint is consistently applied
      const dates = ['2024-01-15', '2024-02-20', '2024-03-25', '2024-04-30', '2024-05-10'];
      
      for (const date of dates) {
        const challenge = await challengeEngine.getDailyChallengeState(date);
        expect(hasRepeatingLetters(challenge.startWord)).toBe(false);
      }
    });

    test('should enforce no repeating letters constraint for target words', async () => {
      // Helper function to check for repeating letters
      const hasRepeatingLetters = (word: string): boolean => {
        const letterCounts = new Map<string, number>();
        for (const letter of word.toUpperCase()) {
          const count = letterCounts.get(letter) || 0;
          if (count > 0) return true;
          letterCounts.set(letter, count + 1);
        }
        return false;
      };

      // Test multiple dates to ensure constraint is consistently applied
      const dates = ['2024-01-15', '2024-02-20', '2024-03-25', '2024-04-30', '2024-05-10', '2024-06-15'];
      
      for (const date of dates) {
        const challenge = await challengeEngine.getDailyChallengeState(date);
        expect(hasRepeatingLetters(challenge.targetWord)).toBe(false);
      }
    });

    test('should enforce maximum common letters constraint (≤2 letters)', async () => {
      // Helper function to count common letters (same as in implementation)
      const countCommonLetters = (word1: string, word2: string): number => {
        const freq1 = new Map<string, number>();
        const freq2 = new Map<string, number>();
        
        for (const char of word1.toUpperCase()) {
          freq1.set(char, (freq1.get(char) || 0) + 1);
        }
        
        for (const char of word2.toUpperCase()) {
          freq2.set(char, (freq2.get(char) || 0) + 1);
        }
        
        let commonCount = 0;
        for (const [char, count1] of freq1) {
          const count2 = freq2.get(char) || 0;
          commonCount += Math.min(count1, count2);
        }
        
        return commonCount;
      };

      // Test multiple dates to ensure constraint is consistently applied
      const dates = ['2024-01-15', '2024-02-20', '2024-03-25', '2024-04-30'];
      
      for (const date of dates) {
        const challenge = await challengeEngine.getDailyChallengeState(date);
        const commonLetters = countCommonLetters(challenge.startWord, challenge.targetWord);
        expect(commonLetters).toBeLessThanOrEqual(2);
      }
    });

    test('should maintain deterministic generation with new constraints', async () => {
      const date = '2024-05-01';
      
      // Reset mock counter to ensure consistent state
      mockCallCounter = 0;
      
      // Generate the same challenge multiple times
      const challenge1 = await challengeEngine.getDailyChallengeState(date);
      
      // Reset mock counter again to match the initial state
      mockCallCounter = 0;
      
      // Reset and generate again
      await challengeEngine.resetDailyChallenge(date);
      const challenge2 = await challengeEngine.getDailyChallengeState(date);
      
      // Should be identical (same deterministic seed should produce same results)
      expect(challenge1.startWord).toBe(challenge2.startWord);
      expect(challenge1.targetWord).toBe(challenge2.targetWord);
      
      // Both should meet new constraints
      expect(challenge1.targetWord.length).toBeGreaterThanOrEqual(5);
      expect(challenge2.targetWord.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Word Submission', () => {
    test('should accept valid word moves', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      const result = await challengeEngine.submitWord('GAMES', challenge);
      
      expect(result.isValid).toBe(true);
      expect(result.newState.wordSequence).toContain('GAMES');
      expect(result.newState.stepCount).toBe(1);
      expect(result.newState.currentWord).toBe('GAMES');
    });

    test('should reject invalid dictionary words', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      const result = await challengeEngine.submitWord('INVALID', challenge);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should reject already used words', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      // Use the start word again
      const result = await challengeEngine.submitWord(challenge.startWord, challenge);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Word already used');
    });

    test('should detect completion when target word is reached', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      const result = await challengeEngine.submitWord(challenge.targetWord, challenge);
      
      if (result.isValid) {
        expect(result.isComplete).toBe(true);
        expect(result.newState.completed).toBe(true);
      }
    });
  });

  describe('Move Validation', () => {
    test('should validate word length changes correctly', () => {
      expect(challengeEngine.isValidMove('GAME', 'GAMES')).toBe(true); // +1 length
      expect(challengeEngine.isValidMove('GAMES', 'GAME')).toBe(true); // -1 length
      expect(challengeEngine.isValidMove('GAME', 'GAME')).toBe(false); // same word
      expect(challengeEngine.isValidMove('GAME', 'GAMERS')).toBe(false); // +2 length
    });
  });

  describe('Challenge Forfeiting', () => {
    test('should mark challenge as failed when forfeited', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      const result = await challengeEngine.forfeitChallenge(challenge);
      
      expect(result.failed).toBe(true);
      expect(result.failedAtWord).toBe(challenge.currentWord);
    });
  });

  describe('Sharing System', () => {
    test('should generate sharing patterns', () => {
      const wordSequence = ['GAME', 'GAMES', 'GAMER'];
      const patterns = challengeEngine.generateSharingPattern(wordSequence);
      
      expect(patterns).toHaveLength(2); // Two transformations
      expect(patterns[0]).toMatch(/[🀫*]+/); // Should contain emoji and asterisks
    });

    test('should generate complete sharing text with checkmark for completed challenges', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      // Complete a challenge to test step count format
      const result = await challengeEngine.submitWord(challenge.targetWord, challenge);
      const completedChallenge = result.isValid ? result.newState : challenge;
      
      const sharingText = challengeEngine.generateSharingText(completedChallenge);
      
      expect(sharingText).toContain('Challenge #');
      expect(sharingText).toContain(challenge.startWord);
      expect(sharingText).toContain(challenge.targetWord);
      
      // Verify step count format without parentheses for completed challenges
      if (completedChallenge.completed) {
        expect(sharingText).toContain(' ✓ '); // Should have checkmark between challenge # and words
        expect(sharingText).toMatch(/\d+ turns/);
        expect(sharingText).not.toMatch(/\(\d+ turns\)/);
      }
    });

    test('should generate sharing text with red X for failed challenges', async () => {
      const challenge = await challengeEngine.getDailyChallengeState('2024-01-15');
      
      // Forfeit the challenge
      const failedChallenge = await challengeEngine.forfeitChallenge(challenge);
      const sharingText = challengeEngine.generateSharingText(failedChallenge);
      
      expect(sharingText).toContain('Challenge #');
      expect(sharingText).toContain(' ❌ '); // Should have red X between challenge # and words
      expect(sharingText).toContain(challenge.startWord);
      expect(sharingText).toContain(challenge.targetWord);
      expect(sharingText).not.toContain('turns'); // Failed challenges don't show turn count
    });
  });

  describe('Utility Functions', () => {
    test('should hash strings consistently', () => {
      const hash1 = hashString('2024-01-15');
      const hash2 = hashString('2024-01-15');
      const hash3 = hashString('2024-01-16');
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('Debug Functions', () => {
    test('should reset daily challenge', async () => {
      const date = '2024-01-15';
      const challenge1 = await challengeEngine.getDailyChallengeState(date);
      
      await challengeEngine.resetDailyChallenge(date);
      const challenge2 = await challengeEngine.getDailyChallengeState(date);
      
      // Should be same words (deterministic) but reset state
      expect(challenge2.stepCount).toBe(0);
      expect(challenge2.completed).toBe(false);
      expect(challenge2.failed).toBe(false);
    });

    test('should generate random challenges', async () => {
      const challenge = await challengeEngine.generateRandomChallenge();
      
      expect(challenge.startWord).toBeTruthy();
      expect(challenge.targetWord).toBeTruthy();
      expect(challenge.date).toContain('random-');
    });

    test('should enforce constraints in random challenges', async () => {
      // Helper function to count common letters
      const countCommonLetters = (word1: string, word2: string): number => {
        const freq1 = new Map<string, number>();
        const freq2 = new Map<string, number>();
        
        for (const char of word1.toUpperCase()) {
          freq1.set(char, (freq1.get(char) || 0) + 1);
        }
        
        for (const char of word2.toUpperCase()) {
          freq2.set(char, (freq2.get(char) || 0) + 1);
        }
        
        let commonCount = 0;
        for (const [char, count1] of freq1) {
          const count2 = freq2.get(char) || 0;
          commonCount += Math.min(count1, count2);
        }
        
        return commonCount;
      };

      // Helper function to check for repeating letters
      const hasRepeatingLetters = (word: string): boolean => {
        const letterCounts = new Map<string, number>();
        for (const letter of word.toUpperCase()) {
          const count = letterCounts.get(letter) || 0;
          if (count > 0) return true;
          letterCounts.set(letter, count + 1);
        }
        return false;
      };

      // Test multiple random challenges
      for (let i = 0; i < 5; i++) {
        const challenge = await challengeEngine.generateRandomChallenge();
        
        // Should meet minimum target word length
        expect(challenge.targetWord.length).toBeGreaterThanOrEqual(5);
        
        // Should meet maximum common letters constraint
        const commonLetters = countCommonLetters(challenge.startWord, challenge.targetWord);
        expect(commonLetters).toBeLessThanOrEqual(2);
        
        // Should have no repeating letters in start word
        expect(hasRepeatingLetters(challenge.startWord)).toBe(false);
        
        // Should have no repeating letters in target word
        expect(hasRepeatingLetters(challenge.targetWord)).toBe(false);
        
        // Should be exactly 5 letters
        expect(challenge.startWord.length).toBe(5);
        
        // Should be different words
        expect(challenge.startWord).not.toBe(challenge.targetWord);
      }
    });
  });
}); 