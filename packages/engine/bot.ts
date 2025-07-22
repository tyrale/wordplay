/**
 * Bot AI v0 (Greedy Strategy) - Platform-Agnostic
 * 
 * This module provides a greedy bot AI for the WordPlay game that chooses
 * the highest scoring legal moves by generating and evaluating all possible
 * word transformations (add/remove/rearrange letters).
 * 
 * DEPENDENCY INJECTION: All functions now accept dependencies as parameters
 * for platform-agnostic operation. Platform adapters provide scoring and
 * dictionary functions.
 * 
 * Key Features:
 * - Greedy strategy (chooses highest scoring moves)
 * - Move generation for add/remove/rearrange operations
 * - Key letter prioritization and bonus scoring
 * - Fair play (follows same validation rules as human players)
 * - Performance optimized for <50ms average latency
 * - Integration with scoring module and word validation
 * 
 * Note: This bot plays fairly for balanced gameplay. The validation system
 * supports rule-breaking bots (isBot: true) for advanced difficulty modes,
 * but this v0 Greedy bot uses standard validation (isBot: false).
 */

// Remove direct imports - replaced with dependency injection
// import { getScoreForMove } from './scoring';

// =============================================================================
// DEPENDENCY INTERFACES
// =============================================================================

/**
 * Dictionary validation interface for agnostic usage
 */
export interface DictionaryValidation {
  validateWord: (word: string, options?: { isBot?: boolean }) => { isValid: boolean; reason?: string; word: string };
  isValidDictionaryWord: (word: string) => boolean;
}

// Import dependency interfaces from central location
import type { ScoringDependencies, BotDependencies } from './interfaces';

// =============================================================================
// TYPES FOR BOT OPERATIONS
// =============================================================================

export interface BotOptions {
  keyLetters?: string[];
  lockedLetters?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  maxCandidates?: number;
  timeLimit?: number; // ms
}

// Import standard interfaces from central location
import type { BotMove, BotResult, MoveCandidate } from './interfaces';

// Common letter frequencies for move generation priority
const COMMON_LETTERS = 'ETAOINSHRDLCUMWFGYPBVKJXQZ'.split('');

// =============================================================================
// MOVE GENERATION FUNCTIONS (PURE - NO DEPENDENCIES)
// =============================================================================

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
export function generateRemoveMoves(currentWord: string, protectedLetters: string[] = []): MoveCandidate[] {
  const candidates: MoveCandidate[] = [];
  const word = currentWord.toUpperCase();
  const protectedSet = new Set(protectedLetters.map(l => l.toUpperCase()));
  
  // Try removing each letter
  for (let pos = 0; pos < word.length; pos++) {
    const removedLetter = word[pos];

    // Do not generate moves that remove a protected letter
    if (protectedSet.has(removedLetter)) {
      continue;
    }

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
export function generateSubstituteMoves(currentWord: string, protectedLetters: string[] = []): MoveCandidate[] {
  const candidates: MoveCandidate[] = [];
  const word = currentWord.toUpperCase();
  const protectedSet = new Set(protectedLetters.map(l => l.toUpperCase()));

  // Try substituting each position with each letter
  for (let pos = 0; pos < word.length; pos++) {
    const originalLetter = word[pos];

    // Do not generate moves that substitute a protected letter
    if (protectedSet.has(originalLetter)) {
      continue;
    }
    
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

// =============================================================================
// DEPENDENCY-INJECTED CORE FUNCTIONS (NEW ARCHITECTURE)
// =============================================================================

/**
 * Filters valid candidates using dependency-injected dictionary validation
 */
export function filterValidCandidatesWithDependencies(
  candidates: MoveCandidate[], 
  dictionaryValidation: DictionaryValidation
): MoveCandidate[] {
  return candidates.filter(candidate => {
    const validation = dictionaryValidation.validateWord(candidate.word, { isBot: false });
    return validation.isValid;
  });
}

/**
 * Scores candidates using dependency-injected scoring functions
 */
export function scoreCandidatesWithDependencies(
  candidates: MoveCandidate[], 
  currentWord: string, 
  scoringDeps: ScoringDependencies,
  keyLetters: string[] = []
): BotMove[] {
  return candidates.map(candidate => {
    // Calculate base score using dependency-injected scoring
    const score = scoringDeps.getScoreForMove(currentWord, candidate.word, keyLetters);
    
    // Calculate confidence based on score and move type
    let confidence = score * 0.2; // Base confidence from score
    
    // Boost confidence for key letter usage
    const usedKeyLetters = keyLetters.filter(keyLetter => 
      candidate.word.includes(keyLetter) && !currentWord.includes(keyLetter)
    );
    confidence += usedKeyLetters.length * 0.3;
    
    // Normalize confidence to 0-1 range
    confidence = Math.min(1, Math.max(0, confidence));
    
    return {
      word: candidate.word,
      score,
      confidence,
      reasoning: [
        ...candidate.operations,
        `Score: ${score}`,
        usedKeyLetters.length > 0 ? `Used key letters: ${usedKeyLetters.join(', ')}` : 'No key letters used'
      ]
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Generates bot move using dependency injection (NEW ARCHITECTURE)
 */
export function generateBotMoveWithDependencies(
  currentWord: string,
  dependencies: BotDependencies,
  options: BotOptions = {}
): BotResult {
  const startTime = performance.now();
  const { 
    keyLetters = [], 
    lockedLetters = [],
    maxCandidates = 200
  } = options;

  // Combine key and locked letters into a single protected set
  const protectedLetters = [...keyLetters, ...lockedLetters];

  // Generate move candidates from all categories
  const addMoves = generateAddMoves(currentWord);
  const removeMoves = generateRemoveMoves(currentWord, protectedLetters);
  const rearrangeMoves = generateRearrangeMoves(currentWord);
  const substituteMoves = generateSubstituteMoves(currentWord, protectedLetters);

  const allCandidates = [
    ...addMoves, 
    ...removeMoves, 
    ...rearrangeMoves, 
    ...substituteMoves
  ];
  const totalCandidatesGenerated = allCandidates.length;
  
  // Limit candidates for performance
  const candidatesToCheck = allCandidates.slice(0, maxCandidates);
  
  // Filter valid candidates using dependency injection
  const validCandidates = filterValidCandidatesWithDependencies(candidatesToCheck, dependencies);
  
  // Score valid candidates using dependency injection
  const scoredCandidates = scoreCandidatesWithDependencies(validCandidates, currentWord, dependencies, keyLetters);
  
  // Choose best move
  const bestMove = scoredCandidates.length > 0 ? scoredCandidates[0] : null;
  
  const processingTime = performance.now() - startTime;
  
  return {
    move: bestMove,
    candidates: scoredCandidates.slice(0, 10), // Top 10 candidates
    processingTime,
    totalCandidatesGenerated
  };
}

// =============================================================================
// LEGACY FUNCTIONS (BACKWARD COMPATIBILITY)
// =============================================================================

// Dynamic import for Node.js dictionary (avoids bundling in browser)
let nodeDictionary: typeof import('./dictionary') | null = null;
async function getNodeDictionary() {
  if (!nodeDictionary) {
    try {
      nodeDictionary = await import('./dictionary');
    } catch {
      throw new Error('Node.js dictionary not available in this environment');
    }
  }
  return nodeDictionary;
}

let nodeScoring: typeof import('./scoring') | null = null;
async function getNodeScoring() {
  if (!nodeScoring) {
    try {
      nodeScoring = await import('./scoring');
    } catch {
      throw new Error('Node.js scoring not available in this environment');
    }
  }
  return nodeScoring;
}

/**
 * Agnostic version that accepts dictionary validation functions (LEGACY)
 */
export function filterValidCandidatesAgnostic(
  candidates: MoveCandidate[], 
  dictionaryValidation: DictionaryValidation
): MoveCandidate[] {
  return filterValidCandidatesWithDependencies(candidates, dictionaryValidation);
}

/**
 * Node.js version using dynamic imports (LEGACY)
 */
export async function filterValidCandidates(candidates: MoveCandidate[]): Promise<MoveCandidate[]> {
  const dictionary = await getNodeDictionary();
  const dictionaryValidation: DictionaryValidation = {
    validateWord: dictionary.validateWord,
    isValidDictionaryWord: dictionary.isValidDictionaryWord
  };
  return filterValidCandidatesWithDependencies(candidates, dictionaryValidation);
}

/**
 * Scores candidates using legacy approach (LEGACY)
 */
export function scoreCandidates(
  candidates: MoveCandidate[], 
  currentWord: string, 
  _keyLetters: string[] = []
): BotMove[] {
  // Legacy implementation that doesn't use dependency injection
  // Note: This won't work without direct imports, but kept for API compatibility
  console.warn('scoreCandidates: Legacy function called without dependencies. Use scoreCandidatesWithDependencies instead.');
  
  return candidates.map(candidate => ({
    word: candidate.word,
    score: 1, // Default score when no scoring dependency available
    confidence: 0.5,
    reasoning: ['Legacy mode - limited scoring']
  }));
}

/**
 * Legacy agnostic version (LEGACY)
 */
export function generateBotMoveAgnostic(
  currentWord: string,
  dictionaryValidation: DictionaryValidation,
  options: BotOptions = {}
): BotResult {
  // Convert legacy interface to new dependency interface
  const dependencies: BotDependencies = {
    ...dictionaryValidation,
    // DictionaryDependencies (missing methods)
    getRandomWordByLength: () => null, // No dictionary access in legacy mode
    getWordCount: () => 0, // No dictionary access in legacy mode
    // UtilityDependencies
    getTimestamp: () => Date.now(),
    random: () => Math.random(),
    // ScoringDependencies
    getScoreForMove: () => 1, // Default scoring when no scoring dependency
    calculateScore: () => ({
      score: 1,
      totalScore: 1,
      breakdown: ['Default scoring'],
      actions: [],
      keyLetterScore: 0,
      baseScore: 1,
      keyLettersUsed: []
    })
  };
  
  return generateBotMoveWithDependencies(currentWord, dependencies, options);
}

/**
 * Node.js version using dynamic imports (LEGACY)
 */
export async function generateBotMove(
  currentWord: string, 
  options: BotOptions = {}
): Promise<BotResult> {
  const dictionary = await getNodeDictionary();
  const scoring = await getNodeScoring();
  
  const dependencies: BotDependencies = {
    validateWord: dictionary.validateWord,
    isValidDictionaryWord: dictionary.isValidDictionaryWord,
    getRandomWordByLength: dictionary.getRandomWordByLength || (() => null),
    getWordCount: dictionary.getWordCount || (() => 0),
    getTimestamp: () => Date.now(),
    random: () => Math.random(),
    getScoreForMove: scoring.getScoreForMove,
    calculateScore: scoring.calculateScore
  };
  
  return generateBotMoveWithDependencies(currentWord, dependencies, options);
}

/**
 * Simulates multiple bot turns for testing endurance and performance (LEGACY - DEPRECATED)
 * Note: This function is deprecated because it relies on async generateBotMove.
 * Use simulateBotGameWithDependencies for new code.
 */
export function simulateBotGame(
  _initialWord: string, 
  _turns: number = 100, 
  _keyLetters: string[] = []
): {
  success: boolean;
  completedTurns: number;
  totalTime: number;
  averageTimePerTurn: number;
  moves: BotMove[];
  errors: string[];
} {
  console.warn('simulateBotGame: Legacy function called. This function is deprecated due to async dependencies.');
  
  // Return a minimal result since we can't handle async in this sync function
  return {
    success: false,
    completedTurns: 0,
    totalTime: 0,
    averageTimePerTurn: 0,
    moves: [],
    errors: ['Legacy function called - use simulateBotGameWithDependencies instead']
  };
}

/**
 * Performance test for bot move generation (LEGACY - DEPRECATED)
 * Note: This function is deprecated because it relies on async generateBotMove.
 * Use performanceTestBotWithDependencies for new code.
 */
export function performanceTestBot(_iterations = 100): {
  averageTime: number;
  totalTime: number;
  successRate: number;
} {
  console.warn('performanceTestBot: Legacy function called. This function is deprecated due to async dependencies.');
  
  // Return a minimal result since we can't handle async in this sync function
  return {
    averageTime: 0,
    totalTime: 0,
    successRate: 0
  };
}

/**
 * Helper function to analyze bot decision-making (LEGACY - DEPRECATED)
 * Note: This function is deprecated because it relies on async generateBotMove.
 * Use explainBotMoveWithDependencies for new code.
 */
export function explainBotMove(
  _currentWord: string, 
  _keyLetters: string[] = [],
  _showTop = 5
): {
  analysis: string;
  topMoves: BotMove[];
  reasoning: string[];
} {
  console.warn('explainBotMove: Legacy function called. This function is deprecated due to async dependencies.');
  
  // Return a minimal result since we can't handle async in this sync function
  const reasoning = ['Legacy function called - use explainBotMoveWithDependencies instead'];
  
  return {
    analysis: reasoning.join('\n'),
    topMoves: [],
    reasoning
  };
} 