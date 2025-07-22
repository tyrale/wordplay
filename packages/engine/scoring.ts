/**
 * Scoring Module
 * 
 * This module provides comprehensive scoring functionality for the WordPlay game,
 * including scoring for letter additions, removals, moves, and key letter bonuses.
 * 
 * Core Rules:
 * - Add letter: +1 point
 * - Remove letter: +1 point  
 * - Move letters: +1 point (only when stayed letters change their relative sequence)
 * - Substitution = Add + Remove = +2 points
 * - Complex combinations: Each action type scores independently
 * 
 * Examples:
 * - CAT→CATS: +1 point (add letter, natural shift)
 * - CAT→COAT: +1 point (add letter, natural shift)
 * - CATS→BATS: +2 points (remove C, add B)
 * - NAG→LANG: +2 points (add L, move N-A-G to A-N-G)
 * - NARD→YARN: +3 points (remove D, add Y, move N-A-R to A-R-N)
 */

// Import interfaces for dependency injection support
import type { ScoringResult, WordAnalysis } from './interfaces';

// Export types for external usage
export type { ScoringResult, WordAnalysis };

// Types for scoring operations
export interface ScoringOptions {
  keyLetters?: string[];
}

// Legacy types for backward compatibility
export interface ScoringBreakdown {
  addLetterPoints: number;
  removeLetterPoints: number;
  movePoints: number;
  keyLetterUsagePoints: number;
}

export interface LegacyScoringResult {
  totalScore: number;
  breakdown: ScoringBreakdown;
  actions: string[];
  keyLettersUsed: string[];
}

/**
 * Analyzes the difference between two words to determine what actions were performed
 */
export function analyzeWordChange(previousWord: string, currentWord: string, keyLetters: string[] = []): WordAnalysis {
  // Normalize inputs
  const prev = previousWord.toUpperCase().trim();
  const curr = currentWord.toUpperCase().trim();
  const keys = keyLetters.map(k => k.toUpperCase());

  // Convert words to character arrays for analysis
  const prevChars = prev.split('');
  const currChars = curr.split('');

  // Find added and removed letters
  const addedLetters: string[] = [];
  const removedLetters: string[] = [];

  // Create frequency maps
  const prevFreq = new Map<string, number>();
  const currFreq = new Map<string, number>();

  prevChars.forEach(char => {
    prevFreq.set(char, (prevFreq.get(char) || 0) + 1);
  });

  currChars.forEach(char => {
    currFreq.set(char, (currFreq.get(char) || 0) + 1);
  });

  // Find differences in character frequencies
  const allChars = new Set([...prevFreq.keys(), ...currFreq.keys()]);
  
  allChars.forEach(char => {
    const prevCount = prevFreq.get(char) || 0;
    const currCount = currFreq.get(char) || 0;
    const diff = currCount - prevCount;

    if (diff > 0) {
      // Letter was added
      for (let i = 0; i < diff; i++) {
        addedLetters.push(char);
      }
    } else if (diff < 0) {
      // Letter was removed
      for (let i = 0; i < Math.abs(diff); i++) {
        removedLetters.push(char);
      }
    }
  });

  // Check if letters were moved (stayed letters changed their relative sequence)
  // This applies to any case where letters that exist in both words have changed order
  let isMoved = false;
  
  if (prev !== curr) {
    // For natural shift detection, check if one word is a subsequence of the other
    // If so, it's a natural shift and not a move
    let isNaturalShift = false;
    
    // Case 1: Only additions - is the old word a subsequence of the new?
    if (addedLetters.length > 0 && removedLetters.length === 0) {
      isNaturalShift = isSubsequence(prev, curr);
    }
    // Case 2: Only removals - is the new word a subsequence of the old?
    else if (removedLetters.length > 0 && addedLetters.length === 0) {
      isNaturalShift = isSubsequence(curr, prev);
    }
    // Case 3: Both additions and removals - check for natural shift patterns
    else if (addedLetters.length > 0 && removedLetters.length > 0) {
      // Find the longest common subsequence
      const lcs = findLongestCommonSubsequence(prev, curr);
      
      // Natural shift occurs when the LCS is contiguous in both words
      // and represents the majority of both words
      if (lcs.length >= 3) { // Need at least 3 letters for meaningful sequence
        // Check if the LCS appears as a contiguous substring in both words
        const prevContainsLcsContiguous = prev.includes(lcs);
        const currContainsLcsContiguous = curr.includes(lcs);
        
        if (prevContainsLcsContiguous && currContainsLcsContiguous) {
          // Additional check: the LCS should represent most of the word content
          const minWordLength = Math.min(prev.length, curr.length);
          const lcsRatio = lcs.length / minWordLength;
          
          // If the LCS represents 75% or more of the shorter word, it's likely a natural shift
          isNaturalShift = lcsRatio >= 0.75;
        }
      }
    }
    
    // If it's not a natural shift, check for actual moves
    if (!isNaturalShift) {
      // Find letters that stayed (exist in both words)
      const stayedLetters = findLettersThatStayed(prev, curr);
      
      if (stayedLetters.length >= 2) {
        // Extract the sequence of stayed letters from both words
        const prevStayedSeq = extractStayedSequence(prev, stayedLetters);
        const currStayedSeq = extractStayedSequence(curr, stayedLetters);
        
        // If the sequences are different, letters were moved
        isMoved = prevStayedSeq !== currStayedSeq;
      }
    }
  }

  // Find key letters used in the current word
  const keyLettersUsed = currChars.filter(char => keys.includes(char));

  return {
    addedLetters,
    removedLetters,
    isMoved,
    keyLettersUsed,
  };
}

/**
 * Calculates the score for a word change based on game rules
 */
export function calculateScore(
  previousWord: string, 
  currentWord: string, 
  options: ScoringOptions = {}
): ScoringResult {
  const { keyLetters = [] } = options;

  // Handle edge cases
  if (!previousWord || !currentWord) {
    return {
      totalScore: 0,
      breakdown: {
        addLetterPoints: 0,
        removeLetterPoints: 0,
        movePoints: 0,
        keyLetterUsagePoints: 0,
      },
      actions: [],
      keyLettersUsed: []
    };
  }

  // Analyze the word change
  const analysis = analyzeWordChange(previousWord, currentWord, keyLetters);
  
  // Score calculation based on core rules
  let addLetterPoints = 0;
  let removeLetterPoints = 0;
  let movePoints = 0;

  // Score add operations
  if (analysis.addedLetters.length > 0) {
    addLetterPoints = 1;
  }

  // Score remove operations  
  if (analysis.removedLetters.length > 0) {
    removeLetterPoints = 1;
  }

  // Score move operations - award points if stayed letters changed their sequence
  if (analysis.isMoved) {
    movePoints = 1;
  }
  
  // Key letter usage: +1 if any key letter is used
  const keyLetterUsagePoints = analysis.keyLettersUsed.length > 0 ? 1 : 0;

  // Build actions list for transparency
  const actions: string[] = [];
  
  if (addLetterPoints > 0) {
    actions.push(`Added letter(s): ${analysis.addedLetters.join(', ')}`);
  }
  if (removeLetterPoints > 0) {
    actions.push(`Removed letter(s): ${analysis.removedLetters.join(', ')}`);
  }
  if (movePoints > 0) {
    actions.push('Moved letters');
  }
  if (keyLetterUsagePoints > 0) {
    actions.push(`Used key letter(s): ${analysis.keyLettersUsed.join(', ')}`);
  }

  const totalScore = addLetterPoints + removeLetterPoints + movePoints + keyLetterUsagePoints;

  return {
    score: totalScore,
    totalScore,
    breakdown: actions,
    actions: actions.map(action => ({
      type: action.includes('Added') ? 'add' : 
            action.includes('Removed') ? 'remove' :
            action.includes('Moved') ? 'rearrange' :
            action.includes('key letter') ? 'key-letter' : 'substitute',
      score: 1
    })),
    keyLetterScore: keyLetterUsagePoints,
    baseScore: addLetterPoints + removeLetterPoints + movePoints,
    keyLettersUsed: analysis.keyLettersUsed
  };
}

/**
 * Checks if a string is a subsequence of another string.
 * e.g., isSubsequence("ACE", "ABCDE") -> true
 */
function isSubsequence(s1: string, s2: string): boolean {
  let i = 0;
  let j = 0;
  while (i < s1.length && j < s2.length) {
    if (s1[i] === s2[j]) {
      i++;
    }
    j++;
  }
  return i === s1.length;
}

/**
 * Finds the letters that are common between two words, respecting counts.
 * Example: findLettersThatStayed("APPLE", "PALE") -> ['P', 'L', 'E']
 */
function findLettersThatStayed(word1: string, word2: string): string[] {
  const freq1 = new Map<string, number>();
  for (const char of word1) {
    freq1.set(char, (freq1.get(char) || 0) + 1);
  }

  const freq2 = new Map<string, number>();
  for (const char of word2) {
    freq2.set(char, (freq2.get(char) || 0) + 1);
  }

  const stayed: string[] = [];
  for (const [char, count1] of freq1) {
    const count2 = freq2.get(char) || 0;
    const stayedCount = Math.min(count1, count2);
    for (let i = 0; i < stayedCount; i++) {
      stayed.push(char);
    }
  }
  return stayed;
}

/**
 * Extracts the subsequence of specified letters from a word, preserving their order.
 * Example: extractStayedSequence("NAG", ['N', 'A', 'G']) -> "NAG"
 * Example: extractStayedSequence("LANG", ['N', 'A', 'G']) -> "ANG"
 */
function extractStayedSequence(word: string, stayedLetters: string[]): string {
  const stayedFreq = new Map<string, number>();
  stayedLetters.forEach(char => stayedFreq.set(char, (stayedFreq.get(char) || 0) + 1));

  const sequence: string[] = [];
  const usedCount = new Map<string, number>();

  for (const char of word) {
    const max = stayedFreq.get(char) || 0;
    if (max > 0) {
      const used = usedCount.get(char) || 0;
      if (used < max) {
        sequence.push(char);
        usedCount.set(char, used + 1);
      }
    }
  }
  return sequence.join('');
}

/**
 * Finds the longest common subsequence between two strings.
 * Example: findLongestCommonSubsequence("REAR", "EARL") -> "EAR"
 */
function findLongestCommonSubsequence(str1: string, str2: string): string {
  const m = str1.length;
  const n = str2.length;
  
  // Create a 2D array to store lengths of common subsequences
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill the dp table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Reconstruct the LCS
  let lcs = '';
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (str1[i - 1] === str2[j - 1]) {
      lcs = str1[i - 1] + lcs;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

/**
 * Extracts a subsequence from a word, preserving order.
 * Example: extractSubsequence("REAR", "EAR") -> "EAR"
 */
function extractSubsequence(word: string, subsequence: string): string {
  let subIndex = 0;
  let result = '';
  
  for (const char of word) {
    if (subIndex < subsequence.length && char === subsequence[subIndex]) {
      result += char;
      subIndex++;
    }
  }
  
  return result;
}

/**
 * Convenience function for quick scoring without detailed breakdown
 */
export function getScoreForMove(
  previousWord: string,
  currentWord: string,
  keyLetters: string[] = []
): number {
  const result = calculateScore(previousWord, currentWord, { keyLetters });
  return result.totalScore;
}

/**
 * Validates that a scoring result makes sense given the inputs
 */
export function validateScoringResult(result: ScoringResult): boolean {
  // Basic validation: total should equal sum of breakdown
  const expectedTotal = Object.values(result.breakdown).reduce((sum, points) => sum + points, 0);
  
  if (result.totalScore !== expectedTotal) {
    return false;
  }

  // Score should never be negative
  if (result.totalScore < 0) {
    return false;
  }

  // Individual breakdown items should not be negative
  for (const points of Object.values(result.breakdown)) {
    if (points < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Performance test helper for scoring operations
 */
export function performanceTestScoring(iterations = 1000): { averageTime: number; totalTime: number } {
  const testMoves = [
    { prev: 'CAT', curr: 'CATS', keys: [] },
    { prev: 'CAT', curr: 'COAT', keys: [] },
    { prev: 'CAT', curr: 'BAT', keys: ['B'] },
    { prev: 'HELLO', curr: 'WORLD', keys: ['W', 'R'] },
    { prev: 'GAME', curr: 'GAMES', keys: ['S'] }
  ];
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const move = testMoves[i % testMoves.length];
    calculateScore(move.prev, move.curr, { keyLetters: move.keys });
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
 * Helper function to normalize scores for display
 */
export function formatScoreBreakdown(result: ScoringResult): string {
  const parts: string[] = [];
  
  if (result.breakdown.addLetterPoints > 0) {
    parts.push(`Add: +${result.breakdown.addLetterPoints}`);
  }
  if (result.breakdown.removeLetterPoints > 0) {
    parts.push(`Remove: +${result.breakdown.removeLetterPoints}`);
  }
  if (result.breakdown.movePoints > 0) {
    parts.push(`Move: +${result.breakdown.movePoints}`);
  }
  if (result.breakdown.keyLetterUsagePoints > 0) {
    parts.push(`Key Usage: +${result.breakdown.keyLetterUsagePoints}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'No score';
}

/**
 * Validates that a word change follows the game rules:
 * - Can only add ONE letter per turn
 * - Can only remove ONE letter per turn  
 * - Can move letters (no limit)
 * - Each action type can only be used once per turn
 */
export function isValidMove(previousWord: string, currentWord: string): boolean {
  const analysis = analyzeWordChange(previousWord, currentWord);
  
  // Rule: Can only add ONE letter maximum per turn
  if (analysis.addedLetters.length > 1) {
    return false;
  }
  
  // Rule: Can only remove ONE letter maximum per turn
  if (analysis.removedLetters.length > 1) {
    return false;
  }
  
  // Moving letters is always allowed (no limits)
  // Combination of one add + one remove + move is allowed
  
  return true;
} 

// =============================================================================
// DEPENDENCY INJECTION WRAPPER FUNCTIONS
// =============================================================================

/**
 * Calculate score with dependency injection for adapters
 * @param fromWord - Starting word
 * @param toWord - Ending word
 * @param options - Scoring options including keyLetters
 * @returns Scoring result compatible with new interface
 */
export function calculateScoreWithDependencies(
  fromWord: string,
  toWord: string,
  options: { keyLetters?: string[] } = {}
): ScoringResult {
  const legacyResult = calculateScore(fromWord, toWord, options);
  
  // Convert legacy result to new interface format
  return {
    score: legacyResult.totalScore,
    totalScore: legacyResult.totalScore,
    breakdown: legacyResult.actions,
    actions: legacyResult.actions.map(action => ({
      type: action.includes('Added') ? 'add' : 
            action.includes('Removed') ? 'remove' :
            action.includes('Moved') ? 'rearrange' :
            action.includes('key letter') ? 'key-letter' : 'substitute',
      score: 1
    })),
    keyLetterScore: legacyResult.breakdown.keyLetterUsagePoints,
    baseScore: legacyResult.totalScore - legacyResult.breakdown.keyLetterUsagePoints
  };
}

/**
 * Get score for move with dependency injection for adapters
 * @param fromWord - Starting word
 * @param toWord - Ending word
 * @param keyLetters - Available key letters
 * @returns Simple numerical score
 */
export function getScoreForMoveWithDependencies(
  fromWord: string,
  toWord: string,
  keyLetters: string[] = []
): number {
  const result = calculateScore(fromWord, toWord, { keyLetters });
  return result.totalScore;
}

// =============================================================================
// CORE SCORING IMPLEMENTATION
// ============================================================================= 