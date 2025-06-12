/**
 * React Hook for Challenge Management
 * 
 * Provides a React interface to the challenge engine for daily word puzzles.
 * Simplified implementation to avoid TypeScript interface conflicts.
 */

import { useState, useCallback } from 'react';

export interface ChallengeState {
  date: string;
  startWord: string;
  targetWord: string;
  currentWord: string;
  wordSequence: string[];
  stepCount: number;
  completed: boolean;
  failed: boolean;
  failedAtWord?: string;
}

export interface ChallengeHookState {
  // Current challenge state
  challengeState: ChallengeState | null;
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  startChallenge: () => Promise<void>;
  submitWord: (word: string) => Promise<{ success: boolean; error?: string }>;
  forfeitChallenge: () => Promise<void>;
  generateSharingText: () => string;
  isValidMove: (fromWord: string, toWord: string) => boolean;
  resetDailyChallenge: () => Promise<void>;
  generateRandomChallenge: () => Promise<void>;
}

// Mock implementation for now - will be replaced with actual engine integration
export function useChallenge(): ChallengeHookState {
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized] = useState(true); // Always initialized for mock
  const [error, setError] = useState<string | null>(null);

  // Mock challenge data
  const generateMockChallenge = (): ChallengeState => {
    const words = ['GAME', 'NAME', 'SAME', 'CAME', 'MAKE', 'TAKE', 'FAKE', 'LAKE', 'CAKE'];
    const startWord = words[Math.floor(Math.random() * words.length)];
    let targetWord = words[Math.floor(Math.random() * words.length)];
    
    // Ensure different words
    while (targetWord === startWord) {
      targetWord = words[Math.floor(Math.random() * words.length)];
    }

    return {
      date: new Date().toISOString().split('T')[0],
      startWord,
      targetWord,
      currentWord: startWord,
      wordSequence: [startWord],
      stepCount: 0,
      completed: false,
      failed: false
    };
  };

  // Start today's challenge
  const startChallenge = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, generate a mock challenge
      const state = generateMockChallenge();
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to start challenge:', err);
      setError('Failed to start challenge');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Submit a word
  const submitWord = useCallback(async (word: string): Promise<{ success: boolean; error?: string }> => {
    if (!challengeState) {
      return { success: false, error: 'Challenge not available' };
    }

    try {
      const wordUpper = word.toUpperCase().trim();
      
      // Basic validation
      if (wordUpper === challengeState.currentWord) {
        return { success: false, error: 'Same word' };
      }
      
      if (challengeState.wordSequence.includes(wordUpper)) {
        return { success: false, error: 'Word already used' };
      }

      // Check length difference
      const lengthDiff = Math.abs(wordUpper.length - challengeState.currentWord.length);
      if (lengthDiff > 1) {
        return { success: false, error: 'Invalid word transformation' };
      }

      // Create new state
      const newWordSequence = [...challengeState.wordSequence, wordUpper];
      const isComplete = wordUpper === challengeState.targetWord;
      
      const newState: ChallengeState = {
        ...challengeState,
        currentWord: wordUpper,
        wordSequence: newWordSequence,
        stepCount: challengeState.stepCount + 1,
        completed: isComplete
      };

      setChallengeState(newState);
      return { success: true };
    } catch (err) {
      console.error('Failed to submit word:', err);
      return { success: false, error: 'Failed to submit word' };
    }
  }, [challengeState]);

  // Forfeit the challenge
  const forfeitChallenge = useCallback(async () => {
    if (!challengeState) {
      setError('Challenge not available');
      return;
    }

    try {
      const newState: ChallengeState = {
        ...challengeState,
        failed: true,
        failedAtWord: challengeState.currentWord
      };
      
      setChallengeState(newState);
    } catch (err) {
      console.error('Failed to forfeit challenge:', err);
      setError('Failed to forfeit challenge');
    }
  }, [challengeState]);

  // Generate sharing text
  const generateSharingText = useCallback((): string => {
    if (!challengeState) {
      return 'Challenge not available';
    }

    const header = `WordPlay Challenge ${challengeState.date}\n${challengeState.startWord} → ${challengeState.targetWord}\n`;
    
    if (challengeState.failed) {
      return header + `❌ Gave up after ${challengeState.stepCount} steps`;
    } else if (challengeState.completed) {
      return header + `✅ Solved in ${challengeState.stepCount} steps!`;
    } else {
      return header + `🔄 In progress: ${challengeState.stepCount} steps`;
    }
  }, [challengeState]);

  // Check if a move is valid (basic implementation)
  const isValidMove = useCallback((fromWord: string, toWord: string): boolean => {
    if (fromWord === toWord) return false;
    
    const lengthDiff = Math.abs(toWord.length - fromWord.length);
    return lengthDiff <= 1;
  }, []);

  // Reset daily challenge (for testing)
  const resetDailyChallenge = useCallback(async () => {
    try {
      const state = generateMockChallenge();
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to reset challenge:', err);
      setError('Failed to reset challenge');
    }
  }, []);

  // Generate random challenge (for testing)
  const generateRandomChallenge = useCallback(async () => {
    try {
      const state = generateMockChallenge();
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to generate random challenge:', err);
      setError('Failed to generate random challenge');
    }
  }, []);

  return {
    challengeState,
    isLoading,
    isInitialized,
    error,
    startChallenge,
    submitWord,
    forfeitChallenge,
    generateSharingText,
    isValidMove,
    resetDailyChallenge,
    generateRandomChallenge
  };
} 