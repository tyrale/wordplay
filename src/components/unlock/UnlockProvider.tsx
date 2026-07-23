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
import { alertCopy } from '../../content/alertCopy';
import { availableThemes } from '../../types/theme';
import type { UseUnlocksReturn } from '../../hooks/useUnlocks';
import type { UnlockResult } from '../../../packages/engine/interfaces';

export interface UnlockContextType extends UseUnlocksReturn {
  // Enhanced functionality
  handleWordSubmission: (word: string, isProfane?: boolean) => Promise<UnlockResult[]>;
  handleGameCompletion: (winner: string | null, botId?: string) => Promise<UnlockResult[]>;
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
      // Easter egg: playing "tyrale" unlocks dark mode with fully custom copy
      if (result.itemId === 'dark-mode') {
        showAlert('unlocks', 'darkMode', { variant: 'unlock' });
        continue;
      }

      // bruh-bot gets its own minimal alert - just the word, no meta/extra lines
      if (result.itemId === 'bruh-bot') {
        showAlert('unlocks', 'bruh', { variant: 'unlock' });
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
      showAlert('unlocks', category, { params: { item: itemName.toUpperCase() }, itemId: result.itemId, variant: 'unlock' });
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

  // Enhanced word submission handler
  const handleWordSubmission = useCallback(async (word: string, isProfane?: boolean): Promise<UnlockResult[]> => {
    // Special case: playing "RESET" wipes out all unlocks instead of granting one
    if (word === 'RESET') {
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
    showUnlockNotification,
    resetUnlocksToFresh
  };

  return (
    <UnlockContext.Provider value={contextValue}>
      {children}
    </UnlockContext.Provider>
  );
}; 