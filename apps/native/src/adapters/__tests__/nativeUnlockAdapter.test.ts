import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUnlockDependencies } from '../nativeUnlockAdapter';
import { getInitialUnlockState } from '@wordplay/engine/unlock-definitions';

describe('nativeUnlockAdapter', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads the initial unlock state when nothing has been saved', async () => {
    const deps = createUnlockDependencies();
    const state = await deps.loadState();
    expect(state).toEqual(getInitialUnlockState());
  });

  it('round-trips saved unlock state through AsyncStorage', async () => {
    const deps = createUnlockDependencies();
    const modified = { ...getInitialUnlockState(), themes: ['classic blue', 'red'] };

    await deps.saveState(modified);
    const loaded = await deps.loadState();

    expect(loaded.themes).toContain('red');
  });

  it('falls back to initial state for invalid saved data', async () => {
    await AsyncStorage.setItem('wordplay-unlock-state', JSON.stringify({ garbage: true }));

    const deps = createUnlockDependencies();
    const loaded = await deps.loadState();

    expect(loaded).toEqual(getInitialUnlockState());
  });

  it('exposes recordCommunityUnlock as a no-op-safe hook when Supabase is not configured', async () => {
    const deps = createUnlockDependencies();
    expect(deps.recordCommunityUnlock).toBeDefined();
    // Not configured in the test env -> resolves to null rather than throwing.
    await expect(deps.recordCommunityUnlock!('unlock_red_theme')).resolves.toBeNull();
  });
});
