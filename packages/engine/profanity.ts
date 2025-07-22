/**
 * Centralized Profanity Word Management
 * 
 * Platform-agnostic profanity detection using comprehensive word lists.
 * All platform adapters import from this module for consistency.
 * 
 * Architecture Note: This module lives in the core engine and provides
 * a single source of truth for profanity words across all platforms
 * (web, iOS, Android, etc.)
 */

/**
 * Configuration for profanity filtering
 */
export interface ProfanityConfig {
  level: 'basic' | 'comprehensive';
  customWords?: string[];
  excludeWords?: string[];
  enableSlang?: boolean;
}

/**
 * Legacy basic profanity words preserved for backward compatibility
 * These words are guaranteed to be included even if not in comprehensive list
 */
const LEGACY_WORDS = [
  'DAMN', 'HELL', 'CRAP', 'PISS', 'SHIT', 'FUCK', 'BITCH', 'ASSHOLE',
  'BASTARD', 'WHORE', 'SLUT', 'FART', 'POOP', 'BUTT', 'ASS'
];

/**
 * Loads and cleans the comprehensive profanity word list
 * Filters out words with spaces or numbers for performance and simplicity
 */
function loadComprehensiveProfanityWords(): string[] {
  try {
    const naughtyWords = require('naughty-words');
    if (!naughtyWords?.en || !Array.isArray(naughtyWords.en)) {
      console.warn('Failed to load comprehensive profanity list, using legacy words only');
      return LEGACY_WORDS;
    }

    // Filter out words with spaces or numbers for performance and simplicity
    const cleanedWords = naughtyWords.en.filter((word: string) => {
      return typeof word === 'string' && !/[\s\d]/.test(word);
    });

    // Convert to uppercase for consistency
    const uppercaseWords = cleanedWords.map((word: string) => word.toUpperCase());
    
    // Ensure all legacy words are included for backward compatibility
    const allWords = new Set([...uppercaseWords, ...LEGACY_WORDS]);
    
    return Array.from(allWords);
  } catch (error) {
    console.warn('Failed to load naughty-words package, using legacy words only:', error);
    return LEGACY_WORDS;
  }
}

/**
 * Get basic profanity words (legacy compatibility)
 * @returns Array of basic profanity words
 */
export function getBasicProfanityWords(): string[] {
  return [...LEGACY_WORDS];
}

/**
 * Get comprehensive profanity words (cleaned list without spaces/numbers)
 * @returns Array of comprehensive profanity words
 */
export function getComprehensiveProfanityWords(): string[] {
  return loadComprehensiveProfanityWords();
}

/**
 * Get profanity words based on configuration
 * @param config - Profanity configuration options
 * @returns Set of profanity words for efficient lookup
 */
export function getProfanityWords(config: ProfanityConfig = { level: 'comprehensive' }): Set<string> {
  let words: string[];
  
  if (config.level === 'basic') {
    words = [...LEGACY_WORDS];
  } else {
    words = loadComprehensiveProfanityWords();
  }

  // Add custom words if provided
  if (config.customWords) {
    words = [...words, ...config.customWords.map(w => w.toUpperCase())];
  }

  // Remove excluded words if provided
  if (config.excludeWords) {
    const excludeSet = new Set(config.excludeWords.map(w => w.toUpperCase()));
    words = words.filter(word => !excludeSet.has(word));
  }

  return new Set(words);
}

/**
 * Check if a word is considered profanity
 * @param word - Word to check
 * @param config - Profanity configuration options
 * @returns True if the word is profanity
 */
export function isProfanity(word: string, config: ProfanityConfig = { level: 'comprehensive' }): boolean {
  const profanityWords = getProfanityWords(config);
  return profanityWords.has(word.toUpperCase());
}

/**
 * Get statistics about the profanity word lists
 * @returns Object with profanity statistics
 */
export function getProfanityStats(): {
  basic: number;
  comprehensive: number;
  filtered: number;
  compressionRatio: number;
} {
  const basicCount = LEGACY_WORDS.length;
  const comprehensiveCount = loadComprehensiveProfanityWords().length;
  
  // Calculate how many words were filtered out
  try {
    const naughtyWords = require('naughty-words');
    const originalCount = naughtyWords?.en?.length || 0;
    const filteredCount = originalCount - comprehensiveCount + LEGACY_WORDS.length; // Adjust for legacy overlap
    
    return {
      basic: basicCount,
      comprehensive: comprehensiveCount,
      filtered: filteredCount,
      compressionRatio: Math.round((filteredCount / originalCount) * 100)
    };
  } catch (error) {
    return {
      basic: basicCount,
      comprehensive: comprehensiveCount,
      filtered: 0,
      compressionRatio: 0
    };
  }
} 