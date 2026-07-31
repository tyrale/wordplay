/**
 * React Hook for the Word Path Graph
 *
 * Provides local word-path-graph state management and move recording for
 * the web app, integrating the platform-agnostic word path graph engine
 * with React state management. Mirrors `usePlayerStats.ts`.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createWordPathGraphEngine } from '../../packages/engine/word-path-graph';
import { getInitialWordPathGraph } from '../../packages/engine/word-path-graph';
import { createWordPathGraphDependencies } from '../adapters/browserWordPathAdapter';
import { syncWordPathEdges } from '../adapters/supabaseWordPathAdapter';
import type { WordPathGraphEngine, WordPathGraph } from '../../packages/engine/word-path-graph';

export interface UseWordPathGraphReturn {
  graph: WordPathGraph;
  isLoading: boolean;

  recordTransition: (previousWord: string, newWord: string) => Promise<void>;
  getConnectedWords: (word: string) => string[];
  hasSeenWord: (word: string) => boolean;
  getUnsyncedEdges: () => Array<[string, string]>;
  markEdgesSynced: (edges: Array<[string, string]>) => Promise<void>;
  /** Uploads any not-yet-synced edges to the server's master word path graph. */
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
    if (!engineRef.current) return;

    try {
      const unsyncedEdges = engineRef.current.getUnsyncedEdges();
      if (unsyncedEdges.length === 0) return;

      const succeeded = await syncWordPathEdges(unsyncedEdges);
      if (succeeded) {
        await engineRef.current.markEdgesSynced(unsyncedEdges);
        setGraph({ ...engineRef.current.getGraph() });
      }
    } catch (error) {
      console.warn('Error syncing word path graph to server:', error);
    }
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
