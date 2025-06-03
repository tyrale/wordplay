/**
 * Word Validation Service
 *
 * This module provides comprehensive word validation for the WordPlay game,
 * including ENABLE dictionary lookup, slang support, profanity filtering,
 * and various validation rules for human players vs bots.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
// Word sets for different validation scenarios
class WordDictionary {
    constructor() {
        this.enableWords = new Set();
        this.slangWords = new Set();
        this.profanityWords = new Set();
        this.initialized = false;
        this.initializeDictionary();
    }
    initializeDictionary() {
        if (this.initialized)
            return;
        try {
            // Load ENABLE word list
            const enablePath = join(__dirname, 'enable1.txt');
            const enableContent = readFileSync(enablePath, 'utf-8');
            const enableWordList = enableContent.split('\n').map(word => word.trim().toUpperCase()).filter(Boolean);
            enableWordList.forEach(word => this.enableWords.add(word));
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
        }
        catch (error) {
            console.error('Failed to initialize dictionary:', error);
            // Graceful fallback - still allow basic validation
            this.initialized = true;
        }
    }
    isInEnable(word) {
        return this.enableWords.has(word.toUpperCase());
    }
    isSlang(word) {
        return this.slangWords.has(word.toUpperCase());
    }
    isProfanity(word) {
        return this.profanityWords.has(word.toUpperCase());
    }
    censorWord(word) {
        if (!this.isProfanity(word))
            return word;
        const upperWord = word.toUpperCase();
        const firstChar = upperWord[0];
        const lastChar = upperWord[upperWord.length - 1];
        const middle = '*'.repeat(Math.max(0, upperWord.length - 2));
        return firstChar + middle + lastChar;
    }
    getWordCount() {
        return this.enableWords.size;
    }
}
// Singleton dictionary instance
const dictionary = new WordDictionary();
/**
 * Validates a word according to game rules
 */
export function validateWord(word, options = {}) {
    const { isBot = false, allowSlang = true, checkLength = true, previousWord } = options;
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
    // Length change validation (max ±1 letter difference between turns)
    if (previousWord && checkLength) {
        const lengthDiff = Math.abs(normalizedWord.length - previousWord.length);
        if (lengthDiff > 1) {
            return {
                isValid: false,
                reason: 'Word length can only change by ±1 letter per turn',
                word: normalizedWord
            };
        }
    }
    // NOTE: Profanity is NO LONGER validated here - profane words are valid for play
    // Profanity detection is only used for vanity display purposes
    // Dictionary lookup
    const inEnable = dictionary.isInEnable(normalizedWord);
    const isSlangWord = dictionary.isSlang(normalizedWord);
    // Check if word is in dictionary
    if (inEnable) {
        return {
            isValid: true,
            word: normalizedWord
        };
    }
    // Check slang words if allowed
    if (allowSlang && isSlangWord) {
        return {
            isValid: true,
            word: normalizedWord
        };
    }
    // Word not found in any dictionary
    return {
        isValid: false,
        reason: 'Word not found in dictionary',
        word: normalizedWord
    };
}
/**
 * Checks if a word exists in the ENABLE dictionary
 */
export function isValidDictionaryWord(word) {
    return dictionary.isInEnable(word.trim().toUpperCase());
}
/**
 * Checks if a word is considered slang
 */
export function isSlangWord(word) {
    return dictionary.isSlang(word.trim().toUpperCase());
}
/**
 * Checks if a word contains profanity
 */
export function containsProfanity(word) {
    return dictionary.isProfanity(word.trim().toUpperCase());
}
/**
 * Gets the total number of words in the dictionary
 */
export function getDictionarySize() {
    return dictionary.getWordCount();
}
/**
 * Performance test helper
 */
export function performanceTest(iterations = 1000) {
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
export function getVanityDisplayWord(word, options) {
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
    }
    else {
        return normalizedWord;
    }
}
/**
 * Transforms a profane word into symbols
 * Uses a variety of symbols to make it look like censoring
 */
function transformToSymbols(word) {
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
export function shouldUnlockVanityToggle(word) {
    return dictionary.isProfanity(word.trim().toUpperCase());
}
/**
 * Helper function for game state management
 * Checks if the current word composition is profane (for real-time display)
 */
export function isCurrentWordProfane(word) {
    return dictionary.isProfanity(word.trim().toUpperCase());
}
// =============================================================================
// BACKWARD COMPATIBILITY & LEGACY FUNCTIONS
// =============================================================================
/**
 * @deprecated Use getVanityDisplayWord instead
 * Returns a censored version of profane words (legacy function)
 */
export function censorProfanity(word) {
    return dictionary.censorWord(word);
}
