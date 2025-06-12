/**
 * React Hook for Unlock System Integration
 * 
 * Provides unlock state management and trigger handling for the web app.
 * Integrates the platform-agnostic unlock engine with React state management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createUnlockEngine } from '../../packages/engine/unlocks';
import { createBrowserUnlockDependencies } from '../../packages/adapters/browser/unlocks';
import type { UnlockEngine, UnlockResult, UnlockState } from '../../packages/engine/interfaces';

export interface UseUnlocksReturn {
  // State
  unlockState: UnlockState;
  isLoading: boolean;
  
  // Queries
  isUnlocked: (category: 'theme' | 'mechanic' | 'bot', itemId: string) => boolean;
  getUnlockedItems: (category: 'theme' | 'mechanic' | 'bot') => string[];
  
  // Triggers
  checkWordTriggers: (word: string) => Promise<UnlockResult[]>;
  checkAchievementTriggers: (achievement: string) => Promise<UnlockResult[]>;
  
  // Debug/Admin
  resetUnlocks: () => Promise<void>;
}

/**
 * Hook for managing unlock system in React components
 */
export function useUnlocks(): UseUnlocksReturn {
  const [unlockState, setUnlockState] = useState<UnlockState>({
    themes: ['classic blue'],
    mechanics: [],
    bots: ['tester'],
    achievements: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const engineRef = useRef<UnlockEngine | null>(null);

  // Initialize unlock engine
  useEffect(() => {
    let mounted = true;

    const initializeEngine = async () => {
      try {
        const dependencies = createBrowserUnlockDependencies();
        const engine = createUnlockEngine(dependencies);
        
        if (mounted) {
          engineRef.current = engine;
          
          // Initialize the engine to load persisted state from IndexedDB
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

  // Query functions
  const isUnlocked = useCallback((category: 'theme' | 'mechanic' | 'bot', itemId: string): boolean => {
    if (!engineRef.current) return false;
    return engineRef.current.isUnlocked(category, itemId);
  }, []);

  const getUnlockedItems = useCallback((category: 'theme' | 'mechanic' | 'bot'): string[] => {
    if (!engineRef.current) return [];
    return engineRef.current.getUnlockedItems(category);
  }, []);

  // Trigger functions
  const checkWordTriggers = useCallback(async (word: string): Promise<UnlockResult[]> => {
    if (!engineRef.current) return [];
    
    try {
      const results = await engineRef.current.checkWordTriggers(word);
      
      // Update local state if any unlocks occurred
      if (results.length > 0) {
        const newState = engineRef.current.getCurrentState();
        setUnlockState(newState);
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
      
      // Update local state if any unlocks occurred
      if (results.length > 0) {
        const newState = engineRef.current.getCurrentState();
        setUnlockState(newState);
      }
      
      return results;
    } catch (error) {
      console.error('Error checking achievement triggers:', error);
      return [];
    }
  }, []);

  // Debug/Admin functions
  const resetUnlocks = useCallback(async (): Promise<void> => {
    if (!engineRef.current) return;
    
    try {
      await engineRef.current.resetState();
      const newState = engineRef.current.getCurrentState();
      setUnlockState(newState);
    } catch (error) {
      console.error('Error resetting unlocks:', error);
    }
  }, []);

  return {
    unlockState,
    isLoading,
    isUnlocked,
    getUnlockedItems,
    checkWordTriggers,
    checkAchievementTriggers,
    resetUnlocks
  };
} 