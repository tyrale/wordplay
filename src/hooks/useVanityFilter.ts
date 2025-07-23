/**
 * React Hook for Vanity Filter State Management
 */

import { useState, useEffect, useCallback } from 'react';
import { getVanityDisplayWordWithDependencies, shouldUnlockVanityToggleWithDependencies, type VanityState } from '../../packages/engine/dictionary';
import type { WordDataDependencies } from '../../packages/engine/interfaces';
import { useBrowserAdapter } from './useBrowserAdapter';

export interface UseVanityFilterReturn {
  // State
  vanityState: VanityState;
  isLoading: boolean;
  
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

const STORAGE_KEY_UNLOCKED = 'wordplay-vanity-unlocked';
const STORAGE_KEY_FILTER = 'wordplay-vanity-filter';

/**
 * Hook for managing vanity filter state in React components
 */
export function useVanityFilter(): UseVanityFilterReturn {
  const { wordData, isLoaded } = useBrowserAdapter();
  
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
    if (!wordData || !isLoaded) return false;
    return shouldUnlockVanityToggleWithDependencies(word, wordData);
  }, [wordData, isLoaded]);

  // Toggle functions
  const toggleVanityFilter = useCallback(() => {
    setVanityState((prev: VanityState) => ({
      ...prev,
      isVanityFilterOn: !prev.isVanityFilterOn
    }));
  }, []);

  const unlockVanityToggle = useCallback(() => {
    setVanityState((prev: VanityState) => ({
      ...prev,
      hasUnlockedToggle: true
    }));
  }, []);

  return {
    vanityState,
    isLoading: !isLoaded,
    getDisplayWord,
    toggleVanityFilter,
    unlockVanityToggle,
    isVanityFilterUnlocked,
    isVanityFilterOn,
    shouldWordUnlockVanity
  };
} 