/**
 * Direct port of the small inline `useDictionaryValidation`/local
 * `wordData` state web's InteractiveGame.tsx and ChallengeGame.tsx each
 * duplicate - extracted to a single shared hook here rather than
 * duplicated per screen, since native has no reason to repeat it
 * (there's no equivalent constraint forcing web's per-file copies).
 *
 * Loads the full word-data dependency (all 6 sets + profanity) via the
 * native adapter, waiting for it to finish loading if needed, so the
 * "?" help feature (see utils/wordHelp.ts) can check which word set a
 * word belongs to and word-submission profanity checks have the same
 * data available.
 */
import { useEffect, useState } from 'react';
import type { WordDataDependencies } from '@wordplay/engine/interfaces';
import { createNativeAdapter } from '../adapters/nativeAdapter';

export interface UseDictionaryDataReturn {
  wordData: WordDataDependencies | null;
  isLoaded: boolean;
}

export function useDictionaryData(): UseDictionaryDataReturn {
  const [wordData, setWordData] = useState<WordDataDependencies | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const adapter = await createNativeAdapter();
        const data = adapter.getWordData();

        if (data && typeof data.waitForLoad === 'function') {
          await data.waitForLoad();
        }

        if (isMounted) {
          setWordData(data);
          setIsLoaded(true);
        }
      } catch (error) {
        console.warn('Failed to load dictionary data:', error);
        if (isMounted) setIsLoaded(true);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return { wordData, isLoaded };
}
