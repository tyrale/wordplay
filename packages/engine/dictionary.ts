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

// Types for validation
export interface ValidationOptions {
  isBot?: boolean;
  allowSlang?: boolean;
  allowProfanity?: boolean;
  checkLength?: boolean;
  previousWord?: string;
  minLength?: number;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  word: string;
  censored?: string;
}

// Dependency interface for word data
export interface WordDataDependencies {
  enableWords: Set<string>;
  slangWords: Set<string>;
  profanityWords: Set<string>;
  hasWord: (word: string) => boolean;
  isProfane: (word: string) => boolean;
}

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

    // Basic profanity list (used for vanity display only)
    const profanityWords = [
      'DAMN', 'HELL', 'CRAP', 'PISS', 'SHIT', 'FUCK', 'BITCH', 'ASSHOLE',
      'BASTARD', 'WHORE', 'SLUT', 'FART', 'POOP', 'BUTT', 'ASS'
    ];
    profanityWords.forEach(word => this.profanityWords.add(word.toUpperCase()));

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

// Legacy singleton dictionary instance (for backward compatibility)
const dictionary = new WordDictionary();

// =============================================================================
// DEPENDENCY-INJECTED FUNCTIONS (NEW ARCHITECTURE)
// =============================================================================

/**
 * Main validation function that checks all word rules.
 * This is the primary export for word validation.
 */
export function validateWordWithDependencies(
  word: string, 
  dependencies: WordDataDependencies,
  options: ValidationOptions = {}
): ValidationResult {
  const { minLength = 3, allowProfanity = false } = options;
  const upperWord = word.toUpperCase();

  // Rule 1: Minimum length
  if (upperWord.length < minLength) {
    return { isValid: false, reason: 'TOO_SHORT', word: upperWord };
  }

  // Rule 2: Must be in a valid dictionary (enable or slang)
  if (!dependencies.hasWord(upperWord)) {
    return { isValid: false, reason: 'NOT_IN_DICTIONARY', word: upperWord };
  }

  // Rule 3: Check for profanity if not allowed
  if (!allowProfanity && dependencies.isProfane(upperWord)) {
    // This case might need a different reason if we want to distinguish it
    return { isValid: false, reason: 'NOT_IN_DICTIONARY', word: upperWord }; 
  }

  return { isValid: true, word: upperWord };
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

// =============================================================================
// LEGACY FUNCTIONS (BACKWARD COMPATIBILITY)
// =============================================================================

/**
 * Validates a word according to game rules (LEGACY - uses Node.js file system)
 */
export function validateWord(word: string, options: ValidationOptions = {}): ValidationResult {
  // Use legacy dictionary singleton
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
      reason: 'Word cannot be empty',
      word: ''
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
      reason: 'Word cannot be empty',
      word: normalizedWord
    };
  }

  // Character validation (alphabetic only for humans)
  if (!/^[A-Z]+$/.test(normalizedWord)) {
    return {
      isValid: false,
      reason: 'Word must contain only alphabetic characters',
      word: normalizedWord
    };
  }

  // Length validation (minimum 3 letters)
  if (checkLength && normalizedWord.length < 3) {
    return {
      isValid: false,
      reason: 'Word must be at least 3 letters long',
      word: normalizedWord
    };
  }

  // Length change validation (max ±1 letter change)
  if (previousWord && checkLength) {
    const lengthDiff = Math.abs(normalizedWord.length - previousWord.length);
    if (lengthDiff > 1) {
      return {
        isValid: false,
        reason: `Word length can only change by 1 letter (was ${previousWord.length}, now ${normalizedWord.length})`,
        word: normalizedWord
      };
    }
  }

  // Dictionary validation
  const isInEnable = dictionary.isInEnable(normalizedWord);
  const isSlang = dictionary.isSlang(normalizedWord);
  const isProfanity = dictionary.isProfanity(normalizedWord);

  // Word must be in dictionary or accepted slang
  if (!isInEnable && !(allowSlang && isSlang)) {
    return {
      isValid: false,
      reason: 'Word not found in dictionary',
      word: normalizedWord
    };
  }

  // Profanity is valid for play but may be displayed differently
  return {
    isValid: true,
    word: normalizedWord,
    censored: isProfanity ? transformToSymbols(normalizedWord) : undefined
  };
}

// Legacy functions already exist below - no duplicates needed

/**
 * Checks if a word exists in the ENABLE dictionary
 */
export function isValidDictionaryWord(word: string): boolean {
  return dictionary.isInEnable(word.trim().toUpperCase());
}

/**
 * Checks if a word is considered slang
 */
export function isSlangWord(word: string): boolean {
  return dictionary.isSlang(word.trim().toUpperCase());
}

/**
 * Checks if a word contains profanity
 */
export function containsProfanity(word: string): boolean {
  return dictionary.isProfanity(word.trim().toUpperCase());
}

/**
 * Gets the total number of words in the dictionary
 */
export function getDictionarySize(): number {
  return dictionary.getWordCount();
}

/**
 * Performance test helper
 */
export function performanceTest(iterations = 1000): { averageTime: number; totalTime: number } {
  const testWords = ['HELLO', 'WORLD', 'JAVASCRIPT', 'TYPESCRIPT', 'BRUH', 'INVALID123', 'CATS', 'DOGS'];
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const word = testWords[i % testWords.length];
    validateWord(word);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const averageTime = totalTime / iterations;
  
  return {
    averageTime,
    totalTime
  };
}

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
 * Transforms a word for display based on vanity filter settings
 * 
 * Rules:
 * 1. If word is not profane → always show real word
 * 2. If word is profane AND user hasn't unlocked toggle → show symbols
 * 3. If word is profane AND user has unlocked toggle AND filter is on → show symbols  
 * 4. If word is profane AND user has unlocked toggle AND filter is off → show real word
 * 5. During editing, behavior depends on current word composition
 */
export function getVanityDisplayWord(
  word: string, 
  options: VanityDisplayOptions
): string {
  const normalizedWord = word.trim().toUpperCase();
  const { vanityState } = options;
  
  // If word is not profane, always show real word
  if (!dictionary.isProfanity(normalizedWord)) {
    return normalizedWord;
  }
  
  // Word is profane - check vanity filter settings
  const shouldShowSymbols = !vanityState.hasUnlockedToggle || vanityState.isVanityFilterOn;
  
  if (shouldShowSymbols) {
    return transformToSymbols(normalizedWord);
  } else {
    return normalizedWord;
  }
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

/**
 * Checks if submitting this word should unlock the vanity toggle feature
 */
export function shouldUnlockVanityToggle(word: string): boolean {
  return dictionary.isProfanity(word.trim().toUpperCase());
}

/**
 * Helper function for game state management
 * Checks if the current word composition is profane (for real-time display)
 */
export function isCurrentWordProfane(word: string): boolean {
  return dictionary.isProfanity(word.trim().toUpperCase());
}

// =============================================================================
// BACKWARD COMPATIBILITY & LEGACY FUNCTIONS
// =============================================================================

/**
 * @deprecated Use getVanityDisplayWord instead
 * Returns a censored version of profane words (legacy function)
 */
export function censorProfanity(word: string): string {
  return dictionary.censorWord(word);
}

/**
 * Gets a random word of specified length from the dictionary
 */
export function getRandomWordByLength(length: number): string | null {
  return dictionary.getRandomWordByLength(length);
}

/**
 * Gets multiple random words of specified length from the dictionary
 */
export function getRandomWordsByLength(length: number, count: number = 1): string[] {
  return dictionary.getRandomWordsByLength(length, count);
} 