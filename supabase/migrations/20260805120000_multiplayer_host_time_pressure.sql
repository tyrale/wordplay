-- Multiplayer vs Human: host-configured time-pressure mechanic
-- Additive migration on top of 20260723160000_multiplayer_group_games.sql
--
-- The "time-pressure" mechanic (7s per-turn timer) is normally each
-- player's own unlock/toggle, but in a shared multiplayer game there's only
-- one game clock - so whether it's on is decided once, by the host, for the
-- whole game (like max_turns/initial_word_length already are), rather than
-- each player's individual setting.

ALTER TABLE public.games
    ADD COLUMN IF NOT EXISTS time_pressure_enabled BOOLEAN DEFAULT false;

-- =============================================================================
-- try_match(): now also takes the caller's time-pressure setting, applied to
-- the created game for both players. Adding a 4th parameter changes the
-- function's signature, so the old 3-arg overload must be dropped first -
-- otherwise it would linger alongside this one and RPC calls with no
-- explicit args would become ambiguous between the two.
-- =============================================================================

DROP FUNCTION IF EXISTS public.try_match(INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.try_match(
    p_max_turns INTEGER DEFAULT 20,
    p_turn_timeout_hours INTEGER DEFAULT 48,
    p_initial_word_length INTEGER DEFAULT 4,
    p_time_pressure_enabled BOOLEAN DEFAULT false
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
    INSERT INTO public.games (created_by, status, game_mode, pairing_mode, max_players, max_turns, turn_timeout_hours, initial_word_length, time_pressure_enabled)
    VALUES (v_self_id, 'active', 'multiplayer', 'matchmaking', 2, p_max_turns, p_turn_timeout_hours, p_initial_word_length, p_time_pressure_enabled)
    RETURNING id INTO v_game_id;

    INSERT INTO public.game_players (game_id, user_id, player_index)
    VALUES
        (v_game_id, v_self_id, 0),
        (v_game_id, v_opponent.user_id, 1);

    DELETE FROM public.matchmaking_queue WHERE user_id IN (v_self_id, v_opponent.user_id);

    RETURN v_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_match(INTEGER, INTEGER, INTEGER, BOOLEAN) TO authenticated, anon;

-- =============================================================================
-- finalize_vsmany_match(): same addition for group games (and same reason
-- for dropping the old 3-arg overload first).
-- =============================================================================

DROP FUNCTION IF EXISTS public.finalize_vsmany_match(INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.finalize_vsmany_match(
    p_max_turns INTEGER DEFAULT 20,
    p_turn_timeout_hours INTEGER DEFAULT 48,
    p_initial_word_length INTEGER DEFAULT 4,
    p_time_pressure_enabled BOOLEAN DEFAULT false
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

    INSERT INTO public.games (created_by, status, game_mode, pairing_mode, max_players, max_turns, turn_timeout_hours, initial_word_length, time_pressure_enabled)
    VALUES (v_self_id, 'active', 'multiplayer', 'matchmaking', v_group_count, p_max_turns, p_turn_timeout_hours, p_initial_word_length, p_time_pressure_enabled)
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

GRANT EXECUTE ON FUNCTION public.finalize_vsmany_match(INTEGER, INTEGER, INTEGER, BOOLEAN) TO authenticated, anon;
