import AsyncStorage from '@react-native-async-storage/async-storage';

// nativeMultiplayerAdapter imports ../lib/supabase at module scope (as a
// real Supabase client) - mock it before importing the adapter; each test
// below builds its own minimal fluent-chain stub matching whatever call
// sequence that specific function makes.
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn()
  }
}));

jest.mock('../nativeAuthAdapter', () => ({
  ensureAnonymousSession: jest.fn().mockResolvedValue('user-123'),
  getDisplayName: jest.fn().mockReturnValue('Player1234')
}));

import { supabase } from '../../lib/supabase';
import {
  createInviteGame,
  joinGameByInviteCode,
  cancelGame,
  saveActiveMultiplayerGameId,
  loadActiveMultiplayerGameId,
  clearActiveMultiplayerGameId
} from '../nativeMultiplayerAdapter';

describe('nativeMultiplayerAdapter resume-on-restart (AsyncStorage, no Supabase involved)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves, loads, and clears the active multiplayer game id', async () => {
    expect(await loadActiveMultiplayerGameId()).toBeNull();

    await saveActiveMultiplayerGameId('game-abc');
    expect(await loadActiveMultiplayerGameId()).toBe('game-abc');

    await clearActiveMultiplayerGameId();
    expect(await loadActiveMultiplayerGameId()).toBeNull();
  });
});

describe('nativeMultiplayerAdapter Supabase-backed functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createInviteGame generates a 6-character code from the expected alphabet and inserts the game/player rows', async () => {
    const gameInsertChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'game-1' }, error: null })
    };
    const playerInsertChain = {
      insert: jest.fn().mockResolvedValue({ error: null })
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'games') return gameInsertChain;
      if (table === 'game_players') return playerInsertChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await createInviteGame({ maxPlayers: 2, maxTurns: 20, initialWordLength: 4 });

    expect(result.gameId).toBe('game-1');
    expect(result.inviteCode).toHaveLength(6);
    expect(result.inviteCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(gameInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'waiting', game_mode: 'multiplayer', pairing_mode: 'invite', max_players: 2 })
    );
    expect(playerInsertChain.insert).toHaveBeenCalledWith({ game_id: 'game-1', user_id: 'user-123', player_index: 0 });
  });

  it('createInviteGame throws with the Supabase error message when the insert fails', async () => {
    const gameInsertChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    };
    (supabase.from as jest.Mock).mockReturnValue(gameInsertChain);

    await expect(createInviteGame()).rejects.toThrow('insert failed');
  });

  it('joinGameByInviteCode uppercases/trims the code and calls the join_game_by_invite_code RPC', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 'game-42', error: null });

    const gameId = await joinGameByInviteCode('  abc123  ');

    expect(supabase.rpc).toHaveBeenCalledWith('join_game_by_invite_code', { p_invite_code: 'ABC123' });
    expect(gameId).toBe('game-42');
  });

  it('joinGameByInviteCode throws when the RPC reports an error', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'bad code' } });

    await expect(joinGameByInviteCode('BADCOD')).rejects.toThrow('bad code');
  });

  it('cancelGame marks the game abandoned', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null })
    };
    (supabase.from as jest.Mock).mockReturnValue(updateChain);

    await cancelGame('game-7');

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'abandoned' }));
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'game-7');
  });
});
