-- Multiplayer vs Human: invite codes + random matchmaking
-- Additive migration on top of 20250603193744_init_game_schema.sql

-- =============================================================================
-- GAMES: invite code + pairing mode
-- =============================================================================

ALTER TABLE public.games
    ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS pairing_mode TEXT DEFAULT 'invite'
        CHECK (pairing_mode IN ('invite', 'matchmaking')),
    -- Mirrors the engine's GameConfig.maxTurns so multiplayer games end the
    -- same way single-player bot games do (turn count, not target_score).
    ADD COLUMN IF NOT EXISTS max_turns INTEGER DEFAULT 20,
    -- Mirrors GameState.lockedKeyLetters (key letters locked for the
    -- opponent's next turn because they were just used).
    ADD COLUMN IF NOT EXISTS locked_key_letters TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_games_invite_code ON public.games(invite_code);

-- =============================================================================
-- MATCHMAKING_QUEUE table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_queued_at ON public.matchmaking_queue(queued_at);

-- RLS: users can only see/manage their own queue row directly.
-- (Matching itself is done via the security-definer function below, which
-- bridges two different users' rows and therefore bypasses RLS internally.)
CREATE POLICY "Users can view their own queue entry" ON public.matchmaking_queue
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own queue entry" ON public.matchmaking_queue
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own queue entry" ON public.matchmaking_queue
    FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- try_match(): pair the calling user with the oldest other waiting entrant.
-- Returns the new game_id, or NULL if no opponent was available (caller
-- remains queued).
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
    WHERE user_id = v_self_id;

    IF v_self_name IS NULL THEN
        RAISE EXCEPTION 'Caller is not currently queued';
    END IF;

    -- Lock and pop the oldest *other* waiting entrant, if any.
    SELECT * INTO v_opponent
    FROM public.matchmaking_queue
    WHERE user_id <> v_self_id
    ORDER BY queued_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_opponent IS NULL THEN
        RETURN NULL; -- no one else waiting; caller stays in queue
    END IF;

    -- Create the game (self is player_index 0, opponent is player_index 1).
    INSERT INTO public.games (created_by, status, game_mode, pairing_mode, max_turns, turn_timeout_hours, initial_word_length)
    VALUES (v_self_id, 'active', 'multiplayer', 'matchmaking', p_max_turns, p_turn_timeout_hours, p_initial_word_length)
    RETURNING id INTO v_game_id;

    INSERT INTO public.game_players (game_id, user_id, player_index)
    VALUES
        (v_game_id, v_self_id, 0),
        (v_game_id, v_opponent.user_id, 1);

    DELETE FROM public.matchmaking_queue WHERE user_id IN (v_self_id, v_opponent.user_id);

    RETURN v_game_id;
END;
$$;

-- Allow any authenticated (including anonymous) user to call the matcher.
GRANT EXECUTE ON FUNCTION public.try_match(INTEGER, INTEGER, INTEGER) TO authenticated, anon;

-- =============================================================================
-- join_game_by_invite_code(): atomically join a waiting invite-created game.
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

    INSERT INTO public.game_players (game_id, user_id, player_index)
    VALUES (v_game.id, v_self_id, 1);

    UPDATE public.games SET status = 'active' WHERE id = v_game.id;

    RETURN v_game.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_game_by_invite_code(TEXT) TO authenticated;

-- =============================================================================
-- increment_player_score(): add a score delta to a game_players row.
-- Called after each persisted turn so game_players.score stays in sync
-- with the turns history without a separate client round-trip/read-modify-write.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_player_score(
    p_game_id UUID,
    p_user_id UUID,
    p_score_delta INTEGER
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Can only increment your own score';
    END IF;

    UPDATE public.game_players
    SET score = score + p_score_delta,
        last_active = NOW()
    WHERE game_id = p_game_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_player_score(UUID, UUID, INTEGER) TO authenticated;
