import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWordPathGraph } from '../useWordPathGraph';

describe('native useWordPathGraph', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads an empty graph initially', async () => {
    const { result } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSeenWord('CAT')).toBe(false);
    expect(result.current.getConnectedWords('CAT')).toEqual([]);
  });

  it('records a transition, marking both words seen and connecting them', async () => {
    const { result } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordTransition('CAT', 'CATS');
    });

    expect(result.current.hasSeenWord('CAT')).toBe(true);
    expect(result.current.hasSeenWord('CATS')).toBe(true);
    expect(result.current.getConnectedWords('CAT')).toEqual(['CATS']);
    expect(result.current.getConnectedWords('CATS')).toEqual(['CAT']);
  });

  it('does not create an edge for a pass (unchanged word), but still marks it seen', async () => {
    const { result } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordTransition('CAT', 'CAT');
    });

    expect(result.current.hasSeenWord('CAT')).toBe(true);
    expect(result.current.getConnectedWords('CAT')).toEqual([]);
  });

  it('persists the graph across a remount (AsyncStorage-backed)', async () => {
    const { result } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordTransition('CAT', 'CATS');
    });

    const { result: result2 } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result2.current.isLoading).toBe(false));
    expect(result2.current.getConnectedWords('CAT')).toEqual(['CATS']);
  });

  it('syncToServer is a documented no-op (no community-stats server sync ported)', async () => {
    const { result } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordTransition('CAT', 'CATS');
    });

    // Should resolve without throwing and leave unsynced edges exactly as
    // they were (nothing gets marked synced by this no-op).
    await act(async () => {
      await result.current.syncToServer();
    });
    expect(result.current.getUnsyncedEdges()).toEqual([['CAT', 'CATS']]);
  });

  it('resetGraph clears all nodes/edges and persists the reset', async () => {
    const { result } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordTransition('CAT', 'CATS');
    });
    expect(result.current.hasSeenWord('CAT')).toBe(true);

    await act(async () => {
      await result.current.resetGraph();
    });

    expect(result.current.hasSeenWord('CAT')).toBe(false);
    expect(result.current.getConnectedWords('CAT')).toEqual([]);
  });
});
