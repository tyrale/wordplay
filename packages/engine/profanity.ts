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
 * Basic profanity words for minimal filtering (legacy compatibility)
 */
const BASIC_PROFANITY_WORDS = [
  'DAMN', 'HELL', 'CRAP', 'PISS', 'SHIT', 'FUCK', 'BITCH', 'ASSHOLE',
  'BASTARD', 'WHORE', 'SLUT', 'FART', 'POOP', 'BUTT', 'ASS'
];

/**
 * Load comprehensive profanity words from naughty-words package
 */
function loadComprehensiveProfanityWords(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const naughtyWords = require('naughty-words') as { [language: string]: string[] };
    
    if (naughtyWords.en && Array.isArray(naughtyWords.en)) {
      // Start with comprehensive list
      const comprehensiveWords = [...naughtyWords.en];
      
      // Always include all basic words for backward compatibility
      // Some basic words might not be in the comprehensive list
      for (const basicWord of BASIC_PROFANITY_WORDS) {
        if (!comprehensiveWords.includes(basicWord.toLowerCase())) {
          comprehensiveWords.push(basicWord.toLowerCase());
        }
      }
      
      return comprehensiveWords;
    } else {
      console.warn('Unexpected format from naughty-words package, falling back to basic');
      return [...BASIC_PROFANITY_WORDS];
    }
  } catch (error) {
    console.warn('Failed to load comprehensive profanity list, falling back to basic:', error);
    return [...BASIC_PROFANITY_WORDS];
  }
}

/**
 * Get profanity words based on configuration
 * 
 * @param config - Configuration for profanity filtering
 * @returns Set of uppercase profanity words
 */
export function getProfanityWords(config: ProfanityConfig = { level: 'comprehensive' }): Set<string> {
  let words: string[] = [];
  
  if (config.level === 'basic') {
    // Use basic word list for minimal filtering
    words = [...BASIC_PROFANITY_WORDS];
  } else {
    // Use comprehensive word list from naughty-words package
    words = loadComprehensiveProfanityWords();
  }
  
  // Add custom words if provided
  if (config.customWords) {
    words.push(...config.customWords);
  }
  
  // Remove excluded words if provided
  if (config.excludeWords) {
    const excludeSet = new Set(config.excludeWords.map(w => w.toUpperCase()));
    words = words.filter(word => !excludeSet.has(word.toUpperCase()));
  }
  
  // Convert to uppercase Set for fast lookup
  return new Set(words.map(word => word.toUpperCase()));
}

/**
 * Check if a word is considered profanity
 * 
 * @param word - Word to check
 * @param config - Configuration for profanity filtering
 * @returns True if word is profane
 */
export function isProfanity(word: string, config: ProfanityConfig = { level: 'comprehensive' }): boolean {
  const profanityWords = getProfanityWords(config);
  return profanityWords.has(word.toUpperCase());
}

/**
 * Get statistics about the profanity word list
 * 
 * @param config - Configuration for profanity filtering
 * @returns Statistics object
 */
export function getProfanityStats(config: ProfanityConfig = { level: 'comprehensive' }): {
  totalWords: number;
  level: string;
  source: string;
} {
  const words = getProfanityWords(config);
  return {
    totalWords: words.size,
    level: config.level,
    source: config.level === 'basic' ? 'hardcoded' : 'naughty-words'
  };
}

/**
 * Legacy function for backward compatibility
 * Returns the basic profanity word set
 */
export function getBasicProfanityWords(): Set<string> {
  return getProfanityWords({ level: 'basic' });
}

/**
 * Get comprehensive profanity words (default behavior)
 */
export function getComprehensiveProfanityWords(): Set<string> {
  return getProfanityWords({ level: 'comprehensive' });
} 