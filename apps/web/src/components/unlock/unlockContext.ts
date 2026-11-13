/**
 * Unlock system context, its types and the `useUnlockSystem` hook.
 * Kept apart from `UnlockProvider.tsx` so that file only exports a
 * component (React Fast Refresh requirement).
 */

import { createContext, useContext } from 'react';
import type { UseUnlocksReturn } from '../../hooks/useUnlocks';
import type { UnlockResult } from '@wordplay/engine/interfaces';

export interface HandleWordSubmissionOptions {
  /**
   * Whether this submission came from the local player's own input (vs a
   * bot move or a remote opponent's move observed via game state). Defaults
   * to `true`. Only the local player's own "RESET" submission wipes their
   * unlocks (and only the first time - see `hasUsedReset`) - a bot/opponent
   * playing "RESET" is treated as a normal word so it can't clobber another
   * player's progress.
   */
  isLocalMove?: boolean;
}

export interface UnlockContextType extends UseUnlocksReturn {
  // Enhanced functionality
  handleWordSubmission: (
    word: string,
    isProfane?: boolean,
    options?: HandleWordSubmissionOptions
  ) => Promise<UnlockResult[]>;
  handleGameCompletion: (
    winner: string | null,
    botId?: string
  ) => Promise<UnlockResult[]>;
  /** Check the game's word path for sequence-triggered unlocks (e.g. STINK→STANK→STUNK). */
  handleWordPathChange: (wordPath: string[]) => Promise<UnlockResult[]>;
  showUnlockNotification: (results: UnlockResult[]) => void;

  // Testing/Debug functions
  resetUnlocksToFresh: () => Promise<void>;
}

export const UnlockContext = createContext<UnlockContextType | undefined>(
  undefined
);

export const useUnlockSystem = () => {
  const context = useContext(UnlockContext);
  if (!context) {
    throw new Error('useUnlockSystem must be used within an UnlockProvider');
  }
  return context;
};
