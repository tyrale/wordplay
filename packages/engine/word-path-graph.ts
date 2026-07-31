/**
 * Word Path Graph Engine - Core Logic
 *
 * Platform-agnostic engine that maintains a local graph of every word a
 * player has ever seen (their own submissions plus any bot/opponent moves
 * observed in their games), connected by edges representing an actual word
 * change from one turn to the next (add/remove/rearrange/substitute a
 * letter). Passes - where the word is unchanged - do not create an edge,
 * though the word itself is still recorded as "seen".
 *
 * Follows WordPlay's established dependency-injection architecture pattern
 * for cross-platform compatibility (see `player-stats.ts` for the sibling
 * pattern this mirrors).
 */

/** A single word path graph, stored locally on the player's device. */
export interface WordPathGraph {
  /** Every word the player has ever seen (uppercase), as a lookup set. */
  nodes: Record<string, true>;
  /**
   * Undirected adjacency list: word -> set of words it has been directly
   * connected to via a real word-change move (in either direction).
   */
  edges: Record<string, Record<string, true>>;
  /**
   * Edge keys (`"WORDA|WORDB"`, alphabetically sorted) that have already
   * been uploaded to the server during a previous sync, so re-syncing only
   * sends newly-discovered edges.
   */
  syncedEdgeKeys: Record<string, true>;
  totalWordsSeen: number;
  totalEdges: number;
  lastUpdatedAt: number | null;
}

export interface WordPathGraphDependencies {
  loadState: () => Promise<WordPathGraph>;
  saveState: (state: WordPathGraph) => Promise<void>;
  getTimestamp?: () => number;
}

export interface WordPathGraphEngine {
  initialize(): Promise<void>;
  getGraph(): WordPathGraph;
  /**
   * Records a move from `previousWord` to `newWord`. Both words (if
   * non-empty) are marked as seen. An edge is only created between them if
   * they differ (a pass, where the word is unchanged, adds no edge).
   */
  recordTransition(previousWord: string, newWord: string): Promise<WordPathGraph>;
  getConnectedWords(word: string): string[];
  hasSeenWord(word: string): boolean;
  /** Edge pairs not yet marked as synced, for uploading to the server. */
  getUnsyncedEdges(): Array<[string, string]>;
  markEdgesSynced(edges: Array<[string, string]>): Promise<void>;
  reset(): Promise<void>;
}

export function getInitialWordPathGraph(): WordPathGraph {
  return {
    nodes: {},
    edges: {},
    syncedEdgeKeys: {},
    totalWordsSeen: 0,
    totalEdges: 0,
    lastUpdatedAt: null
  };
}

/** Normalizes a word for storage/lookup (uppercase, trimmed). */
function normalizeWord(word: string): string {
  return word.trim().toUpperCase();
}

/** Builds the canonical, order-independent key for an undirected edge. */
export function edgeKey(a: string, b: string): string {
  const [x, y] = [normalizeWord(a), normalizeWord(b)].sort();
  return `${x}|${y}`;
}

function isValidWordPathGraph(value: unknown): value is WordPathGraph {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.nodes === 'object' &&
    typeof state.edges === 'object' &&
    typeof state.totalWordsSeen === 'number'
  );
}

function withDefaults(loaded: Partial<WordPathGraph>): WordPathGraph {
  return { ...getInitialWordPathGraph(), ...loaded };
}

/** Parses/validates a loaded value, falling back to a fresh graph if invalid. */
export function coerceWordPathGraph(loaded: unknown): WordPathGraph {
  return isValidWordPathGraph(loaded) ? withDefaults(loaded) : getInitialWordPathGraph();
}

export function createWordPathGraphEngine(dependencies: WordPathGraphDependencies): WordPathGraphEngine {
  let currentGraph: WordPathGraph | null = null;
  const getTimestamp = dependencies.getTimestamp ?? (() => Date.now());

  async function ensureStateLoaded(): Promise<WordPathGraph> {
    if (currentGraph === null) {
      try {
        currentGraph = await dependencies.loadState();
      } catch (error) {
        console.warn('Failed to load word path graph, using initial state:', error);
        currentGraph = getInitialWordPathGraph();
      }
    }
    return currentGraph;
  }

  async function initialize(): Promise<void> {
    await ensureStateLoaded();
  }

  function getGraph(): WordPathGraph {
    return currentGraph ?? getInitialWordPathGraph();
  }

  function addNode(graph: WordPathGraph, word: string): void {
    if (!word) return;
    if (!graph.nodes[word]) {
      graph.nodes[word] = true;
      graph.totalWordsSeen += 1;
    }
  }

  function addEdge(graph: WordPathGraph, a: string, b: string): void {
    if (!a || !b || a === b) return;

    const isNewEdge = !graph.edges[a]?.[b];

    if (!graph.edges[a]) graph.edges[a] = {};
    if (!graph.edges[b]) graph.edges[b] = {};
    graph.edges[a][b] = true;
    graph.edges[b][a] = true;

    if (isNewEdge) {
      graph.totalEdges += 1;
    }
  }

  async function recordTransition(previousWord: string, newWord: string): Promise<WordPathGraph> {
    const graph = await ensureStateLoaded();

    const prev = normalizeWord(previousWord || '');
    const next = normalizeWord(newWord || '');

    if (!next) return graph;

    addNode(graph, next);
    if (prev) {
      addNode(graph, prev);
      if (prev !== next) {
        addEdge(graph, prev, next);
      }
    }

    graph.lastUpdatedAt = getTimestamp();
    await dependencies.saveState(graph);
    return graph;
  }

  function getConnectedWords(word: string): string[] {
    const graph = getGraph();
    const normalized = normalizeWord(word);
    const connections = graph.edges[normalized];
    if (!connections) return [];
    return Object.keys(connections).sort();
  }

  function hasSeenWord(word: string): boolean {
    const graph = getGraph();
    return !!graph.nodes[normalizeWord(word)];
  }

  function getUnsyncedEdges(): Array<[string, string]> {
    const graph = getGraph();
    const result: Array<[string, string]> = [];
    const seenKeys = new Set<string>();

    for (const wordA of Object.keys(graph.edges)) {
      for (const wordB of Object.keys(graph.edges[wordA])) {
        const key = edgeKey(wordA, wordB);
        if (seenKeys.has(key) || graph.syncedEdgeKeys[key]) continue;
        seenKeys.add(key);
        const [a, b] = key.split('|');
        result.push([a, b]);
      }
    }

    return result;
  }

  async function markEdgesSynced(edges: Array<[string, string]>): Promise<void> {
    const graph = await ensureStateLoaded();
    for (const [a, b] of edges) {
      graph.syncedEdgeKeys[edgeKey(a, b)] = true;
    }
    await dependencies.saveState(graph);
  }

  async function reset(): Promise<void> {
    currentGraph = getInitialWordPathGraph();
    await dependencies.saveState(currentGraph);
  }

  return {
    initialize,
    getGraph,
    recordTransition,
    getConnectedWords,
    hasSeenWord,
    getUnsyncedEdges,
    markEdgesSynced,
    reset
  };
}
