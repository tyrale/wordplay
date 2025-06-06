/**
 * Engine Exports - Single Source of Truth
 * Uses real engine with dependency injection for dictionary functions
 */

// Import browser dictionary functions
import { isValidDictionaryWordSync, initializeBrowserDictionary } from './browserDictionary';

// Import agnostic bot function
import { generateBotMoveAgnostic } from '../../packages/engine/bot';

// Import real engine functions (no Node.js dependencies)
export {
  calculateScore,
  analyzeWordChange,
  getScoreForMove,
  formatScoreBreakdown,
  isValidMove
} from '../../packages/engine/scoring';

// Import agnostic bot functions
export {
  generateAddMoves,
  generateRemoveMoves, 
  generateRearrangeMoves,
  generateSubstituteMoves,
  filterValidCandidatesAgnostic,
  scoreCandidates,
  generateBotMoveAgnostic,
  type BotOptions,
  type BotMove,
  type BotResult,
  type DictionaryValidation
} from '../../packages/engine/bot';

// Re-export engine types
export type {
  ScoringResult,
  ScoringOptions,
  WordAnalysis
} from '../../packages/engine/scoring';

// Browser-compatible validation function (same logic as real engine)
export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  word: string;
  censored?: string;
}

export function validateWord(word: string, options: any = {}): ValidationResult {
  const { isBot = false, previousWord } = options;
  
  if (!word || typeof word !== 'string') {
    return { isValid: false, reason: 'Word must be a non-empty string', word: '' };
  }
  
  const normalizedWord = word.trim().toUpperCase();
  
  if (normalizedWord.length < 3) {
    return { isValid: false, reason: 'Word must be at least 3 letters long', word: normalizedWord };
  }
  
  if (!isBot && !/^[A-Z]+$/.test(normalizedWord)) {
    return { isValid: false, reason: 'Word must contain only letters (A-Z)', word: normalizedWord };
  }
  
  if (previousWord) {
    const lengthDiff = Math.abs(normalizedWord.length - previousWord.length);
    if (!isBot && lengthDiff > 1) {
      return { isValid: false, reason: 'Word length can only change by 1 letter per turn', word: normalizedWord };
    }
  }
  
  if (!isValidDictionaryWordSync(normalizedWord)) {
    return { isValid: false, reason: 'Word not found in dictionary', word: normalizedWord };
  }
  
  return { isValid: true, reason: 'Valid word', word: normalizedWord };
}

// Browser dictionary validation object for agnostic bot
export const browserDictionaryValidation = {
  validateWord,
  isValidDictionaryWord: isValidDictionaryWordSync
};

// Simple wrapper to generate bot moves with browser dictionary
export function generateBotMove(
  currentWord: string,
  keyLetters: string[] = [],
  lockedLetters: string[] = [],
  usedWords: string[] = []
): any {
  try {
    const result = generateBotMoveAgnostic(currentWord, browserDictionaryValidation, {
      keyLetters
    });
    
    if (result.move) {
      return {
        success: true,
        word: result.move.word,
        score: result.move.score,
        confidence: result.move.confidence,
        reasoning: result.move.reasoning
      };
    } else {
      return {
        success: false,
        word: null,
        reason: 'No valid moves found',
        confidence: 0,
        consideredMoves: []
      };
    }
  } catch (error) {
    return {
      success: false,
      word: null,
      reason: 'Bot error occurred',
      confidence: 0,
      consideredMoves: []
    };
  }
}

// Browser dictionary exports
export {
  isValidDictionaryWordSync as isValidDictionaryWord,
  initializeBrowserDictionary
}; 