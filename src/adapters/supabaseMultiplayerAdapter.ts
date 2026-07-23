/**
 * Supabase Multiplayer Adapter
 *
 * Implements `RemoteGameDependencies` (see `packages/engine/interfaces.ts`)
 * on top of Supabase, plus the pairing helpers (invite code create/join,
 * random matchmaking) used by the multiplayer lobby UI.
 */

import type {
  RemoteGameDependencies,
  RemoteGameSnapshot,
  RemoteGameTurnRecord,
  RemoteGameUpdatedFields,
  RemoteGamePlayerInfo
} from '../../packages/engine/interfaces';
import { supabase } from '../lib/supabase';
import { ensureAnonymousSession, getDisplayName } from './supabaseAuthAdapter';
import { createBrowserAdapter } from './browserAdapter';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid ambiguity

function generateInviteCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Pick a random starting word the same way vs-bot games do (via the shared
 * dictionary dependencies), instead of relying on the DB's fixed default.
 */
async function pickRandomStartingWord(length: number): Promise<string> {
  try {
    const browserAdapter = await createBrowserAdapter();
    const wordData = browserAdapter.getWordData();
    if (wordData && typeof wordData.waitForLoad === 'function') {
      await wordData.waitForLoad();
    }
    const dependencies = browserAdapter.getGameDependencies();
    return dependencies.getRandomWordByLength(length) || 'WORD';
  } catch (error) {
    console.warn('Failed to pick random starting word, falling back to WORD:', error);
    return 'WORD';
  }
}

type GameRow = {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  current_word: string;
  word_history: string[];
  key_letters: string[];
  locked_letters: string[];
  locked_key_letters: string[];
  current_turn: number;
  current_player_index: number;
  max_turns: number;
  winner_id: string | null;
};

async function fetchGameRow(gameId: string): Promise<GameRow> {
  const { data, error } = await supabase
    .from('games')
    .select(
      'id, status, current_word, word_history, key_letters, locked_letters, locked_key_letters, current_turn, current_player_index, max_turns, winner_id'
    )
    .eq('id', gameId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch game ${gameId}: ${error?.message ?? 'not found'}`);
  }

  return data as GameRow;
}

async function fetchPlayers(gameId: string): Promise<RemoteGamePlayerInfo[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select('user_id, player_index, score, users(display_name, username)')
    .eq('game_id', gameId)
    .order('player_index', { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to fetch players for game ${gameId}: ${error?.message ?? 'unknown error'}`);
  }

  return data.map((row) => {
    const userInfo = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.user_id,
      name: userInfo?.display_name || userInfo?.username || 'Player',
      playerIndex: row.player_index,
      score: row.score
    };
  });
}

async function fetchTurns(gameId: string): Promise<RemoteGameTurnRecord[]> {
  const { data, error } = await supabase
    .from('turns')
    .select('turn_number, player_id, previous_word, new_word, score_earned, key_letter_used, created_at')
    .eq('game_id', gameId)
    .order('turn_number', { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to fetch turns for game ${gameId}: ${error?.message ?? 'unknown error'}`);
  }

  return data.map(row => ({
    turnNumber: row.turn_number,
    playerId: row.player_id,
    previousWord: row.previous_word,
    newWord: row.new_word,
    scoreEarned: row.score_earned,
    keyLetterUsed: row.key_letter_used,
    timestamp: new Date(row.created_at).getTime()
  }));
}

export function createSupabaseMultiplayerDependencies(localPlayerId: string): RemoteGameDependencies {
  return {
    getLocalPlayerId(): string {
      return localPlayerId;
    },

    async fetchGame(gameId: string): Promise<RemoteGameSnapshot> {
      const [row, players, turnHistory] = await Promise.all([
        fetchGameRow(gameId),
        fetchPlayers(gameId),
        fetchTurns(gameId)
      ]);

      const snapshot: RemoteGameSnapshot = {
        gameId: row.id,
        status: row.status,
        currentWord: row.current_word,
        usedWords: row.word_history || [],
        keyLetters: row.key_letters || [],
        lockedLetters: row.locked_letters || [],
        lockedKeyLetters: row.locked_key_letters || [],
        currentTurn: row.current_turn,
        currentPlayerIndex: row.current_player_index,
        maxTurns: row.max_turns,
        players,
        turnHistory,
        winnerId: row.winner_id
      };

      return snapshot;
    },

    async persistMove(
      gameId: string,
      turn: RemoteGameTurnRecord,
      updatedFields: RemoteGameUpdatedFields
    ): Promise<void> {
      const { error: turnError } = await supabase.from('turns').insert({
        game_id: gameId,
        player_id: turn.playerId,
        turn_number: turn.turnNumber,
        previous_word: turn.previousWord,
        new_word: turn.newWord,
        score_earned: turn.scoreEarned,
        key_letter_used: turn.keyLetterUsed
      });

      if (turnError) {
        throw new Error(`Failed to insert turn: ${turnError.message}`);
      }

      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_word: updatedFields.currentWord,
          key_letters: updatedFields.keyLetters,
          locked_letters: updatedFields.lockedLetters,
          locked_key_letters: updatedFields.lockedKeyLetters,
          word_history: updatedFields.usedWords,
          current_turn: updatedFields.currentTurn,
          current_player_index: updatedFields.currentPlayerIndex,
          status: updatedFields.status,
          winner_id: updatedFields.winnerId,
          completed_at: updatedFields.status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', gameId);

      if (gameError) {
        throw new Error(`Failed to update game: ${gameError.message}`);
      }

      // Keep game_players.score in sync for the moving player.
      const { error: scoreError } = await supabase.rpc('increment_player_score', {
        p_game_id: gameId,
        p_user_id: turn.playerId,
        p_score_delta: turn.scoreEarned
      });
      if (scoreError) {
        // Non-fatal: score display may lag, but turn history remains correct.
        console.warn('Failed to increment player score:', scoreError);
      }
    },

    subscribeToGame(gameId: string, onChange: () => void): () => void {
      const channel = supabase
        .channel(`game-${gameId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          () => onChange()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'turns', filter: `game_id=eq.${gameId}` },
          () => onChange()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },

    async abandonGame(gameId: string, resigningPlayerId: string): Promise<void> {
      // Award the win to whoever didn't resign, so the surviving player's
      // client (and any post-game stats) reflect a proper win rather than
      // a null/tied result.
      const { data: players } = await supabase
        .from('game_players')
        .select('user_id')
        .eq('game_id', gameId);
      const winnerId = players?.find(p => p.user_id !== resigningPlayerId)?.user_id ?? null;

      const { error } = await supabase
        .from('games')
        .update({ status: 'abandoned', winner_id: winnerId, completed_at: new Date().toISOString() })
        .eq('id', gameId);

      if (error) {
        throw new Error(`Failed to abandon game: ${error.message}`);
      }
    }
  };
}

// =============================================================================
// PAIRING HELPERS (invite code + random matchmaking)
// =============================================================================

export interface CreateInviteGameOptions {
  maxTurns?: number;
  turnTimeoutHours?: number;
  initialWordLength?: number;
}

/**
 * Create a new invite-based game as the host, generating a shareable
 * invite code. Returns the game id and invite code.
 */
export async function createInviteGame(
  options: CreateInviteGameOptions = {}
): Promise<{ gameId: string; inviteCode: string }> {
  const userId = await ensureAnonymousSession();
  if (!userId) throw new Error('Unable to authenticate for multiplayer');

  const inviteCode = generateInviteCode();
  const wordLength = options.initialWordLength ?? 4;
  const startingWord = await pickRandomStartingWord(wordLength);

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      created_by: userId,
      status: 'waiting',
      game_mode: 'multiplayer',
      pairing_mode: 'invite',
      invite_code: inviteCode,
      max_turns: options.maxTurns ?? 20,
      turn_timeout_hours: options.turnTimeoutHours ?? 48,
      initial_word_length: wordLength,
      current_word: startingWord
    })
    .select('id')
    .single();

  if (gameError || !game) {
    throw new Error(`Failed to create game: ${gameError?.message ?? 'unknown error'}`);
  }

  const { error: playerError } = await supabase
    .from('game_players')
    .insert({ game_id: game.id, user_id: userId, player_index: 0 });

  if (playerError) {
    throw new Error(`Failed to join own game: ${playerError.message}`);
  }

  return { gameId: game.id, inviteCode };
}

/** Join a waiting invite-created game by its shareable code. */
export async function joinGameByInviteCode(inviteCode: string): Promise<string> {
  const userId = await ensureAnonymousSession();
  if (!userId) throw new Error('Unable to authenticate for multiplayer');

  const { data, error } = await supabase.rpc('join_game_by_invite_code', {
    p_invite_code: inviteCode.trim().toUpperCase()
  });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to join game with that code');
  }

  return data as string;
}

/** Fetch the display name of the other player in a game, once they've joined. */
export async function getOpponentName(gameId: string): Promise<string | null> {
  const userId = await ensureAnonymousSession();
  if (!userId) return null;

  const { data: players, error } = await supabase
    .from('game_players')
    .select('user_id, users(display_name, username)')
    .eq('game_id', gameId);

  if (error || !players) return null;

  const opponent = players.find(p => p.user_id !== userId);
  if (!opponent) return null;

  const opponentInfo = Array.isArray(opponent.users) ? opponent.users[0] : opponent.users;
  return opponentInfo?.display_name || opponentInfo?.username || null;
}

export interface ActiveGameSummary {
  gameId: string;
  /** The other player's vanity name, or a placeholder if they haven't joined yet. */
  opponentName: string;
  /** Whether it's the local player's turn to move. */
  isMyTurn: boolean;
  status: 'waiting' | 'active';
}

/**
 * List all of the current player's non-finished games (any number - there's
 * no artificial cap), each with the opponent's display name and whose turn
 * it is, so the lobby can show/resume them.
 */
export async function listMyActiveGames(): Promise<ActiveGameSummary[]> {
  const userId = await ensureAnonymousSession();
  if (!userId) return [];

  const { data: myRows, error: myError } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('user_id', userId);

  if (myError || !myRows || myRows.length === 0) return [];

  const gameIds = myRows.map(row => row.game_id);

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, status, current_player_index')
    .in('id', gameIds)
    .in('status', ['waiting', 'active'])
    .order('updated_at', { ascending: false });

  if (gamesError || !games || games.length === 0) return [];

  const activeGameIds = games.map(game => game.id);

  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('game_id, user_id, player_index, users(display_name, username)')
    .in('game_id', activeGameIds);

  if (playersError || !players) return [];

  return games.map(game => {
    const gamePlayers = players.filter(p => p.game_id === game.id);
    const me = gamePlayers.find(p => p.user_id === userId);
    const opponent = gamePlayers.find(p => p.user_id !== userId);
    const opponentInfo = opponent ? (Array.isArray(opponent.users) ? opponent.users[0] : opponent.users) : null;

    return {
      gameId: game.id,
      opponentName: opponentInfo?.display_name || opponentInfo?.username || 'Waiting for opponent…',
      isMyTurn: !!me && me.player_index === game.current_player_index,
      status: game.status as 'waiting' | 'active'
    };
  });
}

export interface MatchmakingHandle {
  /** Cancel searching and remove self from the queue. */
  cancel: () => Promise<void>;
}

/**
 * Enter the random matchmaking queue and try to pair immediately. If no
 * opponent is available yet, subscribes for a match and calls `onMatched`
 * once one is found. Call `cancel()` to stop searching.
 */
export async function findMatch(onMatched: (gameId: string) => void): Promise<MatchmakingHandle> {
  const userId = await ensureAnonymousSession();
  if (!userId) throw new Error('Unable to authenticate for multiplayer');

  const displayName = getDisplayName();

  const { error: queueError } = await supabase
    .from('matchmaking_queue')
    .upsert({ user_id: userId, display_name: displayName }, { onConflict: 'user_id' });

  if (queueError) {
    throw new Error(`Failed to join matchmaking queue: ${queueError.message}`);
  }

  let settled = false;

  const attemptMatch = async () => {
    if (settled) return;
    const { data, error } = await supabase.rpc('try_match');
    if (error) {
      console.warn('try_match() failed:', error);
      return;
    }
    if (data) {
      settled = true;
      cleanup();
      const gameId = data as string;
      // We matched with an already-queued opponent and created the game
      // (see try_match() RPC) - give it a random starting word, same as
      // vs-bot games, instead of the DB's fixed default.
      const startingWord = await pickRandomStartingWord(4);
      await supabase.from('games').update({ current_word: startingWord }).eq('id', gameId);
      onMatched(gameId);
    }
  };

  // Try immediately in case an opponent is already waiting.
  await attemptMatch();

  // Also retry whenever the queue changes (e.g. another player joined and
  // may have matched us, or we should re-attempt matching them).
  const channel = supabase
    .channel(`matchmaking-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matchmaking_queue' }, () => {
      attemptMatch();
    })
    .subscribe();

  const pollInterval = setInterval(attemptMatch, 4000);

  function cleanup() {
    clearInterval(pollInterval);
    supabase.removeChannel(channel);
  }

  return {
    cancel: async () => {
      settled = true;
      cleanup();
      await supabase.from('matchmaking_queue').delete().eq('user_id', userId);
    }
  };
}
