-- Multiplayer vs Human: support group games (vsmany) of up to 8 players
-- Additive migration on top of 20260720130000_multiplayer_matchmaking.sql

-- =============================================================================
-- GAMES: raise the max_players cap from 4 to 8
-- =============================================================================

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_max_players_check;
ALTER TABLE public.games ADD CONSTRAINT games_max_players_check CHECK (max_players BETWEEN 2 AND 8);

-- =============================================================================
-- MATCHMAKING_QUEUE: track vsone/vsmany mode + group-match assignment
-- =============================================================================

ALTER TABLE public.matchmaking_queue
    ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'vsone' CHECK (mode IN ('vsone', 'vsmany')),
    ADD COLUMN IF NOT EXISTS assigned_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL;

-- =============================================================================
-- try_match(): unchanged pairing behavior, now scoped to vsone entrants only
-- so it never accidentally grabs a vsmany-queued row.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.try_match(
    p_max_turns INTEGER DEFAULT 20,
    p_turn_timeout_hours INTEGER DEFAULT 48,
    p_initial_word_length INTEGER DEFAULT 4
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_self_id UUID := auth.uid();
    v_self_name TEXT;
    v_opponent RECORD;
    v_game_id UUID;
BEGIN
    IF v_self_id IS NULL THEN
        RAISE EXCEPTION 'try_match() requires an authenticated user';
    END IF;

    SELECT display_name INTO v_self_name
    FROM public.matchmaking_queue
    WHERE user_id = v_self_id AND mode = 'vsone';

    IF v_self_name IS NULL THEN
        RAISE EXCEPTION 'Caller is not currently queued';
    END IF;

    -- Lock and pop the oldest *other* waiting vsone entrant, if any.
    SELECT * INTO v_opponent
    FROM public.matchmaking_queue
    WHERE user_id <> v_self_id AND mode = 'vsone'
    ORDER BY queued_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_opponent IS NULL THEN
        RETURN NULL; -- no one else waiting; caller stays in queue
    END IF;

    -- Create the game (self is player_index 0, opponent is player_index 1).
    INSERT INTO public.games (created_by, status, game_mode, pairing_mode, max_players, max_turns, turn_timeout_hours, initial_word_length)
    VALUES (v_self_id, 'active', 'multiplayer', 'matchmaking', 2, p_max_turns, p_turn_timeout_hours, p_initial_word_length)
    RETURNING id INTO v_game_id;

    INSERT INTO public.game_players (game_id, user_id, player_index)
    VALUES
        (v_game_id, v_self_id, 0),
        (v_game_id, v_opponent.user_id, 1);

    DELETE FROM public.matchmaking_queue WHERE user_id IN (v_self_id, v_opponent.user_id);

    RETURN v_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_match(INTEGER, INTEGER, INTEGER) TO authenticated, anon;

-- =============================================================================
-- finalize_vsmany_match(): group up to 8 oldest queued vsmany entrants (self
-- included) into one game. Unlike try_match(), matched rows are *updated*
-- (assigned_game_id set) rather than deleted, so every matched player -
-- not just the caller - can discover the resulting game by polling/
-- subscribing to their own still-existing queue row.
--
-- Returns the new game_id if a group of >= 2 was formed, or NULL if fewer
-- than 2 are currently queued (caller remains queued to retry later).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.finalize_vsmany_match(
    p_max_turns INTEGER DEFAULT 20,
    p_turn_timeout_hours INTEGER DEFAULT 48,
    p_initial_word_length INTEGER DEFAULT 4
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_self_id UUID := auth.uid();
    v_group RECORD;
    v_group_count INTEGER := 0;
    v_game_id UUID;
    v_player_index INTEGER := 0;
BEGIN
    IF v_self_id IS NULL THEN
        RAISE EXCEPTION 'finalize_vsmany_match() requires an authenticated user';
    END IF;

    CREATE TEMP TABLE IF NOT EXISTS tmp_vsmany_group (user_id UUID) ON COMMIT DROP;
    DELETE FROM tmp_vsmany_group;

    INSERT INTO tmp_vsmany_group (user_id)
    SELECT user_id
    FROM public.matchmaking_queue
    WHERE mode = 'vsmany' AND assigned_game_id IS NULL
    ORDER BY queued_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 8;

    SELECT COUNT(*) INTO v_group_count FROM tmp_vsmany_group;

    IF v_group_count < 2 THEN
        RETURN NULL; -- not enough players queued yet; caller stays queued
    END IF;

    INSERT INTO public.games (created_by, status, game_mode, pairing_mode, max_players, max_turns, turn_timeout_hours, initial_word_length)
    VALUES (v_self_id, 'active', 'multiplayer', 'matchmaking', v_group_count, p_max_turns, p_turn_timeout_hours, p_initial_word_length)
    RETURNING id INTO v_game_id;

    FOR v_group IN SELECT user_id FROM tmp_vsmany_group ORDER BY user_id LOOP
        INSERT INTO public.game_players (game_id, user_id, player_index)
        VALUES (v_game_id, v_group.user_id, v_player_index);
        v_player_index := v_player_index + 1;
    END LOOP;

    UPDATE public.matchmaking_queue
    SET assigned_game_id = v_game_id
    WHERE user_id IN (SELECT user_id FROM tmp_vsmany_group);

    RETURN v_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_vsmany_match(INTEGER, INTEGER, INTEGER) TO authenticated, anon;

-- =============================================================================
-- join_game_by_invite_code(): now supports joining games with more than 2
-- max_players. Status only flips to 'active' once the game is full; while
-- 'waiting', the host advances it manually via start_waiting_game() (used by
-- the vsmany "Create" flow). Behavior for the default max_players = 2 case
-- (vsone) is unchanged - the 2nd join fills the game and activates it.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.join_game_by_invite_code(p_invite_code TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_self_id UUID := auth.uid();
    v_game RECORD;
    v_player_count INTEGER;
BEGIN
    IF v_self_id IS NULL THEN
        RAISE EXCEPTION 'join_game_by_invite_code() requires an authenticated user';
    END IF;

    SELECT * INTO v_game
    FROM public.games
    WHERE invite_code = p_invite_code
      AND status = 'waiting'
      AND pairing_mode = 'invite'
    FOR UPDATE;

    IF v_game IS NULL THEN
        RAISE EXCEPTION 'No waiting game found for that invite code';
    END IF;

    IF v_game.created_by = v_self_id THEN
        RAISE EXCEPTION 'Cannot join your own game';
    END IF;

    SELECT COUNT(*) INTO v_player_count FROM public.game_players WHERE game_id = v_game.id;

    IF v_player_count >= v_game.max_players THEN
        RAISE EXCEPTION 'This game is already full';
    END IF;

    INSERT INTO public.game_players (game_id, user_id, player_index)
    VALUES (v_game.id, v_self_id, v_player_count);

    -- Only auto-start once full; otherwise the host starts it manually
    -- (or more players continue joining) while it stays 'waiting'.
    IF v_player_count + 1 >= v_game.max_players THEN
        UPDATE public.games SET status = 'active' WHERE id = v_game.id;
    END IF;

    RETURN v_game.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_game_by_invite_code(TEXT) TO authenticated;

-- =============================================================================
-- start_waiting_game(): host-only manual start for a vsmany invite game that
-- hasn't filled up yet, once at least 2 players have joined.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.start_waiting_game(p_game_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_self_id UUID := auth.uid();
    v_game RECORD;
    v_player_count INTEGER;
BEGIN
    IF v_self_id IS NULL THEN
        RAISE EXCEPTION 'start_waiting_game() requires an authenticated user';
    END IF;

    SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;

    IF v_game IS NULL THEN
        RAISE EXCEPTION 'Game not found';
    END IF;

    IF v_game.created_by <> v_self_id THEN
        RAISE EXCEPTION 'Only the host can start this game';
    END IF;

    IF v_game.status <> 'waiting' THEN
        RAISE EXCEPTION 'Game is not waiting to start';
    END IF;

    SELECT COUNT(*) INTO v_player_count FROM public.game_players WHERE game_id = p_game_id;

    IF v_player_count < 2 THEN
        RAISE EXCEPTION 'Need at least 2 players to start';
    END IF;

    UPDATE public.games SET status = 'active' WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_waiting_game(UUID) TO authenticated;
