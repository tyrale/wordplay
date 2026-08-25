/**
 * Native Vanity (bad word) Filter Context - a scoped-down port of apps/web's
 * `contexts/VanityFilterContext.tsx`, with AsyncStorage instead of
 * `localStorage` (loaded async, same pattern as MechanicsSettingsContext).
 *
 * Web's context also exposes `isVanityFilterUnlocked()`/`unlockVanityToggle()`,
 * backed by a second, independent "hasUnlockedToggle" flag persisted under
 * its own `wordplay-vanity-unlocked` key - but nothing in web's own app
 * code ever calls `unlockVanityToggle()` outside that hook's own unit
 * tests, `getVanityDisplayWordWithDependencies` (packages/engine/
 * dictionary.ts) never actually reads `hasUnlockedToggle` either, and the
 * Menu's real gating of the "bad word filter" row uses the *generic*
 * engine unlock system instead (`getUnlockedItems('mechanic')` including
 * `'vanity-filter'`, triggered by the `'played_profanity'` achievement -
 * already wired on native via `UnlockProvider.handleWordSubmission`).
 * That second flag is dead weight on web; this port only carries over
 * the parts that are actually load-bearing: the on/off toggle and word
 * masking. Storage key (`wordplay-vanity-filter`) matches web's exactly,
 * per this port's "same AsyncStorage key names as web's localStorage
 * keys" convention (see docs/project/REACT_NATIVE_PORT_PLAN.md).
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVanityDisplayWordWithDependencies } from '@wordplay/engine/dictionary';
import { useDictionaryData } from '../hooks/useDictionaryData';

export interface VanityFilterContextValue {
  isVanityFilterOn: boolean;
  toggleVanityFilter: () => void;
  getDisplayWord: (word: string, options?: { isEditing?: boolean }) => string;
}

const VanityFilterContext = createContext<VanityFilterContextValue | null>(null);

const STORAGE_KEY_FILTER = 'wordplay-vanity-filter';

interface VanityFilterProviderProps {
  children: ReactNode;
}

export const VanityFilterProvider: React.FC<VanityFilterProviderProps> = ({ children }) => {
  // Defaults to true, matching web (`localStorage.getItem(...) !== 'false'`).
  const [isVanityFilterOn, setIsVanityFilterOn] = useState(true);
  const { wordData, isLoaded } = useDictionaryData();

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY_FILTER)
      .then(stored => {
        if (isMounted && stored !== null) setIsVanityFilterOn(stored !== 'false');
      })
      .catch(error => console.warn('Failed to load vanity filter state from AsyncStorage:', error));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_FILTER, isVanityFilterOn.toString()).catch(error => {
      console.warn('Failed to save vanity filter state to AsyncStorage:', error);
    });
  }, [isVanityFilterOn]);

  const toggleVanityFilter = useCallback((): void => {
    setIsVanityFilterOn(prev => !prev);
  }, []);

  const getDisplayWord = useCallback((word: string, options: { isEditing?: boolean } = {}): string => {
    if (!wordData || !isLoaded) {
      // Word data not loaded yet - show the word as-is, matching web.
      return word.trim().toUpperCase();
    }
    return getVanityDisplayWordWithDependencies(word, { hasUnlockedToggle: true, isVanityFilterOn }, wordData, options);
  }, [wordData, isLoaded, isVanityFilterOn]);

  const contextValue: VanityFilterContextValue = {
    isVanityFilterOn,
    toggleVanityFilter,
    getDisplayWord
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
