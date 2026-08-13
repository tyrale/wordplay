/**
 * Native useUnlocks hook.
 *
 * Direct port of apps/web's `hooks/useUnlocks.ts` - this hook has no
 * DOM/browser dependency at all (pure React state + calls into the
 * dependency-injected unlock engine), so only the adapter import changes:
 * nativeUnlockAdapter's AsyncStorage-backed dependencies instead of the
 * browser's IndexedDB-backed ones. Keep in sync with the web version if
 * its logic changes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createUnlockEngine } from '@wordplay/engine/unlocks';
import { createUnlockDependencies } from '../adapters/nativeUnlockAdapter';
import type { UnlockEngine, UnlockResult, UnlockState } from '@wordplay/engine/interfaces';

export interface UseUnlocksReturn {
  unlockState: UnlockState;
  isLoading: boolean;

  isUnlocked: (category: 'theme' | 'mechanic' | 'bot' | 'reveal', itemId: string) => boolean;
  getUnlockedItems: (category: 'theme' | 'mechanic' | 'bot' | 'reveal') => string[];
  getUnlockProgress: () => { unlocked: number; total: number };
  hasUsedReset: () => boolean;

  checkWordTriggers: (word: string) => Promise<UnlockResult[]>;
  checkAchievementTriggers: (achievement: string) => Promise<UnlockResult[]>;
  checkWordSequenceTriggers: (wordPath: string[]) => Promise<UnlockResult[]>;

  resetUnlocks: (options?: { markResetUsed?: boolean }) => Promise<void>;
}

export function useUnlocks(): UseUnlocksReturn {
  const [unlockState, setUnlockState] = useState<UnlockState>({
    themes: ['classic blue'],
    mechanics: [],
    bots: ['basicBot'],
    achievements: [],
    reveals: [],
    hasUsedReset: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const engineRef = useRef<UnlockEngine | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeEngine = async () => {
      try {
        const dependencies = createUnlockDependencies();
        const engine = createUnlockEngine(dependencies);

        if (mounted) {
          engineRef.current = engine;
          await engine.initialize();

          const currentState = engine.getCurrentState();
          setUnlockState(currentState);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize unlock engine:', error);
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

  const isUnlocked = useCallback((category: 'theme' | 'mechanic' | 'bot' | 'reveal', itemId: string): boolean => {
    if (!engineRef.current) return false;
    return engineRef.current.isUnlocked(category, itemId);
  }, []);

  const getUnlockedItems = useCallback((category: 'theme' | 'mechanic' | 'bot' | 'reveal'): string[] => {
    if (!engineRef.current) return [];
    return engineRef.current.getUnlockedItems(category);
  }, []);

  const getUnlockProgress = useCallback((): { unlocked: number; total: number } => {
    if (!engineRef.current) return { unlocked: 0, total: 0 };
    return engineRef.current.getUnlockProgress();
  }, []);

  const hasUsedReset = useCallback((): boolean => {
    if (!engineRef.current) return false;
    return engineRef.current.getCurrentState().hasUsedReset ?? false;
  }, []);

  const checkWordTriggers = useCallback(async (word: string): Promise<UnlockResult[]> => {
    if (!engineRef.current) return [];

    try {
      const results = await engineRef.current.checkWordTriggers(word);
      if (results.length > 0) {
        setUnlockState(engineRef.current.getCurrentState());
      }
      return results;
    } catch (error) {
      console.error('Error checking word triggers:', error);
      return [];
    }
  }, []);

  const checkAchievementTriggers = useCallback(async (achievement: string): Promise<UnlockResult[]> => {
    if (!engineRef.current) return [];

    try {
      const results = await engineRef.current.checkAchievementTriggers(achievement);
      if (results.length > 0) {
        setUnlockState(engineRef.current.getCurrentState());
      }
      return results;
    } catch (error) {
      console.error('Error checking achievement triggers:', error);
      return [];
    }
  }, []);

  const checkWordSequenceTriggers = useCallback(async (wordPath: string[]): Promise<UnlockResult[]> => {
    if (!engineRef.current) return [];

    try {
      const results = await engineRef.current.checkWordSequenceTriggers(wordPath);
      if (results.length > 0) {
        setUnlockState(engineRef.current.getCurrentState());
      }
      return results;
    } catch (error) {
      console.error('Error checking word sequence triggers:', error);
      return [];
    }
  }, []);

  const resetUnlocks = useCallback(async (options?: { markResetUsed?: boolean }): Promise<void> => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.resetState(options);
      setUnlockState(engineRef.current.getCurrentState());
    } catch (error) {
      console.error('Error resetting unlocks:', error);
    }
  }, []);

  return {
    unlockState,
    isLoading,
    isUnlocked,
    getUnlockedItems,
    getUnlockProgress,
    hasUsedReset,
    checkWordTriggers,
    checkAchievementTriggers,
    checkWordSequenceTriggers,
    resetUnlocks
  };
}
