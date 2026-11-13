/**
 * Round length context, its value type, the default length and the
 * `useRoundLength` hook. Kept apart from `RoundLengthContext.tsx` so that
 * file only exports a component (React Fast Refresh requirement).
 */

import { createContext, useContext } from 'react';

export const DEFAULT_ROUND_LENGTH = 20;

export interface RoundLengthContextValue {
  roundLength: number;
  setRoundLength: (length: number) => void;
}

export const RoundLengthContext = createContext<RoundLengthContextValue | null>(
  null
);

export const useRoundLength = (): RoundLengthContextValue => {
  const context = useContext(RoundLengthContext);
  if (!context) {
    throw new Error('useRoundLength must be used within a RoundLengthProvider');
  }
  return context;
};
