/**
 * React Hook for Challenge Management
 * 
 * Provides a React interface to the challenge engine for daily word puzzles.
 * Manages challenge state, submission, sharing, and persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ChallengeEngine, ChallengeState } from '../../packages/engine/challenge';
import { createChallengeEngine } from '../../packages/engine/challenge';
import { createBestBrowserChallengeDependencies } from '../../packages/adapters/browser/challenge';
import { createBrowserAdapter } from '../adapters/browserAdapter';

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
  submitWord: (word: string) => Promise<{ success: boolean; isComplete: boolean; error?: string }>;
  forfeitChallenge: () => Promise<void>;
  generateSharingText: () => string;
  
  // Debug actions
  resetDailyChallenge: () => Promise<void>;
  generateRandomChallenge: () => Promise<void>;
  
  // Utilities
  isValidMove: (fromWord: string, toWord: string) => boolean;
}

/**
 * React hook for challenge management
 */
export function useChallenge(): ChallengeHookState {
  const [challengeEngine, setChallengeEngine] = useState<ChallengeEngine | null>(null);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the challenge engine
  useEffect(() => {
    let mounted = true;

    const initializeEngine = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create the game adapter (reuse existing web adapter)
        const gameAdapter = await createBrowserAdapter();
        const dictDeps = gameAdapter.getDictionaryDependencies();

        // Create a DictionaryEngine wrapper for the challenge engine
        const dictionaryEngine = {
          validateWord: dictDeps.validateWord,
          isValidDictionaryWord: (word: string) => {
            const result = dictDeps.validateWord(word);
            return result.isValid;
          },
          getRandomWordByLength: dictDeps.getRandomWordByLength,
          getDictionaryInfo: () => {
            const status = gameAdapter.getDictionaryStatus();
            return {
              wordCount: status.wordCount,
              isLoaded: status.loaded,
              loadTime: undefined
            };
          }
        };

        // Create challenge dependencies
        const challengeDependencies = createBestBrowserChallengeDependencies(
          dictionaryEngine,
          {
            getTimestamp: () => Date.now(),
            random: Math.random,
            log: console.log
          }
        );

        // Create challenge engine
        const engine = createChallengeEngine(challengeDependencies);
        await engine.initialize();

        if (mounted) {
          setChallengeEngine(engine);
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize challenge engine');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeEngine();

    return () => {
      mounted = false;
    };
  }, []);

  // Start today's challenge
  const startChallenge = useCallback(async () => {
    if (!challengeEngine) {
      setError('Challenge engine not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const state = await challengeEngine.startDailyChallenge();
      setChallengeState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start challenge');
    } finally {
      setIsLoading(false);
    }
  }, [challengeEngine]);

  // Submit a word
  const submitWord = useCallback(async (word: string): Promise<{ success: boolean; isComplete: boolean; error?: string }> => {
    if (!challengeEngine || !challengeState) {
      const errorMsg = 'Challenge engine or state not available';
      setError(errorMsg);
      return { success: false, isComplete: false, error: errorMsg };
    }

    try {
      setError(null);

      const result = await challengeEngine.submitWord(word, challengeState);
      
      if (result.isValid) {
        setChallengeState(result.newState);
        return { success: true, isComplete: result.isComplete };
      } else {
        return { success: false, isComplete: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit word';
      setError(errorMsg);
      return { success: false, isComplete: false, error: errorMsg };
    }
  }, [challengeEngine, challengeState]);

  // Forfeit the challenge
  const forfeitChallenge = useCallback(async () => {
    if (!challengeEngine || !challengeState) {
      setError('Challenge engine or state not available');
      return;
    }

    try {
      setError(null);

      const newState = await challengeEngine.forfeitChallenge(challengeState);
      setChallengeState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to forfeit challenge');
    }
  }, [challengeEngine, challengeState]);

  // Generate sharing text
  const generateSharingText = useCallback((): string => {
    if (!challengeEngine || !challengeState) {
      return 'Challenge not available';
    }

    try {
      return challengeEngine.generateSharingText(challengeState);
    } catch (err) {
      console.error('Failed to generate sharing text:', err);
      return 'Error generating sharing text';
    }
  }, [challengeEngine, challengeState]);

  // Reset daily challenge (debug)
  const resetDailyChallenge = useCallback(async () => {
    if (!challengeEngine) {
      setError('Challenge engine not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await challengeEngine.resetDailyChallenge();
      // Reload the challenge after reset
      const state = await challengeEngine.getDailyChallengeState();
      setChallengeState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset challenge');
    } finally {
      setIsLoading(false);
    }
  }, [challengeEngine]);

  // Generate random challenge (debug)
  const generateRandomChallenge = useCallback(async () => {
    if (!challengeEngine) {
      setError('Challenge engine not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const state = await challengeEngine.generateRandomChallenge();
      setChallengeState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate random challenge');
    } finally {
      setIsLoading(false);
    }
  }, [challengeEngine]);

  // Check if a move is valid
  const isValidMove = useCallback((fromWord: string, toWord: string): boolean => {
    if (!challengeEngine) {
      return false;
    }

    return challengeEngine.isValidMove(fromWord, toWord);
  }, [challengeEngine]);

  // Load challenge state on engine initialization
  useEffect(() => {
    if (isInitialized && challengeEngine && !challengeState) {
      // Auto-load today's challenge state (if exists)
      challengeEngine.getDailyChallengeState()
        .then(state => setChallengeState(state))
        .catch(err => console.warn('Failed to load existing challenge state:', err));
    }
  }, [isInitialized, challengeEngine, challengeState]);

  return {
    challengeState,
    isLoading,
    isInitialized,
    error,
    startChallenge,
    submitWord,
    forfeitChallenge,
    generateSharingText,
    resetDailyChallenge,
    generateRandomChallenge,
    isValidMove
  };
} 