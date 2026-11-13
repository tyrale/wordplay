import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { deleteMyData } from '../deleteMyData';

jest.mock('expo-updates', () => ({ reloadAsync: jest.fn() }));
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(), signOut: jest.fn() },
    rpc: jest.fn()
  }
}));

const auth = supabase.auth as unknown as { getSession: jest.Mock; signOut: jest.Mock };
const rpc = supabase.rpc as unknown as jest.Mock;

describe('deleteMyData', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    auth.signOut.mockResolvedValue({ error: null });
    await AsyncStorage.clear();
    await AsyncStorage.multiSet([
      ['wordplay-player-stats', '{"games":3}'],
      ['wordplay-display-name', 'Alice']
    ]);
  });

  it('deletes the server account first, then signs out and clears local storage', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    rpc.mockResolvedValue({ error: null });

    await expect(deleteMyData()).resolves.toEqual({ deletedServerAccount: true });

    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('only clears local storage when the player never signed in', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(deleteMyData()).resolves.toEqual({ deletedServerAccount: false });

    expect(rpc).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('keeps everything local if the server delete fails, so the player can retry', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    rpc.mockResolvedValue({ error: { message: 'network down' } });

    await expect(deleteMyData()).rejects.toThrow('network down');

    expect(auth.signOut).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('wordplay-display-name')).toBe('Alice');
  });
});
