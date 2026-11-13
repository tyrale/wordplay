/**
 * Vanity filter context, its value type and the `useVanityFilter` hook.
 * Kept apart from `VanityFilterContext.tsx` so that file only exports a
 * component (React Fast Refresh requirement).
 */

import { createContext, useContext } from 'react';
import type { VanityState } from '@wordplay/engine/dictionary';
import type { WordDataDependencies } from '@wordplay/engine/interfaces';

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

export const VanityFilterContext =
  createContext<VanityFilterContextValue | null>(null);

export const useVanityFilter = (): VanityFilterContextValue => {
  const context = useContext(VanityFilterContext);
  if (!context) {
    throw new Error(
      'useVanityFilter must be used within a VanityFilterProvider'
    );
  }
  return context;
};
