/**
 * Native React Hook for Challenge Management.
 *
 * Direct port of apps/web's `hooks/useChallenge.ts`. The daily challenge
 * word pair is computed entirely client-side via a seeded RNG keyed off
 * the date (`@wordplay/engine/challenge`'s `createChallengeEngine`) - the
 * same algorithm runs on every client, so there's no server dependency
 * for "today's challenge is the same for everyone worldwide". Only the
 * dictionary source (native adapter instead of browser adapter) and the
 * state persistence (AsyncStorage instead of localStorage, made async)
 * differ from web.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChallengeEngine, ChallengeState } from '@wordplay/engine/challenge';
import { createChallengeEngine } from '@wordplay/engine/challenge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeAdapter } from '../adapters/nativeAdapter';
import type { NativeAdapter } from '../adapters/nativeAdapter';
import type { ValidationOptions, ScoringResult } from '@wordplay/engine/interfaces';

export interface ChallengeHookState {
  challengeState: ChallengeState | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  startChallenge: () => Promise<void>;
  submitWord: (word: string) => Promise<{ success: boolean; error?: string }>;
  forfeitChallenge: () => Promise<void>;
  generateSharingText: () => string;
  isValidMove: (fromWord: string, toWord: string) => boolean;
  /** Scores a hypothetical move without applying it - used by ChallengeGame
   * to drive ScoreDisplay's action icons (add/remove/rearrange), even
   * though challenge mode doesn't display the actual score numbers. */
  calculateScore: (fromWord: string, toWord: string) => ScoringResult | null;
  resetDailyChallenge: () => Promise<void>;
  generateRandomChallenge: () => Promise<void>;
}

export function useChallenge(): ChallengeHookState {
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeEngine, setChallengeEngine] = useState<ChallengeEngine | null>(null);
  const gameAdapterRef = useRef<NativeAdapter | null>(null);

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const gameAdapter = await createNativeAdapter();
        gameAdapterRef.current = gameAdapter;

        const dictStatus = gameAdapter.getDictionaryStatus();
        if (!dictStatus.loaded) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const dictionaryEngine = {
          validateWord: (word: string, options?: ValidationOptions) => {
            const result = gameAdapter.getDictionaryDependencies().validateWord(word, options);

            if (result.isValid) {
              return {
                isValid: true as const,
                word: result.word,
                censored: result.censored
              };
            } else {
              return {
                isValid: false as const,
                reason: result.reason || 'UNKNOWN',
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

          // Deterministic (no Math.random): the same dictionary snapshot
          // filtered/sorted the same way on every client, so a seeded RNG
          // index into this list picks the same word worldwide - see
          // module doc comment.
          getWordsByLength: (length: number) => {
            const wordData = gameAdapter.getWordData();
            return Array.from(wordData.enableWords)
              .filter(word => word.length === length && !wordData.profanityWords.has(word))
              .sort();
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

        const utilityDependencies = {
          getTimestamp: () => Date.now(),
          random: Math.random,
          log: console.log
        };

        const challengeDependencies = {
          dictionary: dictionaryEngine,
          utilities: utilityDependencies,
          loadState: async (date: string) => {
            try {
              const stored = await AsyncStorage.getItem(`wordplay-challenge-${date}`);
              return stored ? JSON.parse(stored) : null;
            } catch {
              return null;
            }
          },

          saveState: async (state: ChallengeState) => {
            try {
              await AsyncStorage.setItem(`wordplay-challenge-${state.date}`, JSON.stringify(state));
            } catch (err) {
              console.warn('Failed to save challenge state:', err);
            }
          }
        };

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

  const startChallenge = useCallback(async () => {
    if (!challengeEngine) {
      setError('Challenge engine not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const state = await challengeEngine.getDailyChallengeState(today);
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to start challenge:', err);
      setError('Failed to start challenge');
    } finally {
      setIsLoading(false);
    }
  }, [challengeEngine]);

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

  const generateSharingText = useCallback((): string => {
    if (!challengeEngine || !challengeState) {
      return 'Challenge not available';
    }

    return challengeEngine.generateSharingText(challengeState);
  }, [challengeEngine, challengeState]);

  const isValidMove = useCallback((fromWord: string, toWord: string): boolean => {
    if (!challengeEngine) {
      return false;
    }

    return challengeEngine.isValidMove(fromWord, toWord);
  }, [challengeEngine]);

  const calculateScore = useCallback((fromWord: string, toWord: string): ScoringResult | null => {
    if (!gameAdapterRef.current) return null;
    return gameAdapterRef.current.getGameDependencies().calculateScore(fromWord, toWord, { keyLetters: [] });
  }, []);

  const resetDailyChallenge = useCallback(async () => {
    if (!challengeEngine) {
      setError('Challenge engine not initialized');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await challengeEngine.resetDailyChallenge(today);

      const state = await challengeEngine.getDailyChallengeState(today);
      setChallengeState(state);
    } catch (err) {
      console.error('Failed to reset challenge:', err);
      setError('Failed to reset challenge');
    }
  }, [challengeEngine]);

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
    calculateScore,
    resetDailyChallenge,
    generateRandomChallenge
  };
}
