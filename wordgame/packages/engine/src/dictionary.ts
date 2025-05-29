import Filter from 'bad-words';
// @ts-ignore
import enableWordsRaw from '../assets/enable-word-list-3plus.json';
// @ts-ignore
import slangWordsRaw from '../assets/slang-cleaned-list.json';

const enableWords: string[] = enableWordsRaw as string[];
const slangWordsList: { term: string; definition: string }[] = slangWordsRaw as { term: string; definition: string }[];
const slangWords = new Set<string>(slangWordsList.map(entry => entry.term));

// Initialize the bad words filter
const filter = new Filter();

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
// const slangWords = new Set<string>([ ... ]);

/**
 * Validates if a word is acceptable for the game
 * @param word The word to validate
 * @param previousWord The previously played word (if any)
 * @param isBot Whether the player is a bot (bots can break rules)
 * @returns boolean indicating if the word is valid
 */
export function validateWord(word: string, previousWord?: string, isBot: boolean = false): boolean {
  if (!word) return false;
  
  // Bots can break rules based on their personality
  if (isBot) {
    return true;
  }
  
  const upperWord = word.toUpperCase();
  
  // Only allow letters for non-bot players
  if (!/^[A-Z]+$/.test(upperWord)) {
    return false;
  }
  
  // Check if word is in common words or slang
  if (commonWords.has(upperWord) || slangWords.has(upperWord)) {
    // If there's a previous word, check length difference
    if (previousWord) {
      const lengthDiff = Math.abs(upperWord.length - previousWord.length);
      if (lengthDiff > 1) {
        return false;
      }
    }
    return true;
  }
  
  // If not in dictionary, not valid
  return false;
}

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
  } else {
    slangWords.add(upperWord);
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