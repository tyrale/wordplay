/**
 * Bot AI v0 (Greedy Strategy)
 * 
 * This module provides a greedy bot AI for the WordPlay game that chooses
 * the highest scoring legal moves by generating and evaluating all possible
 * word transformations (add/remove/rearrange letters).
 * 
 * Key Features:
 * - Greedy strategy (chooses highest scoring moves)
 * - Move generation for add/remove/rearrange operations
 * - Key letter prioritization and bonus scoring
 * - Bot privileges (can bypass validation rules)
 * - Performance optimized for <50ms average latency
 * - Integration with scoring module and word validation
 */

import { getScoreForMove } from './scoring';
import { validateWord, isValidDictionaryWord } from './dictionary';

// Types for bot operations
export interface BotOptions {
  keyLetters?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  maxCandidates?: number;
  timeLimit?: number; // ms
}

export interface BotMove {
  word: string;
  score: number;
  confidence: number;
  reasoning: string[];
}

export interface BotResult {
  move: BotMove | null;
  candidates: BotMove[];
  processingTime: number;
  totalCandidatesGenerated: number;
}

export interface MoveCandidate {
  word: string;
  type: 'add' | 'remove' | 'rearrange' | 'substitute';
  operations: string[];
}

// Common letter frequencies for move generation priority
const COMMON_LETTERS = 'ETAOINSHRDLCUMWFGYPBVKJXQZ'.split('');

/**
 * Generates all possible single letter additions to a word
 */
export function generateAddMoves(currentWord: string): MoveCandidate[] {
  const candidates: MoveCandidate[] = [];
  const word = currentWord.toUpperCase();
  
  // Try adding each letter at each position
  for (let pos = 0; pos <= word.length; pos++) {
    for (const letter of COMMON_LETTERS) {
      const newWord = word.slice(0, pos) + letter + word.slice(pos);
      
      candidates.push({
        word: newWord,
        type: 'add',
        operations: [`Add ${letter} at position ${pos}`]
      });
    }
  }
  
  return candidates;
}

/**
 * Generates all possible single letter removals from a word
 */
export function generateRemoveMoves(currentWord: string): MoveCandidate[] {
  const candidates: MoveCandidate[] = [];
  const word = currentWord.toUpperCase();
  
  // Try removing each letter
  for (let pos = 0; pos < word.length; pos++) {
    const removedLetter = word[pos];
    const newWord = word.slice(0, pos) + word.slice(pos + 1);
    
    candidates.push({
      word: newWord,
      type: 'remove',
      operations: [`Remove ${removedLetter} from position ${pos}`]
    });
  }
  
  return candidates;
}

/**
 * Generates rearrangement moves by shuffling letters
 */
export function generateRearrangeMoves(currentWord: string, maxVariations = 50): MoveCandidate[] {
  const candidates: MoveCandidate[] = [];
  const word = currentWord.toUpperCase();
  const letters = word.split('');
  const generated = new Set<string>();
  generated.add(word); // Don't include original word
  
  // Generate permutations using various strategies
  for (let i = 0; i < maxVariations && generated.size < maxVariations + 1; i++) {
    const shuffled = [...letters];
    
    // Different shuffling strategies
    if (i < 10) {
      // Simple adjacent swaps
      const pos1 = Math.floor(Math.random() * shuffled.length);
      const pos2 = (pos1 + 1) % shuffled.length;
      [shuffled[pos1], shuffled[pos2]] = [shuffled[pos2], shuffled[pos1]];
    } else if (i < 20) {
      // Random swaps
      const pos1 = Math.floor(Math.random() * shuffled.length);
      const pos2 = Math.floor(Math.random() * shuffled.length);
      [shuffled[pos1], shuffled[pos2]] = [shuffled[pos2], shuffled[pos1]];
    } else {
      // Full shuffle
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
      }
    }
    
    const newWord = shuffled.join('');
    if (!generated.has(newWord)) {
      generated.add(newWord);
      candidates.push({
        word: newWord,
        type: 'rearrange',
        operations: [`Rearrange letters: ${word} → ${newWord}`]
      });
    }
  }
  
  return candidates;
}

/**
 * Generates substitution moves (remove one letter, add another)
 */
export function generateSubstituteMoves(currentWord: string): MoveCandidate[] {
  const candidates: MoveCandidate[] = [];
  const word = currentWord.toUpperCase();
  
  // Try substituting each position with each letter
  for (let pos = 0; pos < word.length; pos++) {
    const originalLetter = word[pos];
    
    for (const newLetter of COMMON_LETTERS) {
      if (newLetter !== originalLetter) {
        const newWord = word.slice(0, pos) + newLetter + word.slice(pos + 1);
        
        candidates.push({
          word: newWord,
          type: 'substitute',
          operations: [`Substitute ${originalLetter} → ${newLetter} at position ${pos}`]
        });
      }
    }
  }
  
  return candidates;
}

/**
 * Filters candidates to only include valid dictionary words
 */
export function filterValidCandidates(candidates: MoveCandidate[]): MoveCandidate[] {
  return candidates.filter(candidate => {
    // Bots can bypass validation, but still prefer real words when possible
    const validation = validateWord(candidate.word, { isBot: true });
    return validation.isValid && isValidDictionaryWord(candidate.word);
  });
}

/**
 * Scores and ranks move candidates
 */
export function scoreCandidates(
  candidates: MoveCandidate[], 
  currentWord: string, 
  keyLetters: string[] = []
): BotMove[] {
  const scoredMoves: BotMove[] = [];
  
  for (const candidate of candidates) {
    const score = getScoreForMove(currentWord, candidate.word, keyLetters);
    
    // Calculate confidence based on multiple factors
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for higher scores
    confidence += Math.min(score * 0.2, 0.3);
    
    // Bonus confidence for using key letters
    const hasKeyLetters = keyLetters.some(key => 
      candidate.word.includes(key.toUpperCase())
    );
    if (hasKeyLetters) {
      confidence += 0.2;
    }
    
    // Bonus confidence for common word patterns
    if (candidate.word.length >= 4 && candidate.word.length <= 6) {
      confidence += 0.1;
    }
    
    // Ensure confidence stays in bounds
    confidence = Math.max(0, Math.min(1, confidence));
    
    scoredMoves.push({
      word: candidate.word,
      score,
      confidence,
      reasoning: [
        `${candidate.type} operation: ${candidate.operations.join(', ')}`,
        `Score: ${score} points`,
        ...(hasKeyLetters ? ['Uses key letters'] : []),
        `Confidence: ${Math.round(confidence * 100)}%`
      ]
    });
  }
  
  // Sort by score descending, then by confidence descending
  return scoredMoves.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.confidence - a.confidence;
  });
}

/**
 * Main bot AI function - generates the best move using greedy strategy
 */
export function generateBotMove(
  currentWord: string, 
  options: BotOptions = {}
): BotResult {
  const startTime = performance.now();
  const {
    keyLetters = [],
    maxCandidates = 1000,
    timeLimit = 100 // Allow more time for complex analysis
  } = options;
  
  let allCandidates: MoveCandidate[] = [];
  
  try {
    // Generate all possible moves
    const addMoves = generateAddMoves(currentWord);
    const removeMoves = generateRemoveMoves(currentWord);
    const rearrangeMoves = generateRearrangeMoves(currentWord);
    const substituteMoves = generateSubstituteMoves(currentWord);
    
    allCandidates = [
      ...addMoves,
      ...removeMoves, 
      ...rearrangeMoves,
      ...substituteMoves
    ];
    
    // Check time limit
    if (performance.now() - startTime > timeLimit) {
      return {
        move: null,
        candidates: [],
        processingTime: performance.now() - startTime,
        totalCandidatesGenerated: allCandidates.length
      };
    }
    
    // Filter to valid words only
    const validCandidates = filterValidCandidates(allCandidates);
    
    // Limit candidates for performance
    const limitedCandidates = validCandidates.slice(0, maxCandidates);
    
    // Score and rank candidates
    const scoredMoves = scoreCandidates(limitedCandidates, currentWord, keyLetters);
    
    // Select best move (greedy strategy)
    const bestMove = scoredMoves.length > 0 ? scoredMoves[0] : null;
    
    const processingTime = performance.now() - startTime;
    
    return {
      move: bestMove,
      candidates: scoredMoves.slice(0, 10), // Return top 10 for analysis
      processingTime,
      totalCandidatesGenerated: allCandidates.length
    };
    
  } catch (error) {
    console.error('Bot move generation failed:', error);
    
    return {
      move: null,
      candidates: [],
      processingTime: performance.now() - startTime,
      totalCandidatesGenerated: allCandidates.length
    };
  }
}

/**
 * Simulates multiple bot turns for testing endurance and performance
 */
export function simulateBotGame(
  initialWord: string, 
  turns: number = 100, 
  keyLetters: string[] = []
): {
  success: boolean;
  completedTurns: number;
  totalTime: number;
  averageTimePerTurn: number;
  moves: BotMove[];
  errors: string[];
} {
  const startTime = performance.now();
  const moves: BotMove[] = [];
  const errors: string[] = [];
  let currentWord = initialWord;
  let completedTurns = 0;
  
  try {
    for (let turn = 0; turn < turns; turn++) {
      const result = generateBotMove(currentWord, { keyLetters });
      
      if (!result.move) {
        errors.push(`Turn ${turn + 1}: No valid move found`);
        break;
      }
      
      moves.push(result.move);
      currentWord = result.move.word;
      completedTurns++;
      
      // Prevent infinite loops or stuck states
      if (result.move.score === 0 && turn > 10) {
        // Try to break out of zero-score loops
        const fallbackResult = generateBotMove(currentWord, { 
          keyLetters,
          maxCandidates: 100 
        });
        
        if (fallbackResult.move && fallbackResult.move.score > 0) {
          moves.push(fallbackResult.move);
          currentWord = fallbackResult.move.word;
        }
      }
    }
    
    const totalTime = performance.now() - startTime;
    const averageTimePerTurn = completedTurns > 0 ? totalTime / completedTurns : 0;
    
    return {
      success: completedTurns === turns,
      completedTurns,
      totalTime,
      averageTimePerTurn,
      moves,
      errors
    };
    
  } catch (error) {
    errors.push(`Simulation failed: ${error}`);
    const totalTime = performance.now() - startTime;
    
    return {
      success: false,
      completedTurns,
      totalTime,
      averageTimePerTurn: completedTurns > 0 ? totalTime / completedTurns : 0,
      moves,
      errors
    };
  }
}

/**
 * Performance test for bot move generation
 */
export function performanceTestBot(iterations = 100): {
  averageTime: number;
  totalTime: number;
  successRate: number;
} {
  const testWords = ['CAT', 'HELLO', 'WORLD', 'GAME', 'PLAY', 'WORD', 'TEST'];
  let totalTime = 0;
  let successes = 0;
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const testWord = testWords[i % testWords.length];
    const result = generateBotMove(testWord, { maxCandidates: 100 });
    
    totalTime += result.processingTime;
    if (result.move) successes++;
  }
  
  return {
    averageTime: totalTime / iterations,
    totalTime: performance.now() - startTime,
    successRate: successes / iterations
  };
}

/**
 * Helper function to analyze bot decision-making
 */
export function explainBotMove(
  currentWord: string, 
  keyLetters: string[] = [],
  showTop = 5
): {
  analysis: string;
  topMoves: BotMove[];
  reasoning: string[];
} {
  const result = generateBotMove(currentWord, { keyLetters });
  
  const reasoning = [
    `Analyzed ${result.totalCandidatesGenerated} possible moves`,
    `Processing completed in ${result.processingTime.toFixed(2)}ms`,
    `Found ${result.candidates.length} valid candidates`
  ];
  
  if (result.move) {
    reasoning.push(`Selected move: ${currentWord} → ${result.move.word} (${result.move.score} points)`);
    reasoning.push(...result.move.reasoning);
  } else {
    reasoning.push('No valid moves found');
  }
  
  const analysis = reasoning.join('\n');
  const topMoves = result.candidates.slice(0, showTop);
  
  return {
    analysis,
    topMoves,
    reasoning
  };
} 