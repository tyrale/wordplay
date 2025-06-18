/**
 * Challenge Engine - Daily Word Transformation Puzzles
 * 
 * Platform-agnostic challenge system that generates daily word puzzles
 * where players transform a start word into a target word following
 * standard game rules. Provides consistent challenges worldwide using
 * deterministic daily seeds.
 */

import type { 
  DictionaryEngine, 
  UtilityDependencies
} from './interfaces';
import { analyzeWordChange, type WordAnalysis } from './scoring';

// =============================================================================
// CHALLENGE INTERFACES
// =============================================================================

export interface ChallengeState {
  date: string; // YYYY-MM-DD
  startWord: string;
  targetWord: string;
  currentWord: string;
  wordSequence: string[];
  stepCount: number;
  completed: boolean;
  failed: boolean;
  failedAtWord?: string; // For red X sharing format
}

export interface ChallengeResult {
  success: boolean;
  stepCount: number;
  sharingPattern: string[];
  dailyId: string; // e.g., "Challenge #123"
}

export interface ChallengeDependencies {
  dictionary: DictionaryEngine;
  utilities: UtilityDependencies;
  loadState: (date: string) => Promise<ChallengeState | null>;
  saveState: (state: ChallengeState) => Promise<void>;
}

export interface ChallengeEngine {
  // Initialization
  initialize(): Promise<void>;
  
  // Daily challenge management
  getDailyChallengeState(date?: string): Promise<ChallengeState>;
  startDailyChallenge(date?: string): Promise<ChallengeState>;
  
  // Game progression
  submitWord(word: string, currentState: ChallengeState): Promise<{
    newState: ChallengeState;
    isValid: boolean;
    isComplete: boolean;
    error?: string;
  }>;
  
  // Forfeit/give up
  forfeitChallenge(currentState: ChallengeState): Promise<ChallengeState>;
  
  // Sharing system
  generateSharingPattern(wordSequence: string[]): string[];
  generateSharingText(state: ChallengeState): string;
  
  // Utilities
  isValidMove(fromWord: string, toWord: string): boolean;
  
  // Debug
  resetDailyChallenge(date?: string): Promise<void>;
  generateRandomChallenge(): Promise<ChallengeState>;
}

// =============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// =============================================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Simple LCG (Linear Congruential Generator)
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// =============================================================================
// CHALLENGE ENGINE IMPLEMENTATION
// =============================================================================

export function createChallengeEngine(dependencies: ChallengeDependencies): ChallengeEngine {
  const { dictionary, utilities, loadState, saveState } = dependencies;

  /**
   * Initialize the challenge engine
   */
  async function initialize(): Promise<void> {
    // Ensure dictionary is initialized
    if (!dictionary.getDictionaryInfo().isLoaded) {
      throw new Error('Dictionary must be initialized before challenge engine');
    }
  }

  /**
   * Generate a deterministic daily seed from date string
   */
  function generateDailySeed(dateString: string): number {
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate start and target words for a given date
   */
  function generateDailyWords(dateString: string): { startWord: string; targetWord: string } {
    const seed = generateDailySeed(dateString);
    const rng = new SeededRandom(seed);
    
    // Get a random start word (4-6 letters for balanced gameplay)
    const startLengths = [4, 5, 6];
    const startLength = startLengths[rng.nextInt(0, startLengths.length - 1)];
    
    // For testing with mock dictionary, use different selection method
    let startWord: string | null = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Try to get a valid start word
    while (!startWord && attempts < maxAttempts) {
      startWord = dictionary.getRandomWordByLength(startLength);
      attempts++;
      
      // Use the RNG to vary selection even with deterministic mock
      if (startWord && rng.next() < 0.5 && attempts < maxAttempts) {
        startWord = null; // Skip this word sometimes to get variation
      }
    }
    
    if (!startWord) {
      // Fallback words if random generation fails
      const fallbacks = ['GAME', 'WORD', 'PLAY', 'TIME', 'MAKE'];
      startWord = fallbacks[rng.nextInt(0, fallbacks.length - 1)];
    }
    
    // Generate target word within ±1 length
    const targetLength = startWord.length + rng.nextInt(-1, 1);
    const minTargetLength = Math.max(3, targetLength);
    const maxTargetLength = Math.min(8, targetLength);
    const finalTargetLength = Math.max(minTargetLength, Math.min(maxTargetLength, targetLength));
    
    let targetWord: string | null = null;
    attempts = 0;
    
    // Try to get a valid target word different from start word
    while ((!targetWord || targetWord === startWord.toUpperCase()) && attempts < maxAttempts) {
      targetWord = dictionary.getRandomWordByLength(finalTargetLength);
      attempts++;
      
      // Use the RNG to vary selection
      if (targetWord && targetWord !== startWord.toUpperCase() && rng.next() < 0.3 && attempts < maxAttempts) {
        targetWord = null; // Skip this word sometimes to get variation
      }
    }
    
    if (!targetWord || targetWord === startWord.toUpperCase()) {
      // Fallback logic - use different length or different word
      const fallbacks = finalTargetLength === 4 ? ['CATS', 'DOGS', 'TIME'] : 
                       finalTargetLength === 5 ? ['GAMES', 'WORDS', 'PLAYS'] :
                       ['GAMING', 'PLAYED', 'WORLDS'];
      targetWord = fallbacks[rng.nextInt(0, fallbacks.length - 1)];
    }

    return {
      startWord: startWord.toUpperCase(),
      targetWord: targetWord.toUpperCase()
    };
  }

  /**
   * Get current date string in YYYY-MM-DD format
   */
  function getCurrentDateString(): string {
    const now = new Date();
    return now.getFullYear() + '-' + 
           String(now.getMonth() + 1).padStart(2, '0') + '-' + 
           String(now.getDate()).padStart(2, '0');
  }

  /**
   * Get daily challenge state, creating new if needed
   */
  async function getDailyChallengeState(date?: string): Promise<ChallengeState> {
    const dateString = date || getCurrentDateString();
    
    // Try to load existing state
    const existingState = await loadState(dateString);
    if (existingState) {
      return existingState;
    }
    
    // Generate new challenge
    const { startWord, targetWord } = generateDailyWords(dateString);
    
    const newState: ChallengeState = {
      date: dateString,
      startWord,
      targetWord,
      currentWord: startWord,
      wordSequence: [startWord],
      stepCount: 0,
      completed: false,
      failed: false
    };
    
    // Save the new state
    await saveState(newState);
    
    return newState;
  }

  /**
   * Start a daily challenge (same as getDailyChallengeState for now)
   */
  async function startDailyChallenge(date?: string): Promise<ChallengeState> {
    return getDailyChallengeState(date);
  }

  /**
   * Check if a word transformation is valid according to game rules
   * 
   * NOTE: This is a simplified validation for internal challenge engine use.
   * For UI validation, use the agnostic game engine's validation system
   * (GameStateDependencies.isValidMove) to ensure consistency across all game modes.
   */
  function isValidMove(fromWord: string, toWord: string): boolean {
    if (!fromWord || !toWord) return false;
    
    const from = fromWord.toUpperCase().trim();
    const to = toWord.toUpperCase().trim();
    
    // Words must be different
    if (from === to) return false;
    
    // Length can only change by ±1
    const lengthDiff = Math.abs(to.length - from.length);
    if (lengthDiff > 1) return false;
    
    // Must be valid dictionary words
    if (!dictionary.isValidDictionaryWord(to)) return false;
    
    return true;
  }

  /**
   * Submit a word in the challenge
   */
  async function submitWord(word: string, currentState: ChallengeState): Promise<{
    newState: ChallengeState;
    isValid: boolean;
    isComplete: boolean;
    error?: string;
  }> {
    const wordUpper = word.toUpperCase().trim();
    
    // Check if word was already used first
    if (currentState.wordSequence.includes(wordUpper)) {
      return {
        newState: currentState,
        isValid: false,
        isComplete: false,
        error: 'Word already used'
      };
    }
    
    // Validate the move
    if (!isValidMove(currentState.currentWord, wordUpper)) {
      return {
        newState: currentState,
        isValid: false,
        isComplete: false,
        error: 'Invalid word transformation'
      };
    }
    
    // Create new state
    const newWordSequence = [...currentState.wordSequence, wordUpper];
    const isComplete = wordUpper === currentState.targetWord;
    
    const newState: ChallengeState = {
      ...currentState,
      currentWord: wordUpper,
      wordSequence: newWordSequence,
      stepCount: currentState.stepCount + 1,
      completed: isComplete,
      failed: false
    };
    
    // Save the updated state
    await saveState(newState);
    
    return {
      newState,
      isValid: true,
      isComplete,
    };
  }

  /**
   * Forfeit the current challenge
   */
  async function forfeitChallenge(currentState: ChallengeState): Promise<ChallengeState> {
    const newState: ChallengeState = {
      ...currentState,
      failed: true,
      failedAtWord: currentState.currentWord
    };
    
    await saveState(newState);
    return newState;
  }

  /**
   * Generate sharing pattern using engine's word analysis
   */
  function generateSharingPattern(wordSequence: string[]): string[] {
    if (wordSequence.length < 2) return [];
    
    const patterns: string[] = [];
    
    for (let i = 1; i < wordSequence.length; i++) {
      const prevWord = wordSequence[i - 1];
      const currWord = wordSequence[i];
      
      // Use the engine's word analysis to understand the transformation
      const analysis: WordAnalysis = analyzeWordChange(prevWord, currWord);
      
      // Generate pattern based on the analysis
      const pattern = generatePatternFromAnalysis(prevWord, currWord, analysis);
      patterns.push(pattern);
    }
    
    return patterns;
  }

  /**
   * Generate visual pattern from word analysis
   */
  function generatePatternFromAnalysis(prevWord: string, currWord: string, analysis: WordAnalysis): string {
    // Create frequency maps to track letter usage
    const prevFreq = new Map<string, number>();
    const currFreq = new Map<string, number>();
    
    for (const char of prevWord) {
      prevFreq.set(char, (prevFreq.get(char) || 0) + 1);
    }
    
    for (const char of currWord) {
      currFreq.set(char, (currFreq.get(char) || 0) + 1);
    }
    
    // Build pattern character by character
    let pattern = '';
    
    for (let i = 0; i < currWord.length; i++) {
      const char = currWord[i];
      
      // Check if this character is truly new (added)
      const isNewLetter = analysis.addedLetters.includes(char);
      
      if (isNewLetter) {
        // This is a new letter
        pattern += '*';
        // Consume one instance of this letter from added letters
        const index = analysis.addedLetters.indexOf(char);
        if (index > -1) {
          analysis.addedLetters.splice(index, 1);
        }
      } else {
        // This letter existed before (either unchanged or moved)
        pattern += '🀫';
      }
    }
    
    return pattern;
  }

  /**
   * Generate complete sharing text
   */
  function generateSharingText(state: ChallengeState): string {
    const dayNumber = Math.floor((new Date(state.date).getTime() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Combine challenge number and start/target words on same line
    let result = `Challenge #${dayNumber} ${state.startWord} → ${state.targetWord}`;
    
    if (state.completed) {
      result += `\n\n`;
    } else if (state.failed) {
      result += ` (gave up)\n\n`;
    } else {
      result += ` (in progress)\n\n`;
    }
    
    if (state.wordSequence.length >= 2) {
      const patterns = generateSharingPattern(state.wordSequence);
      result += patterns.join('\n');
    }
    
    if (state.failed && state.failedAtWord) {
      // Add red X pattern for failed word
      result += '\n' + '❌'.repeat(state.failedAtWord.length);
    }
    
    // Add step count as separate line for completed challenges
    if (state.completed) {
      result += `\n${state.stepCount} steps`;
    }
    
    return result;
  }

  /**
   * Reset daily challenge (for testing)
   */
  async function resetDailyChallenge(date?: string): Promise<void> {
    const dateString = date || getCurrentDateString();
    const { startWord, targetWord } = generateDailyWords(dateString);
    
    const newState: ChallengeState = {
      date: dateString,
      startWord,
      targetWord,
      currentWord: startWord,
      wordSequence: [startWord],
      stepCount: 0,
      completed: false,
      failed: false
    };
    
    await saveState(newState);
  }

  /**
   * Generate a random challenge (for testing)
   */
  async function generateRandomChallenge(): Promise<ChallengeState> {
    // Use current timestamp as seed for random challenge
    const randomSeed = utilities.getTimestamp();
    const rng = new SeededRandom(randomSeed);
    
    // Generate random start word
    const startLengths = [4, 5, 6];
    const startLength = startLengths[rng.nextInt(0, startLengths.length - 1)];
    
    let startWord = dictionary.getRandomWordByLength(startLength);
    if (!startWord) {
      startWord = 'GAME'; // Fallback
    }
    
    // Generate random target word
    const targetLength = startWord.length + rng.nextInt(-1, 1);
    const finalTargetLength = Math.max(3, Math.min(8, targetLength));
    
    let targetWord = dictionary.getRandomWordByLength(finalTargetLength);
    if (!targetWord || targetWord === startWord.toUpperCase()) {
      targetWord = startWord.length === 4 ? 'PLAY' : 'GAMES'; // Fallback
    }
    
    const dateString = 'random-' + randomSeed;
    
    const state: ChallengeState = {
      date: dateString,
      startWord: startWord.toUpperCase(),
      targetWord: targetWord.toUpperCase(),
      currentWord: startWord.toUpperCase(),
      wordSequence: [startWord.toUpperCase()],
      stepCount: 0,
      completed: false,
      failed: false
    };
    
    await saveState(state);
    return state;
  }

  return {
    initialize,
    getDailyChallengeState,
    startDailyChallenge,
    submitWord,
    forfeitChallenge,
    generateSharingPattern,
    generateSharingText,
    isValidMove,
    resetDailyChallenge,
    generateRandomChallenge
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a simple hash from a string (for testing)
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
} 