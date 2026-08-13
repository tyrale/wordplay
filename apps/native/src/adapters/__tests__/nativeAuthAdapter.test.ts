import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  preloadDisplayName,
  getDisplayName,
  setDisplayName,
  hasConfirmedDisplayName,
  markDisplayNameConfirmed,
  MAX_DISPLAY_NAME_LENGTH
} from '../nativeAuthAdapter';

describe('nativeAuthAdapter display name (AsyncStorage-backed, sync-cache bridged)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('preloadDisplayName generates and persists a default name, then getDisplayName reads it synchronously from the cache', async () => {
    const preloaded = await preloadDisplayName();
    expect(preloaded).toMatch(/^Player\d{4}$/);

    // No AsyncStorage await needed here - this is the point of the cache.
    expect(getDisplayName()).toBe(preloaded);

    const stored = await AsyncStorage.getItem('wordplay-display-name');
    expect(stored).toBe(preloaded);
  });

  it('preloadDisplayName returns the same name on repeated calls (reads the persisted value, not a new random one)', async () => {
    const first = await preloadDisplayName();
    const second = await preloadDisplayName();
    expect(second).toBe(first);
  });

  it('setDisplayName updates both the cache and AsyncStorage, truncated to the max length', async () => {
    await preloadDisplayName();
    await setDisplayName('WayTooLongOfAName');

    expect(getDisplayName().length).toBeLessThanOrEqual(MAX_DISPLAY_NAME_LENGTH);
    const stored = await AsyncStorage.getItem('wordplay-display-name');
    expect(stored).toBe(getDisplayName());
  });

  it('display name confirmation defaults to false and can be marked confirmed', async () => {
    expect(await hasConfirmedDisplayName()).toBe(false);
    await markDisplayNameConfirmed();
    expect(await hasConfirmedDisplayName()).toBe(true);
  });
});
