/**
 * Native Unlock Provider.
 *
 * Now a full port of apps/web's `components/unlock/UnlockProvider.tsx`,
 * including the real unlock-notification UI via the native
 * `AlertProvider`/`AlertOverlay` (per the user's explicit direction to
 * reuse the same full-screen alert overlay pattern on native, not a
 * toast/snackbar). Logic mirrors web's `showUnlockNotification` exactly:
 * special-cased dark-mode/bruh-bot copy, formatted item names per
 * category, and community "X% found" rarity text when available.
 */
import React, { createContext, useContext, useCallback } from 'react';
import { Text } from 'react-native';
import { useUnlocks } from '../hooks/useUnlocks';
import type { UseUnlocksReturn } from '../hooks/useUnlocks';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { useAlert } from './AlertProvider';
import { alertCopy, resolveAlertMeta } from '../content/alertCopy';
import type { AlertCopyEntry } from '../content/alertCopy';
import { computeUnlockPercentage } from '../adapters/nativeCommunityUnlocksAdapter';
import { availableThemes } from '@wordplay/theme/theme';
import type { UnlockResult } from '@wordplay/engine/interfaces';

export interface HandleWordSubmissionOptions {
  isLocalMove?: boolean;
}

export interface UnlockContextType extends UseUnlocksReturn {
  handleWordSubmission: (word: string, isProfane?: boolean, options?: HandleWordSubmissionOptions) => Promise<UnlockResult[]>;
  handleGameCompletion: (winner: string | null, botId?: string) => Promise<UnlockResult[]>;
  handleWordPathChange: (wordPath: string[]) => Promise<UnlockResult[]>;
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
  const { setTheme, currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  const { showAlert } = useAlert();

  // Show unlock notification using the universal alert overlay - mirrors
  // apps/web's UnlockProvider.tsx showUnlockNotification exactly.
  const showUnlockNotification = useCallback((results: UnlockResult[]) => {
    for (const result of results) {
      // Rarity: what fraction of the community has ever found this unlock,
      // if the community-wide count was successfully recorded server-side.
      const percent = (result.communityUnlockCount != null && result.communityTotalPlayers != null)
        ? computeUnlockPercentage(result.communityUnlockCount, result.communityTotalPlayers)
        : null;

      const withRarity = (baseMeta?: string): React.ReactNode => {
        if (percent == null) return baseMeta;
        return (
          <Text style={{ color: colors.text, fontSize: 14, textAlign: 'center' }}>
            {baseMeta && <Text>{baseMeta}{'\n'}</Text>}
            {percent}% found
          </Text>
        );
      };

      // Easter egg: playing "tyrale" unlocks dark mode with fully custom copy
      if (result.itemId === 'dark-mode') {
        showAlert('unlocks', 'darkMode', { variant: 'unlock', meta: withRarity(resolveAlertMeta(alertCopy.unlocks.darkMode)) });
        continue;
      }

      // bruh-bot gets its own minimal alert - just the word, no meta/extra lines (aside from rarity)
      if (result.itemId === 'bruh-bot') {
        showAlert('unlocks', 'bruh', { variant: 'unlock', meta: withRarity() });
        continue;
      }

      let itemName = result.target || result.itemId || result.name || 'Unknown Item';

      if (result.category === 'theme' && result.target) {
        itemName = result.target.split(' ').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }

      if (result.category === 'bot' && result.target) {
        itemName = result.target.replace('-bot', '').split('-').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') + ' Bot';
      }

      if (result.category === 'mechanic' && result.target) {
        itemName = result.target.replace('-', ' ').split(' ').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }

      const category = (result.category in alertCopy.unlocks) ? result.category as keyof typeof alertCopy.unlocks : 'generic';
      const params = { item: itemName.toUpperCase() };
      const entry = (alertCopy.unlocks as Record<string, AlertCopyEntry>)[category];
      const baseMeta = resolveAlertMeta(entry, params, result.itemId);
      showAlert('unlocks', category, { params, itemId: result.itemId, variant: 'unlock', meta: withRarity(baseMeta) });
    }
  }, [showAlert, colors]);

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
