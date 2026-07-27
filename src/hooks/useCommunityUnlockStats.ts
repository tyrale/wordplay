/**
 * Community Unlock Stats Hook
 *
 * Fetches community-wide unlock progress (how many of all possible
 * unlockables have been found by *someone*, across every player) once the
 * "community-stats" mechanic (triggered by playing "world") is unlocked.
 * Mirrors the shape of the personal `getUnlockProgress()` counter so the
 * two lines in the menu ("x/x unlocked" vs "x/x found worldwide") read
 * consistently.
 */

import { useEffect, useState } from 'react';
import { fetchCommunityUnlockStats } from '../adapters/supabaseCommunityUnlocksAdapter';
import { UNLOCK_DEFINITIONS } from '../../packages/engine/unlock-definitions';

export interface CommunityUnlockProgress {
  unlocked: number;
  total: number;
  isLoading: boolean;
}

export function useCommunityUnlockStats(enabled: boolean): CommunityUnlockProgress {
  const [progress, setProgress] = useState<CommunityUnlockProgress>({
    unlocked: 0,
    total: UNLOCK_DEFINITIONS.length,
    isLoading: enabled
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setProgress(prev => ({ ...prev, isLoading: true }));

    fetchCommunityUnlockStats()
      .then(stats => {
        if (cancelled) return;
        const unlocked = UNLOCK_DEFINITIONS.reduce(
          (count, def) => (def.id && (stats.counts[def.id] ?? 0) > 0 ? count + 1 : count),
          0
        );
        setProgress({ unlocked, total: UNLOCK_DEFINITIONS.length, isLoading: false });
      })
      .catch(error => {
        console.warn('Failed to fetch community unlock stats:', error);
        if (!cancelled) setProgress(prev => ({ ...prev, isLoading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return progress;
}
