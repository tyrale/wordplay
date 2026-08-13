import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPlayerStatsDependencies } from '../nativePlayerStatsAdapter';
import { getInitialPlayerStats } from '@wordplay/engine/player-stats-definitions';

describe('nativePlayerStatsAdapter', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads the initial state when nothing has been saved', async () => {
    const deps = createPlayerStatsDependencies();
    const state = await deps.loadState();
    expect(state).toEqual(getInitialPlayerStats());
  });

  it('round-trips saved stats through AsyncStorage', async () => {
    const deps = createPlayerStatsDependencies();
    const modified = { ...getInitialPlayerStats(), totalWordsPlayed: 42 };

    await deps.saveState(modified);
    const loaded = await deps.loadState();

    expect(loaded.totalWordsPlayed).toBe(42);
  });

  it('falls back to initial state for corrupt saved data', async () => {
    await AsyncStorage.setItem('wordplay-player-stats', JSON.stringify({ garbage: true }));

    const deps = createPlayerStatsDependencies();
    const loaded = await deps.loadState();

    expect(loaded).toEqual(getInitialPlayerStats());
  });
});
