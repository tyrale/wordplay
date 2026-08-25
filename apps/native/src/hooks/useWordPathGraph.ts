/**
 * React Hook for the Word Path Graph (native)
 *
 * Direct port of apps/web's `hooks/useWordPathGraph.ts`, backed by
 * `nativeWordPathAdapter.ts` (AsyncStorage) instead of web's
 * IndexedDB/localStorage adapter - the shared engine
 * (`@wordplay/engine/word-path-graph`) is untouched.
 *
 * `syncToServer` is a documented no-op here, not a real port: web's
 * version uploads newly-discovered edges to a server-side "master graph"
 * (`supabaseWordPathAdapter.ts`) that only feeds the not-yet-ported
 * community-stats feature - nothing in this port's own UI (the
 * `WordPathExplorer`, which only ever reads the *local* graph) depends on
 * it. Kept as a same-shaped async no-op rather than removed so call
 * sites can mirror web's exact wiring (`recordTransition(...).then(()
 * => syncToServer())`) verbatim, with no native-specific branching.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createWordPathGraphEngine, getInitialWordPathGraph } from '@wordplay/engine/word-path-graph';
import { createWordPathGraphDependencies } from '../adapters/nativeWordPathAdapter';
import type { WordPathGraphEngine, WordPathGraph } from '@wordplay/engine/word-path-graph';

export interface UseWordPathGraphReturn {
  graph: WordPathGraph;
  isLoading: boolean;

  recordTransition: (previousWord: string, newWord: string) => Promise<void>;
  getConnectedWords: (word: string) => string[];
  hasSeenWord: (word: string) => boolean;
  getUnsyncedEdges: () => Array<[string, string]>;
  markEdgesSynced: (edges: Array<[string, string]>) => Promise<void>;
  /** No-op on native - see this file's header comment. */
  syncToServer: () => Promise<void>;
  resetGraph: () => Promise<void>;
}

export function useWordPathGraph(): UseWordPathGraphReturn {
  const [graph, setGraph] = useState<WordPathGraph>(getInitialWordPathGraph());
  const [isLoading, setIsLoading] = useState(true);
  const engineRef = useRef<WordPathGraphEngine | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeEngine = async () => {
      try {
        const dependencies = createWordPathGraphDependencies();
        const engine = createWordPathGraphEngine(dependencies);

        if (mounted) {
          engineRef.current = engine;
          await engine.initialize();
          setGraph(engine.getGraph());
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize word path graph engine:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeEngine();

    return () => {
      mounted = false;
    };
  }, []);

  const recordTransition = useCallback(async (previousWord: string, newWord: string): Promise<void> => {
    if (!engineRef.current) return;

    try {
      const newGraph = await engineRef.current.recordTransition(previousWord, newWord);
      setGraph({ ...newGraph });
    } catch (error) {
      console.error('Error recording word path transition:', error);
    }
  }, []);

  const getConnectedWords = useCallback((word: string): string[] => {
    if (!engineRef.current) return [];
    return engineRef.current.getConnectedWords(word);
  }, []);

  const hasSeenWord = useCallback((word: string): boolean => {
    if (!engineRef.current) return false;
    return engineRef.current.hasSeenWord(word);
  }, []);

  const getUnsyncedEdges = useCallback((): Array<[string, string]> => {
    if (!engineRef.current) return [];
    return engineRef.current.getUnsyncedEdges();
  }, []);

  const markEdgesSynced = useCallback(async (edges: Array<[string, string]>): Promise<void> => {
    if (!engineRef.current) return;
    await engineRef.current.markEdgesSynced(edges);
    setGraph({ ...engineRef.current.getGraph() });
  }, []);

  const syncToServer = useCallback(async (): Promise<void> => {
    // No-op - see this file's header comment.
  }, []);

  const resetGraph = useCallback(async (): Promise<void> => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.reset();
      setGraph(engineRef.current.getGraph());
    } catch (error) {
      console.error('Error resetting word path graph:', error);
    }
  }, []);

  return {
    graph,
    isLoading,
    recordTransition,
    getConnectedWords,
    hasSeenWord,
    getUnsyncedEdges,
    markEdgesSynced,
    syncToServer,
    resetGraph
  };
}
