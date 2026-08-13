/**
 * Native Unlock Provider.
 *
 * A leaner port of apps/web's `components/unlock/UnlockProvider.tsx`,
 * scoped to what Phase 3's first slice actually needs (MainScreen's bot
 * list + zen-mode gating). The web version's rich unlock *notification*
 * UI (`showUnlockNotification`, formatted alert copy, community "X%
 * found" rarity text) depends on `AlertProvider`/`AlertOverlay` and
 * `content/alertCopy.ts`, neither of which are ported yet - deliberately
 * deferred, not silently dropped. This version still performs the real
 * unlock-checking logic and applies immediate effects (e.g. auto-applying
 * a newly unlocked theme), it just doesn't show a toast/alert about it
 * yet. `showUnlockNotification` exists as a no-op placeholder so call
 * sites don't need to change once the alert system is ported.
 */
import React, { createContext, useContext, useCallback } from 'react';
import { useUnlocks } from '../hooks/useUnlocks';
import type { UseUnlocksReturn } from '../hooks/useUnlocks';
import { useTheme } from '../theme/ThemeProvider';
import { availableThemes } from '@wordplay/theme/theme';
import type { UnlockResult } from '@wordplay/engine/interfaces';

export interface HandleWordSubmissionOptions {
  isLocalMove?: boolean;
}

export interface UnlockContextType extends UseUnlocksReturn {
  handleWordSubmission: (word: string, isProfane?: boolean, options?: HandleWordSubmissionOptions) => Promise<UnlockResult[]>;
  handleGameCompletion: (winner: string | null, botId?: string) => Promise<UnlockResult[]>;
  handleWordPathChange: (wordPath: string[]) => Promise<UnlockResult[]>;
  /** No-op placeholder until the alert/notification UI is ported (see module doc comment). */
  showUnlockNotification: (results: UnlockResult[]) => void;
  resetUnlocksToFresh: () => Promise<void>;
}

const UnlockContext = createContext<UnlockContextType | undefined>(undefined);

export const useUnlockSystem = (): UnlockContextType => {
  const context = useContext(UnlockContext);
  if (!context) {
    throw new Error('useUnlockSystem must be used within an UnlockProvider');
  }
  return context;
};

interface UnlockProviderProps {
  children: React.ReactNode;
}

export const UnlockProvider: React.FC<UnlockProviderProps> = ({ children }) => {
  const unlocks = useUnlocks();
  const { setTheme } = useTheme();

  const showUnlockNotification = useCallback((_results: UnlockResult[]) => {
    // TODO(Phase 3 follow-up): show a toast/alert once AlertProvider is ported.
  }, []);

  const handleImmediateEffects = useCallback((results: UnlockResult[]) => {
    for (const result of results) {
      if (result.immediateEffect?.type === 'apply_theme') {
        const themeName = result.immediateEffect.value;
        const theme = availableThemes.find(t => t.name === themeName);
        if (theme) setTheme(theme);
      }
    }
  }, [setTheme]);

  const handleWordSubmission = useCallback(async (
    word: string,
    isProfane?: boolean,
    options?: HandleWordSubmissionOptions
  ): Promise<UnlockResult[]> => {
    const isLocalMove = options?.isLocalMove ?? true;
    if (isLocalMove && word === 'RESET' && !unlocks.hasUsedReset()) {
      await unlocks.resetUnlocks({ markResetUsed: true });
      return [];
    }

    const results = await unlocks.checkWordTriggers(word);

    if (isProfane) {
      const profanityResults = await unlocks.checkAchievementTriggers('played_profanity');
      results.push(...profanityResults);
    }

    if (results.length > 0) {
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }

    return results;
  }, [unlocks, handleImmediateEffects, showUnlockNotification]);

  const handleGameCompletion = useCallback(async (winner: string | null, botId?: string): Promise<UnlockResult[]> => {
    const results: UnlockResult[] = [];

    if (winner === 'human' && botId) {
      const achievement = botId.endsWith('-bot') ? `beat_${botId.split('-').join('_')}` : `beat_${botId}`;
      const achievementResults = await unlocks.checkAchievementTriggers(achievement);
      results.push(...achievementResults);
    }

    if (results.length > 0) {
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }

    return results;
  }, [unlocks, handleImmediateEffects, showUnlockNotification]);

  const handleWordPathChange = useCallback(async (wordPath: string[]): Promise<UnlockResult[]> => {
    if (wordPath.length === 0) return [];

    const results = await unlocks.checkWordSequenceTriggers(wordPath);
    if (results.length > 0) {
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }
    return results;
  }, [unlocks, handleImmediateEffects, showUnlockNotification]);

  const resetUnlocksToFresh = useCallback(async (): Promise<void> => {
    await unlocks.resetUnlocks();
  }, [unlocks]);

  const contextValue: UnlockContextType = {
    ...unlocks,
    handleWordSubmission,
    handleGameCompletion,
    handleWordPathChange,
    showUnlockNotification,
    resetUnlocksToFresh
  };

  return <UnlockContext.Provider value={contextValue}>{children}</UnlockContext.Provider>;
};
