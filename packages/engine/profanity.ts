/**
 * Centralized Profanity & Slang Word Management Utilities
 *
 * Platform-agnostic utilities for managing profanity and slang words that work with provided word lists.
 * Platform adapters are responsible for loading/providing the actual word data.
 *
 * Architecture Note: This module provides utility functions only - it does NOT
 * load external data. Each platform adapter provides word data through
 * the WordDataDependencies interface.
 */

export interface ProfanityConfig {
  level: 'basic' | 'comprehensive';
  customWords?: string[];
  excludeWords?: string[];
}

export interface SlangConfig {
  includeModern?: boolean;
  includeGaming?: boolean;
  includeTech?: boolean;
  customWords?: string[];
  excludeWords?: string[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function filterWordsByLength(words: string[], minLength: number, maxLength: number): string[] {
  return words.filter(word => word.length >= minLength && word.length <= maxLength);
}

export function cleanProfanityWords(words: string[]): string[] {
  return words.filter(word => {
    // Remove words with spaces or numbers
    return !word.includes(' ') && !/\d/.test(word);
  });
}

export function cleanSlangWords(words: string[]): string[] {
  return words.filter(word => {
    // Keep only alphanumeric words without special characters
    return /^[A-Z0-9]+$/i.test(word) && word.length >= 2;
  });
}

// =============================================================================
// PROFANITY WORD MANAGEMENT
// =============================================================================

/**
 * Get profanity words based on configuration from provided word list
 * @param providedWords - Base profanity words provided by platform adapter
 * @param config - Profanity configuration options
 * @returns Set of profanity words for efficient lookup
 */
export function getProfanityWords(providedWords: string[], config: ProfanityConfig = { level: 'comprehensive' }): Set<string> {
  let words: string[];
  
  if (config.level === 'basic') {
    // Basic mode returns shorter words (3-5 letters) which tend to be more common
    words = filterWordsByLength(providedWords, 3, 5);
  } else {
    words = [...providedWords];
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

  return new Set(words.map(w => w.toUpperCase()));
}

/**
 * Get comprehensive profanity words from provided data
 * @param providedWords - Profanity words loaded by platform adapter
 * @returns Set of profanity words for efficient lookup
 */
export function getComprehensiveProfanityWords(providedWords: string[] = []): Set<string> {
  if (providedWords.length === 0) {
    console.warn('No profanity words provided to getComprehensiveProfanityWords');
    return new Set();
  }
  const cleaned = cleanProfanityWords(providedWords).map(w => w.toUpperCase());
  return new Set(cleaned);
}

/**
 * Get basic profanity words (3-5 letters) from provided data
 * @param providedWords - Profanity words loaded by platform adapter
 * @returns Array of basic profanity words
 */
export function getBasicProfanityWords(providedWords: string[] = []): string[] {
  if (providedWords.length === 0) {
    console.warn('No profanity words provided to getBasicProfanityWords');
    return [];
  }
  const cleaned = cleanProfanityWords(providedWords).map(w => w.toUpperCase());
  return filterWordsByLength(cleaned, 3, 5);
}

/**
 * Check if a word is profanity using provided word data
 * @param word - Word to check
 * @param providedWords - Profanity words loaded by platform adapter
 * @param config - Profanity configuration options (optional)
 * @returns true if word is profanity
 */
export function isProfanity(word: string, providedWords: string[] = [], config: ProfanityConfig = { level: 'comprehensive' }): boolean {
  if (providedWords.length === 0) {
    console.warn('No profanity words provided to isProfanity');
    return false;
  }
  
  const comprehensive = getComprehensiveProfanityWords(providedWords);
  
  if (config.level === 'basic') {
    const basicWords = getBasicProfanityWords(providedWords);
    return basicWords.includes(word.toUpperCase());
  }
  
  return comprehensive.has(word.toUpperCase());
}

/**
 * Get statistics about profanity words from provided data
 * @param providedWords - Profanity words loaded by platform adapter
 * @returns Statistics object
 */
export function getProfanityStats(providedWords: string[] = []): {
  total: number;
  basic: number;
  comprehensive: number;
  byLength: Record<number, number>;
} {
  if (providedWords.length === 0) {
    console.warn('No profanity words provided to getProfanityStats');
    return { total: 0, basic: 0, comprehensive: 0, byLength: {} };
  }
  
  const comprehensiveSet = getComprehensiveProfanityWords(providedWords);
  const comprehensiveWords = Array.from(comprehensiveSet);
  const basicWords = getBasicProfanityWords(providedWords);
  
  const byLength: Record<number, number> = {};
  for (const word of comprehensiveWords) {
    const length = word.length;
    byLength[length] = (byLength[length] || 0) + 1;
  }
  
  return {
    total: comprehensiveWords.length,
    basic: basicWords.length,
    comprehensive: comprehensiveWords.length,
    byLength
  };
}

// =============================================================================
// SLANG WORD MANAGEMENT
// =============================================================================

/**
 * Get slang words based on configuration from provided word list
 * @param providedWords - Base slang words provided by platform adapter
 * @param config - Slang configuration options
 * @returns Set of slang words for efficient lookup
 */
export function getSlangWords(providedWords: string[], config: SlangConfig = {}): Set<string> {
  let words = [...providedWords];

  // Add custom words if provided
  if (config.customWords) {
    words = [...words, ...config.customWords.map(w => w.toUpperCase())];
  }

  // Remove excluded words if provided
  if (config.excludeWords) {
    const excludeSet = new Set(config.excludeWords.map(w => w.toUpperCase()));
    words = words.filter(word => !excludeSet.has(word));
  }

  return new Set(words.map(w => w.toUpperCase()));
}

/**
 * Get all slang words from provided list
 * @param providedWords - Base slang words provided by platform adapter
 * @returns Array of all slang words
 */
export function getAllSlangWords(providedWords?: string[]): string[] {
  if (!providedWords) {
    console.warn('No slang words provided to getAllSlangWords');
    return [];
  }
  return providedWords.map(w => w.toUpperCase());
}

/**
 * Check if a word is slang based on provided word list
 * @param word - Word to check
 * @param providedWords - Base slang words provided by platform adapter
 * @param config - Slang configuration options
 * @returns true if word is slang
 */
export function isSlang(word: string, providedWords: string[], config: SlangConfig = {}): boolean {
  const slangSet = getSlangWords(providedWords, config);
  return slangSet.has(word.toUpperCase());
}

/**
 * Get statistics about slang words
 * @param providedWords - Base slang words provided by platform adapter
 * @returns Statistics object
 */
export function getSlangStats(providedWords: string[]): {
  total: number;
  byLength: Record<number, number>;
} {
  const byLength: Record<number, number> = {};
  for (const word of providedWords) {
    const length = word.length;
    byLength[length] = (byLength[length] || 0) + 1;
  }
  
  return {
    total: providedWords.length,
    byLength
  };
}

// =============================================================================
// PLATFORM ADAPTER HELPER FUNCTIONS
// =============================================================================

export async function loadNaughtyWordsPackage(): Promise<string[]> {
  try {
    const naughtyWords = require('naughty-words');
    if (!naughtyWords?.en || !Array.isArray(naughtyWords.en)) {
      throw new Error('Invalid naughty-words package format');
    }
    return cleanProfanityWords(naughtyWords.en);
  } catch (error) {
    console.error('Failed to load naughty-words package:', error);
    return [];
  }
}

export async function loadProfanityFromFile(filePath: string): Promise<string[]> {
  try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.words || [];
  } catch (error) {
    console.error(`Failed to load profanity from file ${filePath}:`, error);
    return [];
  }
}

export async function loadSlangFromFile(filePath: string): Promise<string[]> {
  try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.words || [];
  } catch (error) {
    console.error(`Failed to load slang from file ${filePath}:`, error);
    return [];
  }
}

export async function loadProfanityFromHTTP(url: string): Promise<string[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error(`Failed to load profanity from HTTP ${url}:`, error);
    return [];
  }
}

export async function loadSlangFromHTTP(url: string): Promise<string[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error(`Failed to load slang from HTTP ${url}:`, error);
    return [];
  }
} 