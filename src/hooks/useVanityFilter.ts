/**
 * React Hook for Vanity Filter Management
 * 
 * Manages vanity filter state including:
 * - Whether user has unlocked the vanity toggle feature
 * - Whether the vanity filter is currently on/off
 * - localStorage persistence
 * - Integration with existing vanity display system
 */

import { useState, useEffect, useCallback } from 'react';
import { getVanityDisplayWord, shouldUnlockVanityToggle } from '../../packages/engine/dictionary';
import { createBrowserAdapter } from '../adapters/browserAdapter';
import type { VanityState, VanityDisplayOptions } from '../../packages/engine/dictionary';
import type { WordDataDependencies } from '../../packages/engine/interfaces';

export interface UseVanityFilterReturn {
  // Current state
  vanityState: VanityState;
  isLoading: boolean;
  
  // Queries
  isVanityFilterUnlocked: () => boolean;
  isVanityFilterOn: () => boolean;
  shouldWordUnlockVanity: (word: string) => boolean;
  
  // Actions
  unlockVanityToggle: () => void;
  toggleVanityFilter: () => void;
  setVanityFilter: (enabled: boolean) => void;
  
  // Display helpers
  getDisplayWord: (word: string, options?: { isEditing?: boolean }) => string;
  resetVanityState: () => void;
}

const STORAGE_KEY_UNLOCKED = 'wordplay-vanity-unlocked';
const STORAGE_KEY_FILTER = 'wordplay-vanity-filter';

/**
 * Hook for managing vanity filter state in React components
 */
export function useVanityFilter(): UseVanityFilterReturn {
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
  
  const [isLoading] = useState(false);
  const [wordData, setWordData] = useState<WordDataDependencies | null>(null);

  // Initialize browser adapter and get word data
  useEffect(() => {
    const initializeWordData = async () => {
      try {
        const adapter = await createBrowserAdapter();
        const adapterWordData = adapter.getWordData();
        setWordData(adapterWordData);
      } catch (error) {
        console.warn('Failed to initialize word data for vanity filter:', error);
      }
    };

    initializeWordData();
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

  const shouldWordUnlockVanity = useCallback((word: string): boolean => {
    if (!wordData) return false;
    // Check if word is profane using browser adapter data
    const normalizedWord = word.trim().toUpperCase();
    return wordData.profanityWords.has(normalizedWord);
  }, [wordData]);

  // Action functions
  const unlockVanityToggle = useCallback((): void => {
    setVanityState(prev => ({
      ...prev,
      hasUnlockedToggle: true
    }));
  }, []);

  const toggleVanityFilter = useCallback((): void => {
    if (!vanityState.hasUnlockedToggle) {
      console.warn('Cannot toggle vanity filter - feature not unlocked yet');
      return;
    }
    
    setVanityState(prev => ({
      ...prev,
      isVanityFilterOn: !prev.isVanityFilterOn
    }));
  }, [vanityState.hasUnlockedToggle]);

  const setVanityFilter = useCallback((enabled: boolean): void => {
    if (!vanityState.hasUnlockedToggle) {
      console.warn('Cannot set vanity filter - feature not unlocked yet');
      return;
    }
    
    setVanityState(prev => ({
      ...prev,
      isVanityFilterOn: enabled
    }));
  }, [vanityState.hasUnlockedToggle]);

  // Display helper function
  const getDisplayWord = useCallback((word: string, options: { isEditing?: boolean } = {}): string => {
    const displayOptions: VanityDisplayOptions = {
      vanityState,
      isEditing: options.isEditing
    };
    
    return getVanityDisplayWord(word, displayOptions);
  }, [vanityState]);

  // Reset function for testing/debug
  const resetVanityState = useCallback((): void => {
    setVanityState({
      hasUnlockedToggle: false,
      isVanityFilterOn: true
    });
  }, []);

  return {
    vanityState,
    isLoading,
    isVanityFilterUnlocked,
    isVanityFilterOn,
    shouldWordUnlockVanity,
    unlockVanityToggle,
    toggleVanityFilter,
    setVanityFilter,
    getDisplayWord,
    resetVanityState
  };
} 