import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWordPathGraphDependencies } from '../nativeWordPathAdapter';
import { getInitialWordPathGraph } from '@wordplay/engine/word-path-graph';

describe('nativeWordPathAdapter', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads the initial graph when nothing has been saved', async () => {
    const deps = createWordPathGraphDependencies();
    const graph = await deps.loadState();
    expect(graph).toEqual(getInitialWordPathGraph());
  });

  it('round-trips a saved graph through AsyncStorage', async () => {
    const deps = createWordPathGraphDependencies();
    const modified = {
      ...getInitialWordPathGraph(),
      nodes: { CAT: true as const },
      totalWordsSeen: 1
    };

    await deps.saveState(modified);
    const loaded = await deps.loadState();

    expect(loaded.nodes.CAT).toBe(true);
    expect(loaded.totalWordsSeen).toBe(1);
  });

  it('falls back to the initial graph for invalid saved data', async () => {
    await AsyncStorage.setItem('wordplay-word-path-graph', JSON.stringify({ garbage: true }));

    const deps = createWordPathGraphDependencies();
    const loaded = await deps.loadState();

    expect(loaded).toEqual(getInitialWordPathGraph());
  });
});
