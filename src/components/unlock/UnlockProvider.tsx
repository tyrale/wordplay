/**
 * Unlock Context Provider
 * 
 * Provides unlock system functionality throughout the React app.
 * Handles unlock notifications and immediate effects like theme application.
 */

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useUnlocks } from '../../hooks/useUnlocks';
import { useTheme } from '../theme/ThemeProvider';
import { useAlert } from '../ui/AlertProvider';
import { alertCopy, resolveAlertMeta } from '../../content/alertCopy';
import type { AlertCopyEntry } from '../../content/alertCopy';
import { computeUnlockPercentage } from '../../adapters/supabaseCommunityUnlocksAdapter';
import { availableThemes } from '../../types/theme';
import type { UseUnlocksReturn } from '../../hooks/useUnlocks';
import type { UnlockResult } from '../../../packages/engine/interfaces';

export interface HandleWordSubmissionOptions {
  /**
   * Whether this submission came from the local player's own input (vs a
   * bot move or a remote opponent's move observed via game state). Defaults
   * to `true`. Only the local player's own "RESET" submission wipes their
   * unlocks - a bot/opponent playing "RESET" is treated as a normal word
   * so it can't clobber another player's progress.
   */
  isLocalMove?: boolean;
}

export interface UnlockContextType extends UseUnlocksReturn {
  // Enhanced functionality
  handleWordSubmission: (word: string, isProfane?: boolean, options?: HandleWordSubmissionOptions) => Promise<UnlockResult[]>;
  handleGameCompletion: (winner: string | null, botId?: string) => Promise<UnlockResult[]>;
  /** Check the game's word path for sequence-triggered unlocks (e.g. STINK→STANK→STUNK). */
  handleWordPathChange: (wordPath: string[]) => Promise<UnlockResult[]>;
  showUnlockNotification: (results: UnlockResult[]) => void;

  // Testing/Debug functions
  resetUnlocksToFresh: () => Promise<void>;
}

const UnlockContext = createContext<UnlockContextType | undefined>(undefined);

export const useUnlockSystem = () => {
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
  const { setTheme, isInverted, setInverted } = useTheme();
  const { showAlert } = useAlert();

  // Enforce that dark mode can only be active if actually unlocked. Guards
  // against stale/stray `wordplay-inverted` localStorage values (e.g. from
  // before this unlock gate existed) leaving the app stuck in dark mode.
  useEffect(() => {
    if (unlocks.isLoading) return;
    if (isInverted && !unlocks.isUnlocked('mechanic', 'dark-mode')) {
      setInverted(false);
    }
  }, [unlocks.isLoading, isInverted, unlocks.isUnlocked, setInverted]);

  // Show unlock notification using the universal alert overlay
  const showUnlockNotification = useCallback((results: UnlockResult[]) => {
    for (const result of results) {
      // Rarity: what fraction of the community has ever found this unlock,
      // if the community-wide count was successfully recorded server-side.
      const percent = (result.communityUnlockCount != null && result.communityTotalPlayers != null)
        ? computeUnlockPercentage(result.communityUnlockCount, result.communityTotalPlayers)
        : null;

      // Appends a "X% found" line below any existing meta text, when rarity data is available.
      const withRarity = (baseMeta?: string): React.ReactNode => {
        if (percent == null) return baseMeta;
        return (
          <>
            {baseMeta && <div>{baseMeta}</div>}
            <div>{percent}% found</div>
          </>
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

      // Get user-friendly name for the unlocked item
      let itemName = result.target || result.itemId || result.name || 'Unknown Item';
      
      // Format theme names nicely
      if (result.category === 'theme' && result.target) {
        itemName = result.target.split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
      
      // Format bot names nicely
      if (result.category === 'bot' && result.target) {
        itemName = result.target.replace('-bot', '').split('-').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') + ' Bot';
      }
      
      // Format mechanic names nicely
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
  }, [showAlert]);

  // Handle immediate effects from unlock results
  const handleImmediateEffects = useCallback((results: UnlockResult[]) => {
    for (const result of results) {
      if (result.immediateEffect?.type === 'apply_theme') {
        const themeName = result.immediateEffect.value;
        const theme = availableThemes.find(t => t.name === themeName);
        if (theme) {
          console.log(`[Unlock] Applying theme immediately: ${themeName}`);
          setTheme(theme);
        }
      }
    }
  }, [setTheme, availableThemes]);

  // Enhanced word submission handler.
  //
  // Called for every word played in a game the local player is part of:
  //   - the local player's own submissions (isLocalMove = true, the default)
  //   - bot moves and remote opponent moves observed via game state
  //     (isLocalMove = false)
  // Unlocks fire for any of these so that, e.g., a bot playing "midnight"
  // unlocks the midnight theme for the local player too. The only
  // local-only behavior is the "RESET" developer cheat: a bot/opponent
  // playing "RESET" is treated as a normal word and must never wipe the
  // local player's unlock progress.
  const handleWordSubmission = useCallback(async (word: string, isProfane?: boolean, options?: HandleWordSubmissionOptions): Promise<UnlockResult[]> => {
    const isLocalMove = options?.isLocalMove ?? true;
    // Special case: the local player playing "RESET" wipes out all unlocks
    // instead of granting one. Skipped for non-local moves (see above).
    if (isLocalMove && word === 'RESET') {
      console.log('[Unlock] "RESET" played - resetting all unlocks');
      await unlocks.resetUnlocks();
      showAlert('generic', 'resetTrigger');
      return [];
    }

    const results = await unlocks.checkWordTriggers(word);

    // Any profanity word unlocks the vanity filter toggle, not just one hardcoded word
    if (isProfane) {
      const profanityResults = await unlocks.checkAchievementTriggers('played_profanity');
      results.push(...profanityResults);
    }

    if (results.length > 0) {
      console.log(`[Unlock] Word "${word}" triggered ${results.length} unlock(s):`, results);
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }

    return results;
  }, [unlocks.checkWordTriggers, unlocks.checkAchievementTriggers, handleImmediateEffects, showUnlockNotification]);

  // Enhanced game completion handler
  const handleGameCompletion = useCallback(async (winner: string | null, botId?: string): Promise<UnlockResult[]> => {
    const results: UnlockResult[] = [];
    
    // Check for bot-beating achievements
    if (winner === 'human' && botId) {
      // Generate achievement string to match unlock definitions
      // For botId like "easy-bot" -> achievement "beat_easy_bot"
      // For botId like "basicBot" -> achievement "beat_basicBot"
      let achievement: string;
      if (botId.endsWith('-bot')) {
        achievement = `beat_${botId.replace('-', '_')}`;
      } else {
        achievement = `beat_${botId}`;
      }
      
      console.log(`[Unlock] Player beat ${botId}, checking achievement: ${achievement}`);
      const achievementResults = await unlocks.checkAchievementTriggers(achievement);
      results.push(...achievementResults);
    }
    
    if (results.length > 0) {
      console.log(`[Unlock] Game completion triggered ${results.length} unlock(s):`, results);
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }
    
    return results;
  }, [unlocks.checkAchievementTriggers, handleImmediateEffects, showUnlockNotification]);

  // Handle word-path (sequence) triggered unlocks.
  // Called whenever the game's word path changes (e.g. after each move).
  // Fires when the tail of the path matches a defined word_sequence trigger.
  const handleWordPathChange = useCallback(async (wordPath: string[]): Promise<UnlockResult[]> => {
    if (wordPath.length === 0) return [];

    const results = await unlocks.checkWordSequenceTriggers(wordPath);

    if (results.length > 0) {
      console.log(`[Unlock] Word path sequence triggered ${results.length} unlock(s):`, results);
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }

    return results;
  }, [unlocks.checkWordSequenceTriggers, handleImmediateEffects, showUnlockNotification]);

  // Reset unlocks to fresh user state (for testing)
  const resetUnlocksToFresh = useCallback(async (): Promise<void> => {
    console.log('[Unlock] Resetting to fresh user state...');
    await unlocks.resetUnlocks();
    console.log('[Unlock] Reset complete - back to fresh user experience');
  }, [unlocks.resetUnlocks]);

  const contextValue: UnlockContextType = {
    ...unlocks,
    handleWordSubmission,
    handleGameCompletion,
    handleWordPathChange,
    showUnlockNotification,
    resetUnlocksToFresh
  };

  return (
    <UnlockContext.Provider value={contextValue}>
      {children}
    </UnlockContext.Provider>
  );
}; 