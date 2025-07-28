/**
 * Vanity Filter Context Provider
 * Centralizes vanity filter state management for live updates across all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getVanityDisplayWordWithDependencies, shouldUnlockVanityToggleWithDependencies, type VanityState } from '../../packages/engine/dictionary';
import type { WordDataDependencies } from '../../packages/engine/interfaces';
import { createBrowserAdapter } from '../adapters/browserAdapter';

export interface VanityFilterContextValue {
  // State
  vanityState: VanityState;
  isLoading: boolean;
  wordData: WordDataDependencies | null;
  
  // Display functions
  getDisplayWord: (word: string, options?: { isEditing?: boolean }) => string;
  
  // Toggle functions
  toggleVanityFilter: () => void;
  unlockVanityToggle: () => void;
  
  // Query functions
  isVanityFilterUnlocked: () => boolean;
  isVanityFilterOn: () => boolean;
  shouldWordUnlockVanity: (word: string) => boolean;
}

const VanityFilterContext = createContext<VanityFilterContextValue | null>(null);

const STORAGE_KEY_UNLOCKED = 'wordplay-vanity-unlocked';
const STORAGE_KEY_FILTER = 'wordplay-vanity-filter';

interface VanityFilterProviderProps {
  children: ReactNode;
}

export const VanityFilterProvider: React.FC<VanityFilterProviderProps> = ({ children }) => {
  const [vanityState, setVanityState] = useState<VanityState>(() => {
    // Initialize from localStorage
    try {
      const hasUnlockedToggle = localStorage.getItem(STORAGE_KEY_UNLOCKED) === 'true';
      const isVanityFilterOn = localStorage.getItem(STORAGE_KEY_FILTER) !== 'false'; // Default to true
      return {
        hasUnlockedToggle,
        isVanityFilterOn
      };
    } catch (error) {
      console.warn('Failed to load vanity filter state from localStorage:', error);
      return {
        hasUnlockedToggle: false,
        isVanityFilterOn: true
      };
    }
  });
  
  const [wordData, setWordData] = useState<WordDataDependencies | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Initialize word data
  useEffect(() => {
    let mounted = true;
    
    const initializeWordData = async () => {
      try {
        const adapter = await createBrowserAdapter();
        const data = adapter.getWordData();
        
        if (data && typeof data.waitForLoad === 'function') {
          await data.waitForLoad();
        }
        
        if (mounted) {
          setWordData(data);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to initialize word data for VanityFilterProvider:', error);
      }
    };
    
    initializeWordData();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_UNLOCKED, vanityState.hasUnlockedToggle.toString());
      localStorage.setItem(STORAGE_KEY_FILTER, vanityState.isVanityFilterOn.toString());
    } catch (error) {
      console.warn('Failed to save vanity filter state to localStorage:', error);
    }
  }, [vanityState]);

  // Query functions
  const isVanityFilterUnlocked = useCallback((): boolean => {
    return vanityState.hasUnlockedToggle;
  }, [vanityState.hasUnlockedToggle]);

  const isVanityFilterOn = useCallback((): boolean => {
    return vanityState.isVanityFilterOn;
  }, [vanityState.isVanityFilterOn]);

  const getDisplayWord = useCallback((word: string, options: { isEditing?: boolean } = {}): string => {
    if (!wordData || !isLoaded) {
      // Return word as-is if word data not loaded yet
      return word.trim().toUpperCase();
    }
    return getVanityDisplayWordWithDependencies(word, vanityState, wordData, options);
  }, [vanityState, wordData, isLoaded]);

  const shouldWordUnlockVanity = useCallback((word: string): boolean => {
    if (!wordData || !isLoaded) {
      return false;
    }
    return shouldUnlockVanityToggleWithDependencies(word, wordData);
  }, [wordData, isLoaded]);

  const toggleVanityFilter = useCallback((): void => {
    setVanityState((prev: VanityState) => ({
      ...prev,
      isVanityFilterOn: !prev.isVanityFilterOn
    }));
  }, []);

  const unlockVanityToggle = useCallback((): void => {
    setVanityState((prev: VanityState) => ({
      ...prev,
      hasUnlockedToggle: true
    }));
  }, []);

  const contextValue: VanityFilterContextValue = {
    vanityState,
    isLoading: !isLoaded,
    wordData,
    getDisplayWord,
    toggleVanityFilter,
    unlockVanityToggle,
    isVanityFilterUnlocked,
    isVanityFilterOn,
    shouldWordUnlockVanity
  };

  return (
    <VanityFilterContext.Provider value={contextValue}>
      {children}
    </VanityFilterContext.Provider>
  );
};

export const useVanityFilter = (): VanityFilterContextValue => {
  const context = useContext(VanityFilterContext);
  if (!context) {
    throw new Error('useVanityFilter must be used within a VanityFilterProvider');
  }
  return context;
}; 