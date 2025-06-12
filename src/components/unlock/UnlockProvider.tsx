/**
 * Unlock Context Provider
 * 
 * Provides unlock system functionality throughout the React app.
 * Handles unlock notifications and immediate effects like theme application.
 */

import React, { createContext, useContext, useCallback } from 'react';
import { useUnlocks } from '../../hooks/useUnlocks';
import { useTheme } from '../theme/ThemeProvider';
import { availableThemes } from '../../types/theme';
import type { UseUnlocksReturn } from '../../hooks/useUnlocks';
import type { UnlockResult } from '../../../packages/engine/interfaces';

export interface UnlockContextType extends UseUnlocksReturn {
  // Enhanced functionality
  handleWordSubmission: (word: string) => Promise<UnlockResult[]>;
  handleGameCompletion: (winner: string, botId?: string) => Promise<UnlockResult[]>;
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
  const { setTheme } = useTheme();

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
  }, [setTheme]);

  // Enhanced word submission handler
  const handleWordSubmission = useCallback(async (word: string): Promise<UnlockResult[]> => {
    const results = await unlocks.checkWordTriggers(word);
    
    if (results.length > 0) {
      console.log(`[Unlock] Word "${word}" triggered ${results.length} unlock(s):`, results);
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }
    
    return results;
  }, [unlocks.checkWordTriggers, handleImmediateEffects]);

  // Enhanced game completion handler
  const handleGameCompletion = useCallback(async (winner: string, botId?: string): Promise<UnlockResult[]> => {
    const results: UnlockResult[] = [];
    
    // Check for bot-beating achievements
    if (winner === 'human' && botId) {
      const achievement = `beat_${botId.replace('-bot', '')}`;
      const achievementResults = await unlocks.checkAchievementTriggers(achievement);
      results.push(...achievementResults);
    }
    
    if (results.length > 0) {
      console.log(`[Unlock] Game completion triggered ${results.length} unlock(s):`, results);
      handleImmediateEffects(results);
      showUnlockNotification(results);
    }
    
    return results;
  }, [unlocks.checkAchievementTriggers, handleImmediateEffects]);

  // Show unlock notification (placeholder for now)
  const showUnlockNotification = useCallback((results: UnlockResult[]) => {
    // For now, just log to console
    // TODO: Implement proper notification UI
    for (const result of results) {
      const categoryName = result.category === 'theme' ? 'Theme' : 
                          result.category === 'mechanic' ? 'Mechanic' : 'Bot';
      console.log(`🎉 Unlocked ${categoryName}: ${result.target}`);
    }
  }, []);

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