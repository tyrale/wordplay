/**
 * Word Path Graph Context Provider
 *
 * Wraps `hooks/useWordPathGraph` in a single shared context so every
 * consumer (ZenGame, InteractiveGame, ChallengeGame, and the "paths"
 * WordPathExplorer inside Menu) reads and writes the *same* in-memory
 * graph/engine instance.
 *
 * Before this provider existed, each of those components called the
 * `useWordPathGraph` hook directly, which created its own independent
 * engine and loaded its own snapshot of the persisted graph on mount.
 * Since Menu (and the WordPathExplorer nested inside it) is mounted for
 * the entire lifetime of a game screen, its snapshot was taken once at
 * game start and never refreshed - so words played later in that same
 * session (recorded into the *game's* own separate engine instance)
 * would correctly persist to storage, but wouldn't show up as "seen"
 * in the paths explorer until the app was restarted and Menu re-mounted
 * with a fresh load. Centralizing state here fixes that staleness.
 */
import React from 'react';
import { WordPathGraphContext } from './wordPathGraph';
import type { ReactNode } from 'react';
import { useWordPathGraph as useWordPathGraphState } from '../hooks/useWordPathGraph';

interface WordPathGraphProviderProps {
  children: ReactNode;
}

export const WordPathGraphProvider: React.FC<WordPathGraphProviderProps> = ({
  children,
}) => {
  const state = useWordPathGraphState();
  return (
    <WordPathGraphContext.Provider value={state}>
      {children}
    </WordPathGraphContext.Provider>
  );
};
