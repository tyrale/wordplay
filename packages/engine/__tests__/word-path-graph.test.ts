/**
 * Word Path Graph Engine Tests
 *
 * Tests for the local word path graph: node/edge recording, pass handling,
 * connected-word lookups, sync-tracking, and persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWordPathGraphEngine, getInitialWordPathGraph, edgeKey, coerceWordPathGraph } from '../word-path-graph';
import type { WordPathGraphDependencies, WordPathGraphEngine, WordPathGraph } from '../word-path-graph';

function createTestWordPathGraphDependencies(initial?: WordPathGraph): WordPathGraphDependencies {
  let state: WordPathGraph = initial ?? getInitialWordPathGraph();
  const now = 1_700_000_000_000; // fixed base timestamp

  return {
    loadState: async () => state,
    saveState: async (newState: WordPathGraph) => { state = newState; },
    getTimestamp: () => now
  };
}

describe('Word Path Graph Engine', () => {
  let engine: WordPathGraphEngine;

  beforeEach(async () => {
    engine = createWordPathGraphEngine(createTestWordPathGraphDependencies());
    await engine.initialize();
  });

  it('starts with an empty graph', () => {
    const graph = engine.getGraph();
    expect(graph.totalWordsSeen).toBe(0);
    expect(graph.totalEdges).toBe(0);
  });

  it('records both words as seen and creates an edge for an actual word change', async () => {
    await engine.recordTransition('CAT', 'CATS');

    expect(engine.hasSeenWord('CAT')).toBe(true);
    expect(engine.hasSeenWord('CATS')).toBe(true);
    expect(engine.getConnectedWords('CAT')).toEqual(['CATS']);
    expect(engine.getConnectedWords('CATS')).toEqual(['CAT']);
    expect(engine.getGraph().totalEdges).toBe(1);
  });

  it('does not create an edge for a pass (unchanged word)', async () => {
    await engine.recordTransition('CAT', 'CAT');

    expect(engine.hasSeenWord('CAT')).toBe(true);
    expect(engine.getConnectedWords('CAT')).toEqual([]);
    expect(engine.getGraph().totalEdges).toBe(0);
  });

  it('normalizes word casing/whitespace when recording and looking up', async () => {
    await engine.recordTransition(' cat ', 'cats');

    expect(engine.hasSeenWord('CAT')).toBe(true);
    expect(engine.hasSeenWord('cats')).toBe(true);
    expect(engine.getConnectedWords('Cat')).toEqual(['CATS']);
  });

  it('accumulates multiple connections for the same word', async () => {
    await engine.recordTransition('CAT', 'CATS');
    await engine.recordTransition('CAT', 'COT');
    await engine.recordTransition('CAT', 'BAT');

    expect(engine.getConnectedWords('CAT')).toEqual(['BAT', 'CATS', 'COT']);
    expect(engine.getGraph().totalEdges).toBe(3);
  });

  it('does not double-count an edge recorded multiple times', async () => {
    await engine.recordTransition('CAT', 'CATS');
    await engine.recordTransition('CAT', 'CATS');

    expect(engine.getConnectedWords('CAT')).toEqual(['CATS']);
    expect(engine.getGraph().totalEdges).toBe(1);
  });

  it('records the first word of a game (empty previousWord) as seen with no edge', async () => {
    await engine.recordTransition('', 'CAT');

    expect(engine.hasSeenWord('CAT')).toBe(true);
    expect(engine.getConnectedWords('CAT')).toEqual([]);
    expect(engine.getGraph().totalEdges).toBe(0);
  });

  it('returns an empty array for an unseen word', () => {
    expect(engine.getConnectedWords('ZZZZZ')).toEqual([]);
    expect(engine.hasSeenWord('ZZZZZ')).toBe(false);
  });

  describe('sync tracking', () => {
    it('reports newly-created edges as unsynced', async () => {
      await engine.recordTransition('CAT', 'CATS');
      await engine.recordTransition('CATS', 'BATS');

      const unsynced = engine.getUnsyncedEdges();
      expect(unsynced).toHaveLength(2);
      expect(unsynced.map(([a, b]) => edgeKey(a, b)).sort()).toEqual(
        [edgeKey('CAT', 'CATS'), edgeKey('CATS', 'BATS')].sort()
      );
    });

    it('excludes edges once marked synced', async () => {
      await engine.recordTransition('CAT', 'CATS');
      await engine.recordTransition('CATS', 'BATS');

      await engine.markEdgesSynced([['CAT', 'CATS']]);

      const unsynced = engine.getUnsyncedEdges();
      expect(unsynced).toHaveLength(1);
      expect(edgeKey(unsynced[0][0], unsynced[0][1])).toBe(edgeKey('CATS', 'BATS'));
    });

    it('re-marks a new occurrence of a previously-synced edge as already synced', async () => {
      await engine.recordTransition('CAT', 'CATS');
      await engine.markEdgesSynced([['CAT', 'CATS']]);

      // Recording the same edge again (e.g. a rematch) shouldn't re-flag it as unsynced.
      await engine.recordTransition('CAT', 'CATS');

      expect(engine.getUnsyncedEdges()).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('persists graph state across engine instances via shared dependencies', async () => {
      const dependencies = createTestWordPathGraphDependencies();
      const engineA = createWordPathGraphEngine(dependencies);
      await engineA.initialize();
      await engineA.recordTransition('CAT', 'CATS');

      const engineB = createWordPathGraphEngine(dependencies);
      await engineB.initialize();

      expect(engineB.hasSeenWord('CAT')).toBe(true);
      expect(engineB.getConnectedWords('CAT')).toEqual(['CATS']);
    });

    it('resets to an empty graph', async () => {
      await engine.recordTransition('CAT', 'CATS');
      await engine.reset();

      expect(engine.getGraph().totalWordsSeen).toBe(0);
      expect(engine.getGraph().totalEdges).toBe(0);
      expect(engine.hasSeenWord('CAT')).toBe(false);
    });
  });

  describe('coerceWordPathGraph', () => {
    it('returns a fresh graph for invalid input', () => {
      expect(coerceWordPathGraph(null)).toEqual(getInitialWordPathGraph());
      expect(coerceWordPathGraph({ foo: 'bar' })).toEqual(getInitialWordPathGraph());
    });

    it('fills in missing fields on partially-valid input with defaults', () => {
      const coerced = coerceWordPathGraph({ nodes: { CAT: true }, edges: {}, totalWordsSeen: 1 });
      expect(coerced.nodes).toEqual({ CAT: true });
      expect(coerced.syncedEdgeKeys).toEqual({});
    });
  });

  describe('edgeKey', () => {
    it('is order-independent and case-insensitive', () => {
      expect(edgeKey('CAT', 'DOG')).toBe(edgeKey('DOG', 'CAT'));
      expect(edgeKey('cat', 'dog')).toBe(edgeKey('CAT', 'DOG'));
    });
  });
});
