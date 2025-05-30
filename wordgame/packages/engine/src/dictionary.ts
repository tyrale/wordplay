import { Filter } from 'bad-words';
import enableWordsRaw from '../assets/enable-word-list-3plus.json';
import slangWordsRaw from '../assets/slang-cleaned-list.json';

// Static arrays to avoid complex JSON parsing
const enableWords: string[] = Array.isArray(enableWordsRaw) ? enableWordsRaw : [];
const slangWordsArray: string[] = Array.isArray(slangWordsRaw) 
  ? slangWordsRaw.map((item: any) => typeof item === 'string' ? item : item.term)
  : [];

// Initialize filter for profanity checking
const filter = new Filter();

// Dictionary service for word validation
export const dictionaryService = {
  // Combined word sets
  enableSet: new Set(enableWords.map(word => word.toUpperCase())),
  slangSet: new Set(slangWordsArray.map(word => word.toUpperCase())),
  
  /**
   * Check if word exists in dictionary (ENABLE word list + slang)
   */
  hasWord(word: string): boolean {
    const upperWord = word.toUpperCase();
    return this.enableSet.has(upperWord) || this.slangSet.has(upperWord);
  },

  /**
   * Check if word is appropriate (not profane)
   */
  isAppropriate(word: string): boolean {
    return !filter.isProfane(word);
  },

  /**
   * Get censored version of word for display
   */
  getCensoredWord(word: string): string {
    return filter.clean(word);
  },

  /**
   * Check if word contains leetspeak numbers for display
   */
  hasNumbers(word: string): boolean {
    return /\d/.test(word);
  },

  /**
   * Convert word to display format (show numbers as styled)
   */
  getDisplayWord(word: string): string {
    if (this.hasNumbers(word)) {
      return word.replace(/\d/g, (num) => `[${num}]`);
    }
    return word;
  }
};

/**
 * Validate a word against all criteria
 */
export function validateWord(
  word: string, 
  previousWord?: string,
  options: { allowBot?: boolean } = {}
): { valid: boolean; reason?: string } {
  // If bot is allowed, skip all validation rules
  if (options.allowBot) {
    return { valid: true };
  }

  // Basic length check
  if (word.length < 3) {
    return { valid: false, reason: 'Word must be at least 3 letters' };
  }

  // Check alphabet characters only
  if (!/^[A-Za-z]+$/.test(word)) {
    return { valid: false, reason: 'Word must contain only letters' };
  }

  // Length validation based on previous word
  if (previousWord) {
    const lengthDiff = Math.abs(word.length - previousWord.length);
    if (lengthDiff > 1) {
      return { valid: false, reason: 'Word length can only change by 1 letter' };
    }
  }

  // Dictionary check
  if (!dictionaryService.hasWord(word)) {
    return { valid: false, reason: 'Word not found in dictionary' };
  }

  // Profanity check
  if (!dictionaryService.isAppropriate(word)) {
    return { valid: false, reason: 'Inappropriate word' };
  }

  return { valid: true };
}

/**
 * Get a random valid word from the dictionary
 */
export function getRandomWord(minLength = 3, maxLength = 8): string {
  const validWords = enableWords.filter(
    word => word.length >= minLength && 
            word.length <= maxLength &&
            dictionaryService.isAppropriate(word)
  );
  
  if (validWords.length === 0) {
    return 'CAT'; // Fallback
  }
  
  const randomIndex = Math.floor(Math.random() * validWords.length);
  return validWords[randomIndex].toUpperCase();
}

/**
 * Get words by length for game initialization
 */
export function getWordsByLength(length: number): string[] {
  return enableWords
    .filter(word => word.length === length && dictionaryService.isAppropriate(word))
    .map(word => word.toUpperCase());
}

/**
 * Find anagrams of a given word
 */
export function findAnagrams(word: string): string[] {
  const sortedLetters = word.toUpperCase().split('').sort().join('');
  
  return enableWords
    .filter(candidateWord => {
      if (candidateWord.length !== word.length) return false;
      const candidateSorted = candidateWord.toUpperCase().split('').sort().join('');
      return candidateSorted === sortedLetters && candidateWord.toUpperCase() !== word.toUpperCase();
    })
    .map(word => word.toUpperCase());
}

/**
 * Check if two words are anagrams
 */
export function areAnagrams(word1: string, word2: string): boolean {
  if (word1.length !== word2.length) return false;
  
  const sorted1 = word1.toUpperCase().split('').sort().join('');
  const sorted2 = word2.toUpperCase().split('').sort().join('');
  
  return sorted1 === sorted2 && word1.toUpperCase() !== word2.toUpperCase();
}

/**
 * Dictionary Service
 * 
 * Word Lists:
 * - Common Words: ENABLE word list (Enhanced North American Benchmark Lexicon)
 *   Source: https://norvig.com/ngrams/enable1.txt
 * 
 * - Slang Words: Modern informal terms and expressions
 *   Sources:
 *   - Urban Dictionary API (filtered for appropriateness)
 *   - Current social media trends
 *   - Gen Z slang dictionaries
 *   - Gaming community terms
 * 
 * Note: Slang dictionary should be updated with each app release
 * to include current trending terms while maintaining appropriateness.
 */

// Common English words (ENABLE word list)
const commonWords = new Set<string>(enableWords);

// Slang and informal words (to be expanded)
const slangWords = new Set<string>(slangWordsArray);

/**
 * Checks if a word is in the dictionary
 * @param word The word to check
 * @returns boolean indicating if the word is in the dictionary
 */
export function isInDictionary(word: string): boolean {
  const upperWord = word.toUpperCase();
  return commonWords.has(upperWord) || slangWords.has(upperWord);
}

/**
 * Censors inappropriate words by replacing letters with asterisks
 * @param word The word to censor
 * @returns The censored word
 */
export function censorWord(word: string): string {
  if (!word) return '';
  
  const upperWord = word.toUpperCase();
  
  if (filter.isProfane(upperWord)) {
    return '*'.repeat(upperWord.length);
  }
  
  return upperWord;
}

/**
 * Adds a new word to the dictionary
 * @param word The word to add
 * @param category The category of the word ('common' or 'slang')
 */
export function addWord(word: string, category: 'common' | 'slang'): void {
  if (!word) return;
  
  const upperWord = word.toUpperCase();
  
  if (category === 'common') {
    commonWords.add(upperWord);
    dictionaryService.enableSet.add(upperWord);
  } else {
    slangWords.add(upperWord);
    dictionaryService.slangSet.add(upperWord);
  }
}

/**
 * Gets the length difference between two words
 * @param word1 First word
 * @param word2 Second word
 * @returns The absolute difference in length
 */
export function getWordLengthDifference(word1: string, word2: string): number {
  return Math.abs(word1.length - word2.length);
} 