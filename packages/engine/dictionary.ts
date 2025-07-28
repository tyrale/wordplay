/**
 * Word Validation Service (Platform-Agnostic)
 * 
 * This module provides comprehensive word validation for the WordPlay game,
 * using dependency injection to avoid platform-specific imports.
 * Platform adapters provide word data and file system access.
 */

// Remove Node.js imports - replaced with dependency injection
// import { readFileSync } from 'fs';
// import { join, dirname } from 'path';
// import { fileURLToPath } from 'url';

// Import centralized profanity management
import { getComprehensiveProfanityWords } from './profanity';

// Types for validation
export interface ValidationOptions {
  isBot?: boolean;
  allowSlang?: boolean;
  allowProfanity?: boolean;
  checkLength?: boolean;
  previousWord?: string;
}

// Import shared interfaces from central location
import type { ValidationResult, WordDataDependencies } from './interfaces';

// Word sets for different validation scenarios
class WordDictionary {
  private enableWords: Set<string> = new Set();
  private slangWords: Set<string> = new Set();
  private profanityWords: Set<string> = new Set();
  private initialized = false;

  // Dependency injection version of constructor
  constructor(wordData?: WordDataDependencies) {
    if (wordData) {
      this.initializeWithData(wordData);
    } else {
      // Keep old initialization for backward compatibility
      this.initializeDictionary();
    }
  }

  // New: Dependency-injected initialization
  private initializeWithData(wordData: WordDataDependencies) {
    this.enableWords = new Set(wordData.enableWords);
    this.slangWords = new Set(wordData.slangWords);
    this.profanityWords = new Set(wordData.profanityWords);
    this.initialized = true;
  }

  // Legacy: Minimal initialization (Node.js file system loading moved to adapters)
  private initializeDictionary() {
    if (this.initialized) return;

    // Minimal word set for backward compatibility when no dependency injection
    // Real word loading should be done via dependency injection
    const minimalWords = ['CAT', 'DOG', 'WORD', 'GAME', 'TEST', 'HELLO', 'WORLD'];
    minimalWords.forEach(word => this.enableWords.add(word));

    // Add common slang words that are acceptable in casual play
    const slangWords = [
      'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG',
      'VLOG', 'WIFI', 'UBER', 'GOOGLE', 'TWEET', 'UNFRIEND', 'HASHTAG',
      'PHOTOBOMB', 'MANSPLAIN', 'GHOSTING', 'CATFISH', 'TROLL', 'MEME',
      'VIRAL', 'CLICKBAIT', 'SPAM', 'PHISHING', 'MALWARE', 'AVATAR',
      'NOOB', 'PWNED', 'EPIC', 'FAIL', 'WIN', 'OWNED', 'LEET', 'HAXOR'
    ];
    slangWords.forEach(word => this.slangWords.add(word.toUpperCase()));

    // Use empty profanity set for fallback - real data should come via dependency injection
    this.profanityWords = new Set();

    this.initialized = true;
    console.warn('Dictionary: Using minimal word set. For full functionality, use dependency injection with complete word data.');
  }

  public isInEnable(word: string): boolean {
    return this.enableWords.has(word.toUpperCase());
  }

  public isSlang(word: string): boolean {
    return this.slangWords.has(word.toUpperCase());
  }

  public isProfanity(word: string): boolean {
    return this.profanityWords.has(word.toUpperCase());
  }

  public censorWord(word: string): string {
    if (!this.isProfanity(word)) return word;
    
    const upperWord = word.toUpperCase();
    const firstChar = upperWord[0];
    const lastChar = upperWord[upperWord.length - 1];
    const middle = '*'.repeat(Math.max(0, upperWord.length - 2));
    
    return firstChar + middle + lastChar;
  }

  public getWordCount(): number {
    return this.enableWords.size;
  }

  /**
   * Get a random word of specified length from the dictionary
   */
  public getRandomWordByLength(length: number): string | null {
    const wordsOfLength = Array.from(this.enableWords).filter(word => word.length === length);
    
    if (wordsOfLength.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * wordsOfLength.length);
    return wordsOfLength[randomIndex];
  }

  /**
   * Get multiple random words of specified length
   */
  public getRandomWordsByLength(length: number, count: number = 1): string[] {
    const wordsOfLength = Array.from(this.enableWords).filter(word => word.length === length);
    
    if (wordsOfLength.length === 0) {
      return [];
    }
    
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * wordsOfLength.length);
      result.push(wordsOfLength[randomIndex]);
    }
    
    return result;
  }
}

// =============================================================================
// PLATFORM-AGNOSTIC ARCHITECTURE NOTE
// =============================================================================
// The legacy singleton dictionary instance has been removed as part of the
// multi-platform dependency injection migration. All dictionary functionality
// now uses dependency injection for true platform-agnostic support.
//
// For platform-specific usage:
// - Web/Browser: Use createBrowserAdapter().getWordData()
// - Node.js: Use createNodeAdapter().getWordData()  
// - Tests: Use createTestAdapter().getWordData()
// - React Native/iOS/Android: Create platform-specific adapters
//
// Legacy functions below are deprecated and will be removed in a future version.
// =============================================================================

// =============================================================================
// VANITY DISPLAY SYSTEM
// =============================================================================

export interface VanityState {
  hasUnlockedToggle: boolean;
  isVanityFilterOn: boolean;
}

export interface VanityDisplayOptions {
  vanityState: VanityState;
  isEditing?: boolean;
}

/**
 * Transforms a profane word into symbols
 * Uses a variety of symbols to make it look like censoring
 */
function transformToSymbols(word: string): string {
  const symbols = ['%', '#', '^', '&', '*', '@', '!', '$'];
  let result = '';
  
  for (let i = 0; i < word.length; i++) {
    // Use different symbols in a pattern for variety
    result += symbols[i % symbols.length];
  }
  
  return result;
}

// =============================================================================
// DEPENDENCY-INJECTED FUNCTIONS (NEW ARCHITECTURE)
// =============================================================================

/**
 * Validates a word using dependency-injected word data
 * This is the new platform-agnostic approach
 */
export function validateWordWithDependencies(
  word: string, 
  wordData: WordDataDependencies,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    isBot = false,
    allowSlang = true,
    checkLength = true,
    previousWord
  } = options;

  // Handle null/undefined gracefully
  if (word == null) {
    return {
      isValid: false,
      reason: 'EMPTY_WORD',
      word: '',
      userMessage: 'word cannot be empty'
    };
  }

  const normalizedWord = word.trim().toUpperCase();

  // Bots can bypass all validation rules - early return
  if (isBot) {
    return {
      isValid: true,
      word: normalizedWord
    };
  }

  // Early validation: empty or invalid characters
  if (!normalizedWord) {
    return {
      isValid: false,
      reason: 'EMPTY_WORD',
      word: normalizedWord,
      userMessage: 'word cannot be empty'
    };
  }

  // Character validation (alphabetic only for humans)
  if (!/^[A-Z]+$/.test(normalizedWord)) {
    return {
      isValid: false,
      reason: 'INVALID_CHARACTERS',
      word: normalizedWord,
      userMessage: 'only letters allowed'
    };
  }

  // Length validation (minimum 3 letters)
  if (checkLength && normalizedWord.length < 3) {
    return {
      isValid: false,
      reason: 'TOO_SHORT',
      word: normalizedWord,
      userMessage: 'too short'
    };
  }

  // Length change validation (max ±1 letter change)
  if (previousWord && checkLength) {
    const lengthDiff = Math.abs(normalizedWord.length - previousWord.length);
    if (lengthDiff > 1) {
      return {
        isValid: false,
        reason: 'LENGTH_CHANGE_TOO_LARGE',
        word: normalizedWord,
        userMessage: `illegal action`
      };
    }
  }

  // Dictionary validation
  const isInEnable = wordData.enableWords.has(normalizedWord);
  const isSlang = wordData.slangWords.has(normalizedWord);
  const isProfanity = wordData.profanityWords.has(normalizedWord);

  // Word must be in dictionary or accepted slang
  if (!isInEnable && !(allowSlang && isSlang)) {
    return {
      isValid: false,
      reason: 'NOT_IN_DICTIONARY',
      word: normalizedWord,
      userMessage: 'not a word'
    };
  }

  // Profanity is valid for play but may be displayed differently
  // Use inline symbol transformation to avoid dependency on helper function
  return {
    isValid: true,
    word: normalizedWord,
    censored: isProfanity ? normalizedWord.split('').map((_, i) => ['!', '@', '#', '$', '%', '^', '&', '*'][i % 8]).join('') : undefined
  };
}

/**
 * Check if word exists in dictionary using dependency injection
 */
export function isValidDictionaryWordWithDependencies(word: string, wordData: WordDataDependencies): boolean {
  const normalizedWord = word.trim().toUpperCase();
  return wordData.enableWords.has(normalizedWord) || wordData.slangWords.has(normalizedWord);
}

/**
 * Get random word using dependency injection
 */
export function getRandomWordByLengthWithDependencies(length: number, wordData: WordDataDependencies): string | null {
  const wordsOfLength = Array.from(wordData.enableWords).filter(word => word.length === length);
  
  if (wordsOfLength.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * wordsOfLength.length);
  return wordsOfLength[randomIndex];
}

/**
 * Transforms a word for display based on vanity filter settings using dependency injection
 * This is the new platform-agnostic approach for multi-platform support
 * 
 * Rules:
 * 1. If word is not profane → always show real word
 * 2. If word is profane AND user hasn't unlocked toggle → show symbols
 * 3. If word is profane AND user has unlocked toggle AND filter is on → show symbols  
 * 4. If word is profane AND user has unlocked toggle AND filter is off → show real word
 * 5. During editing, behavior depends on current word composition
 */
export function getVanityDisplayWordWithDependencies(
  word: string, 
  vanityState: VanityState,
  wordData: WordDataDependencies,
  options: { isEditing?: boolean } = {}
): string {
  const normalizedWord = word.trim().toUpperCase();
  
  // If word is not profane, always show real word
  if (!wordData.profanityWords.has(normalizedWord)) {
    return normalizedWord;
  }
  
  // Word is profane - check vanity filter settings
  // Only show symbols if the filter is ON
  if (vanityState.isVanityFilterOn) {
    return transformToSymbols(normalizedWord);
  } else {
    return normalizedWord;
  }
}

/**
 * Checks if submitting this word should unlock the vanity toggle feature using dependency injection
 * This is the new platform-agnostic approach for multi-platform support
 */
export function shouldUnlockVanityToggleWithDependencies(
  word: string,
  wordData: WordDataDependencies
): boolean {
  const normalizedWord = word.trim().toUpperCase();
  return wordData.profanityWords.has(normalizedWord);
}

// =============================================================================
// LEGACY FUNCTIONS (BACKWARD COMPATIBILITY - DEPRECATED)
// =============================================================================
// NOTE: Legacy functions have been removed as part of the multi-platform
// dependency injection migration. These functions relied on a singleton
// dictionary instance which is no longer compatible with platform-agnostic
// architecture.
//
// Migration guide:
// - validateWord() → validateWordWithDependencies()
// - isValidDictionaryWord() → isValidDictionaryWordWithDependencies()
// - getVanityDisplayWord() → getVanityDisplayWordWithDependencies()
// - shouldUnlockVanityToggle() → shouldUnlockVanityToggleWithDependencies()
// - containsProfanity() → wordData.profanityWords.has()
// - isSlangWord() → wordData.slangWords.has()
// - getDictionarySize() → wordData.wordCount
// - getRandomWordByLength() → getRandomWordByLengthWithDependencies()
//
// All legacy functions now throw errors directing users to the new API.
// =============================================================================

/**
 * @deprecated Removed - Use validateWordWithDependencies for platform-agnostic support
 */
export function validateWord(): never {
  throw new Error('validateWord() has been removed. Use validateWordWithDependencies() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use isValidDictionaryWordWithDependencies for platform-agnostic support
 */
export function isValidDictionaryWord(): never {
  throw new Error('isValidDictionaryWord() has been removed. Use isValidDictionaryWordWithDependencies() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use getVanityDisplayWordWithDependencies for platform-agnostic support
 */
export function getVanityDisplayWord(): never {
  throw new Error('getVanityDisplayWord() has been removed. Use getVanityDisplayWordWithDependencies() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use shouldUnlockVanityToggleWithDependencies for platform-agnostic support
 */
export function shouldUnlockVanityToggle(): never {
  throw new Error('shouldUnlockVanityToggle() has been removed. Use shouldUnlockVanityToggleWithDependencies() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use wordData.slangWords.has() with dependency injection for platform-agnostic support
 */
export function isSlangWord(): never {
  throw new Error('isSlangWord() has been removed. Use wordData.slangWords.has() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use wordData.profanityWords.has() with dependency injection for platform-agnostic support
 */
export function containsProfanity(): never {
  throw new Error('containsProfanity() has been removed. Use wordData.profanityWords.has() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use wordData.wordCount with dependency injection for platform-agnostic support
 */
export function getDictionarySize(): never {
  throw new Error('getDictionarySize() has been removed. Use wordData.wordCount with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use getVanityDisplayWordWithDependencies for platform-agnostic support
 */
export function censorProfanity(): never {
  throw new Error('censorProfanity() has been removed. Use getVanityDisplayWordWithDependencies() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use getRandomWordByLengthWithDependencies with dependency injection for platform-agnostic support
 */
export function getRandomWordByLength(): never {
  throw new Error('getRandomWordByLength() has been removed. Use getRandomWordByLengthWithDependencies() with dependency injection for platform-agnostic support.');
}

/**
 * @deprecated Removed - Use multiple calls to getRandomWordByLengthWithDependencies with dependency injection for platform-agnostic support
 */
export function getRandomWordsByLength(): never {
  throw new Error('getRandomWordsByLength() has been removed. Use multiple calls to getRandomWordByLengthWithDependencies() with dependency injection for platform-agnostic support.');
} 