/**
 * React Hook for Challenge Management
 * 
 * Provides a React interface to the challenge engine for daily word puzzles.
 * Integrates with the real challenge engine using compatible interfaces.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ChallengeEngine, ChallengeState } from '../../packages/engine/challenge';
import { createChallengeEngine } from '../../packages/engine/challenge';
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
  submitWord: (word: string) => Promise<{ success: boolean; error?: string }>;
  forfeitChallenge: () => Promise<void>;
  generateSharingText: () => string;
  isValidMove: (fromWord: string, toWord: string) => boolean;
  resetDailyChallenge: () => Promise<void>;
  generateRandomChallenge: () => Promise<void>;
}

export function useChallenge(): ChallengeHookState {
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeEngine, setChallengeEngine] = useState<ChallengeEngine | null>(null);

  // Initialize the challenge engine
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create the browser adapter
        const gameAdapter = await createBrowserAdapter();
        
        // Wait for dictionary to load
        const dictStatus = gameAdapter.getDictionaryStatus();
        if (!dictStatus.loaded) {
          console.log('Waiting for dictionary to load...');
          // Wait a bit for dictionary loading
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Create compatible dictionary engine interface
        const dictionaryEngine = {
          validateWord: (word: string, options?: any) => {
            // Convert gamestate ValidationResult to interfaces ValidationResult
            const result = gameAdapter.getDictionaryDependencies().validateWord(word, options);
            
            // Convert to the discriminated union format expected by challenge engine
            if (result.isValid) {
              return {
                isValid: true as const,
                word: result.word,
                censored: result.censored
              };
            } else {
              return {
                isValid: false as const,
                reason: (result.reason || 'UNKNOWN') as any,
                word: result.word,
                userMessage: result.userMessage || 'Invalid word'
              };
            }
          },
          
          isValidDictionaryWord: (word: string) => {
            const result = gameAdapter.getDictionaryDependencies().validateWord(word);
            return result.isValid;
          },
          
          getRandomWordByLength: (length: number) => {
            return gameAdapter.getDictionaryDependencies().getRandomWordByLength(length);
          },
          
          getDictionaryInfo: () => {
            const status = gameAdapter.getDictionaryStatus();
            return {
              wordCount: status.wordCount,
              isLoaded: status.loaded,
              loadTime: undefined
            };
          }
        };

        // Create utility dependencies
        const utilityDependencies = {
          getTimestamp: () => Date.now(),
          random: Math.random,
          log: console.log
        };

        // Create challenge dependencies using the createBestBrowserChallengeDependencies approach
        const challengeDependencies = {
          dictionary: dictionaryEngine,
          utilities: utilityDependencies,
          loadState: async (date: string) => {
            try {
              const stored = localStorage.getItem(`wordplay-challenge-${date}`);
              return stored ? JSON.parse(stored) : null;
            } catch {
              return null;
            }
          },
          
          saveState: async (state: ChallengeState) => {
            try {
              localStorage.setItem(`wordplay-challenge-${state.date}`, JSON.stringify(state));
            } catch (err) {
              console.warn('Failed to save challenge state:', err);
            }
          }
        };

        // Create challenge engine
        const engine = createChallengeEngine(challengeDependencies);
        await engine.initialize();

        setChallengeEngine(engine);
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize challenge engine:', err);
        setError('Failed to initialize challenge system');
      } finally {
        setIsLoading(false);
      }
    };

    initializeEngine();
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

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const state = await challengeEngine.getDailyChallengeState(today);
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to start challenge:', err);
      setError('Failed to start challenge');
    } finally {
      setIsLoading(false);
    }
  }, [challengeEngine]);

  // Submit a word
  const submitWord = useCallback(async (word: string): Promise<{ success: boolean; error?: string }> => {
    if (!challengeEngine || !challengeState) {
      return { success: false, error: 'Challenge not available' };
    }

    try {
      const result = await challengeEngine.submitWord(word, challengeState);
      
      if (result.isValid) {
        setChallengeState(result.newState);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Invalid word' };
      }
    } catch (err) {
      console.error('Failed to submit word:', err);
      return { success: false, error: 'Failed to submit word' };
    }
  }, [challengeEngine, challengeState]);

  // Forfeit the challenge
  const forfeitChallenge = useCallback(async () => {
    if (!challengeEngine || !challengeState) {
      setError('Challenge not available');
      return;
    }

    try {
      const result = await challengeEngine.forfeitChallenge(challengeState);
      setChallengeState(result);
    } catch (err) {
      console.error('Failed to forfeit challenge:', err);
      setError('Failed to forfeit challenge');
    }
  }, [challengeEngine, challengeState]);

  // Generate sharing text
  const generateSharingText = useCallback((): string => {
    if (!challengeEngine || !challengeState) {
      return 'Challenge not available';
    }

    return challengeEngine.generateSharingText(challengeState);
  }, [challengeEngine, challengeState]);

  // Check if a move is valid
  const isValidMove = useCallback((fromWord: string, toWord: string): boolean => {
    if (!challengeEngine) {
      return false;
    }

    return challengeEngine.isValidMove(fromWord, toWord);
  }, [challengeEngine]);

  // Reset daily challenge (for testing)
  const resetDailyChallenge = useCallback(async () => {
    if (!challengeEngine) {
      setError('Challenge engine not initialized');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await challengeEngine.resetDailyChallenge(today);
      
      // Reload the challenge state
      const state = await challengeEngine.getDailyChallengeState(today);
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to reset challenge:', err);
      setError('Failed to reset challenge');
    }
  }, [challengeEngine]);

  // Generate random challenge (for testing)
  const generateRandomChallenge = useCallback(async () => {
    if (!challengeEngine) {
      setError('Challenge engine not initialized');
      return;
    }

    try {
      const state = await challengeEngine.generateRandomChallenge();
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to generate random challenge:', err);
      setError('Failed to generate random challenge');
    }
  }, [challengeEngine]);

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