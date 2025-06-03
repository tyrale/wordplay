/**
 * Scoring Module
 * 
 * This module provides comprehensive scoring functionality for the WordPlay game,
 * including scoring for letter additions, removals, rearrangements, and key letter bonuses.
 * 
 * Core Rules:
 * - Add letter: +1 point
 * - Remove letter: +1 point  
 * - Rearrange letters: +1 point
 * - Substitution = Add + Remove = +2 points
 * - Complex combinations: Each action type scores independently
 * 
 * Examples:
 * - CAT→CATS: +1 point (add letter)
 * - CAT→COAT: +1 point (add letter)
 * - CATS→BATS: +2 points (remove C, add B)
 * - CATS→TABS: +3 points (remove C, add T, rearrange)
 */

// Types for scoring operations
export interface ScoringOptions {
  keyLetters?: string[];
}

export interface ScoringResult {
  totalScore: number;
  breakdown: {
    addLetterPoints: number;
    removeLetterPoints: number;
    rearrangePoints: number;
    keyLetterUsagePoints: number;
  };
  actions: string[];
  keyLettersUsed: string[];
}

export interface WordAnalysis {
  addedLetters: string[];
  removedLetters: string[];
  isRearranged: boolean;
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

  // Check if letters were rearranged (same letters, different order)
  // This only applies when no letters were added or removed
  const isRearranged = prev.length === curr.length && 
                      addedLetters.length === 0 && 
                      removedLetters.length === 0 && 
                      prev !== curr;

  // Find key letters used in the current word
  const keyLettersUsed = currChars.filter(char => keys.includes(char));

  return {
    addedLetters,
    removedLetters,
    isRearranged,
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
        rearrangePoints: 0,
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
  let rearrangePoints = 0;

  // Check for rearrangement (only when no adds/removes)
  if (analysis.isRearranged) {
    rearrangePoints = 1;
  }

  // Score add operations
  if (analysis.addedLetters.length > 0) {
    addLetterPoints = 1;
  }

  // Score remove operations  
  if (analysis.removedLetters.length > 0) {
    removeLetterPoints = 1;
  }

  // Check if we also have rearrangement in addition to add/remove
  // This happens when letters change AND the remaining letters are rearranged
  if (!analysis.isRearranged && (analysis.addedLetters.length > 0 || analysis.removedLetters.length > 0)) {
    // Check if remaining letters after add/remove operations are rearranged
    const prevSorted = previousWord.toUpperCase().split('').sort().join('');
    const currSorted = currentWord.toUpperCase().split('').sort().join('');
    
    // If sorted versions are different, we have add/remove
    // But we also need to check if position changes occurred beyond just add/remove
    if (prevSorted !== currSorted) {
      // We have add/remove operations, now check for additional rearrangement
      // This is complex to detect perfectly, so for now we'll use a heuristic:
      // If the words have different lengths but share some common letters in different positions
      
      const prev = previousWord.toUpperCase();
      const curr = currentWord.toUpperCase();
      
      // Simple heuristic: if lengths are same and we have adds/removes, likely substitution + rearrange
      // More complex: analyze position changes of non-added/removed letters
      if (prev.length === curr.length && analysis.addedLetters.length > 0 && analysis.removedLetters.length > 0) {
        // Same length with substitution - check if other letters moved
        // For CATS->TABS: C->T substitution, but A,S positions also changed
        const prevChars = prev.split('');
        const currChars = curr.split('');
        
        // Find letters that stayed (weren't added or removed)
        const stayedLetters = prevChars.filter(char => 
          !analysis.removedLetters.includes(char) && currChars.includes(char)
        );
        
        // Check if any stayed letters changed positions
        let hasPositionChanges = false;
        for (let i = 0; i < prevChars.length; i++) {
          const prevChar = prevChars[i];
          const currChar = currChars[i];
          
          // If this position had a letter that stayed but is now different, 
          // and the original letter moved somewhere else, it's rearrangement
          if (stayedLetters.includes(prevChar) && prevChar !== currChar && currChars.includes(prevChar)) {
            hasPositionChanges = true;
            break;
          }
        }
        
        if (hasPositionChanges) {
          rearrangePoints = 1;
        }
      }
    }
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
  if (rearrangePoints > 0) {
    actions.push('Rearranged letters');
  }
  if (keyLetterUsagePoints > 0) {
    actions.push(`Used key letter(s): ${analysis.keyLettersUsed.join(', ')}`);
  }

  const totalScore = addLetterPoints + removeLetterPoints + rearrangePoints + keyLetterUsagePoints;

  return {
    totalScore,
    breakdown: {
      addLetterPoints,
      removeLetterPoints,
      rearrangePoints,
      keyLetterUsagePoints,
    },
    actions,
    keyLettersUsed: analysis.keyLettersUsed
  };
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
  if (result.breakdown.rearrangePoints > 0) {
    parts.push(`Rearrange: +${result.breakdown.rearrangePoints}`);
  }
  if (result.breakdown.keyLetterUsagePoints > 0) {
    parts.push(`Key Usage: +${result.breakdown.keyLetterUsagePoints}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'No score';
} 