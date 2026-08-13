/**
 * Native Round Length Context Provider.
 *
 * Direct port of apps/web's `contexts/RoundLengthContext.tsx` logic, with
 * AsyncStorage instead of `localStorage` (see MechanicsSettingsContext.tsx's
 * doc comment for why that means an effect-based load instead of a
 * synchronous `useState` initializer).
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_ROUND_LENGTH = 20;

export interface RoundLengthContextValue {
  roundLength: number;
  setRoundLength: (length: number) => void;
}

const RoundLengthContext = createContext<RoundLengthContextValue | null>(null);

const STORAGE_KEY = 'wordplay-round-length';

interface RoundLengthProviderProps {
  children: ReactNode;
}

export const RoundLengthProvider: React.FC<RoundLengthProviderProps> = ({ children }) => {
  const [roundLength, setRoundLengthState] = useState<number>(DEFAULT_ROUND_LENGTH);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        const parsed = stored ? parseInt(stored, 10) : NaN;
        if (isMounted && Number.isFinite(parsed) && parsed > 0) {
          setRoundLengthState(parsed);
        }
      })
      .catch(error => console.warn('Failed to load round length from AsyncStorage:', error));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, String(roundLength)).catch(error => {
      console.warn('Failed to save round length to AsyncStorage:', error);
    });
  }, [roundLength]);

  const setRoundLength = useCallback((length: number): void => {
    setRoundLengthState(length);
  }, []);

  const contextValue: RoundLengthContextValue = { roundLength, setRoundLength };

  return <RoundLengthContext.Provider value={contextValue}>{children}</RoundLengthContext.Provider>;
};

export const useRoundLength = (): RoundLengthContextValue => {
  const context = useContext(RoundLengthContext);
  if (!context) {
    throw new Error('useRoundLength must be used within a RoundLengthProvider');
  }
  return context;
};
