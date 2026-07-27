/**
 * Round Length Context Provider
 *
 * Tracks the player's selected round length (number of turns per game).
 * Unlocking a round length (e.g. 'round-length-10', see
 * packages/engine/unlock-definitions.ts) makes it available as an option in
 * the mechanics menu - this context tracks which one is currently selected
 * and persists that choice across sessions. Only one round length can be
 * selected at a time, unlike other mechanics which are independent toggles.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

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
  const [roundLength, setRoundLengthState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? parseInt(stored, 10) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROUND_LENGTH;
    } catch (error) {
      console.warn('Failed to load round length from localStorage:', error);
      return DEFAULT_ROUND_LENGTH;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(roundLength));
    } catch (error) {
      console.warn('Failed to save round length to localStorage:', error);
    }
  }, [roundLength]);

  const setRoundLength = useCallback((length: number): void => {
    setRoundLengthState(length);
  }, []);

  const contextValue: RoundLengthContextValue = {
    roundLength,
    setRoundLength
  };

  return (
    <RoundLengthContext.Provider value={contextValue}>
      {children}
    </RoundLengthContext.Provider>
  );
};

export const useRoundLength = (): RoundLengthContextValue => {
  const context = useContext(RoundLengthContext);
  if (!context) {
    throw new Error('useRoundLength must be used within a RoundLengthProvider');
  }
  return context;
};
