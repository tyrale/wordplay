-- Multiplayer vs Human: bot-opponent fallback for random matchmaking
-- Additive migration on top of 20260805120000_multiplayer_host_time_pressure.sql
--
-- Problem: early on, there may not be enough humans in the vsone/vsmany
-- queues at any given moment, so "Random" matchmaking could leave a player
-- waiting indefinitely. This adds a pool of permanent "bot persona" accounts
-- (real rows in auth.users/public.users, so they behave exactly like any
-- other opponent - same profile lookups, same RLS, same game rows) that
-- random matchmaking can fall back to once a client-side wait timer expires.
--
-- These are NOT surfaced anywhere as bots - display name/profile lookups
-- are indistinguishable from a real player. The actual "typing" of a bot's
-- moves happens client-side (see RemoteGameStateManager in
-- packages/engine/remoteGamestate.ts): whichever human's client has the
-- game open notices it's the bot's turn, waits a randomized human-like
-- delay, computes the move with the existing bot engine, and submits it on
-- the bot's behalf via the relaxed policies/RPCs below.

-- =============================================================================
-- Schema: flag bot accounts, and which engine strategy a bot game_players
-- row should play with.
-- =============================================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.game_players
    ADD COLUMN IF NOT EXISTS bot_engine_id TEXT;

-- Pool of bot personas usable by random matchmaking's fallback. Kept
-- separate from `users.is_bot` (which just flags an account, permanently)
-- so personas can be retired/added/rebalanced independently.
CREATE TABLE IF NOT EXISTS public.bot_personas (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    engine_bot_id TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.bot_personas ENABLE ROW LEVEL SECURITY;
-- No client-facing policies: only accessed from SECURITY DEFINER matchmaking
-- functions below (which run as the table owner and bypass RLS), keeping
-- the persona roster itself unreadable via the normal client API.

-- =============================================================================
-- Seed a small roster of bot personas. Each is a real auth.users +
-- public.users row (via the existing handle_new_user() trigger), so they
-- show up identically to a real opponent everywhere (opponent name lookups,
-- "Users can view their own profile"/shares_game_with policy, etc).
-- =============================================================================

DO $$
DECLARE
    v_persona RECORD;
    v_new_id UUID;
BEGIN
    FOR v_persona IN
        SELECT * FROM (VALUES
            ('jstevens21', 'J. Stevens', 'easy-bot'),
            ('mia_reads',  'Mia R.',     'easy-bot'),
            ('kdoyle',     'K. Doyle',   'medium-bot'),
            ('sam.ortiz',  'Sam O.',     'medium-bot'),
            ('r_chen88',   'R. Chen',    'hard-bot'),
            ('taylor_w',   'Taylor W.',  'hard-bot')
        ) AS t(username, display_name, engine_bot_id)
    LOOP
        -- Idempotent: skip personas already seeded by a previous run.
        IF EXISTS (SELECT 1 FROM public.users WHERE username = v_persona.username) THEN
            CONTINUE;
        END IF;

        v_new_id := uuid_generate_v4();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at,
            raw_app_meta_data, raw_user_meta_data,
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_new_id,
            'authenticated',
            'authenticated',
            v_persona.username || '@bots.internal.wordplay',
            '',
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"bot","providers":["bot"]}'::jsonb,
            jsonb_build_object('username', v_persona.username, 'display_name', v_persona.display_name),
            '', '', '', ''
        );

        -- on_auth_user_created (see init migration) auto-creates the
        -- matching public.users row from raw_user_meta_data above.
        UPDATE public.users SET is_bot = true WHERE id = v_new_id;

        INSERT INTO public.bot_personas (user_id, engine_bot_id, active)
        VALUES (v_new_id, v_persona.engine_bot_id, true);
    END LOOP;
END $$;

-- =============================================================================
-- RLS: allow a human client to submit a turn / score update on behalf of a
-- bot participant sharing their game (bots have no client of their own).
-- Mirrors the existing fully client-authoritative trust model used for real
-- human moves already (there's no server-side move validation for humans
-- either) - just extended to also permit acting for a game's bot player.
-- =============================================================================

DROP POLICY IF EXISTS "Users can create turns for their games" ON public.turns;
CREATE POLICY "Users can create turns for their games" ON public.turns
    FOR INSERT WITH CHECK (
        game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid())
        AND (
            player_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.game_players gp
                WHERE gp.game_id = turns.game_id
                  AND gp.user_id = turns.player_id
                  AND gp.is_bot = true
            )
        )
    );

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
        -- Only allow acting for a bot opponent that shares the caller's game.
        IF NOT EXISTS (
            SELECT 1 FROM public.game_players gp
            WHERE gp.game_id = p_game_id AND gp.user_id = p_user_id AND gp.is_bot = true
        ) OR NOT EXISTS (
            SELECT 1 FROM public.game_players gp
            WHERE gp.game_id = p_game_id AND gp.user_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Can only increment your own score (or a bot opponent sharing your game)';
        END IF;
    END IF;

    UPDATE public.game_players
    SET score = score + p_score_delta,
        last_active = NOW()
    WHERE game_id = p_game_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_player_score(UUID, UUID, INTEGER) TO authenticated;

-- =============================================================================
-- try_match(): add an opt-in bot fallback. Unchanged when
-- p_allow_bot_fallback is false (the default) or omitted entirely - only
-- called with true by the client after its own short "wait for a human"
-- timer expires. Adding a 5th parameter changes the signature, so the old
-- 4-arg overload must be dropped first (see prior migration's note on this).
-- =============================================================================

DROP FUNCTION IF EXISTS public.try_match(INTEGER, INTEGER, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.try_match(
    p_max_turns INTEGER DEFAULT 20,
    p_turn_timeout_hours INTEGER DEFAULT 48,
    p_initial_word_length INTEGER DEFAULT 4,
    p_time_pressure_enabled BOOLEAN DEFAULT false,
    p_allow_bot_fallback BOOLEAN DEFAULT false
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
    v_persona RECORD;
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
        IF NOT p_allow_bot_fallback THEN
            RETURN NULL; -- no one else waiting yet; caller stays in queue
        END IF;

        SELECT user_id, engine_bot_id INTO v_persona
        FROM public.bot_personas
        WHERE active = true
        ORDER BY random()
        LIMIT 1;

        IF v_persona IS NULL THEN
            RETURN NULL; -- no bot personas configured; behave as before
        END IF;

        INSERT INTO public.games (created_by, status, game_mode, pairing_mode, max_players, max_turns, turn_timeout_hours, initial_word_length, time_pressure_enabled)
        VALUES (v_self_id, 'active', 'multiplayer', 'matchmaking', 2, p_max_turns, p_turn_timeout_hours, p_initial_word_length, p_time_pressure_enabled)
        RETURNING id INTO v_game_id;

        INSERT INTO public.game_players (game_id, user_id, player_index)
        VALUES (v_game_id, v_self_id, 0);

        INSERT INTO public.game_players (game_id, user_id, player_index, is_bot, bot_engine_id)
        VALUES (v_game_id, v_persona.user_id, 1, true, v_persona.engine_bot_id);

        DELETE FROM public.matchmaking_queue WHERE user_id = v_self_id;

        RETURN v_game_id;
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

GRANT EXECUTE ON FUNCTION public.try_match(INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated, anon;

-- =============================================================================
-- finalize_vsmany_match(): same opt-in bot fallback, plus a floor of 3
-- players for every vsmany random match (topped up with bots if fewer than
-- 3 humans are queued once the group-delay elapses) so groups never start
-- as an accidental 1-on-1 just because few people happened to be online.
-- =============================================================================

DROP FUNCTION IF EXISTS public.finalize_vsmany_match(INTEGER, INTEGER, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.finalize_vsmany_match(
    p_max_turns INTEGER DEFAULT 20,
    p_turn_timeout_hours INTEGER DEFAULT 48,
    p_initial_word_length INTEGER DEFAULT 4,
    p_time_pressure_enabled BOOLEAN DEFAULT false,
    p_allow_bot_fallback BOOLEAN DEFAULT false
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
    v_bots_needed INTEGER := 0;
    v_persona RECORD;
    v_game_id UUID;
    v_player_index INTEGER := 0;
    v_min_group_size CONSTANT INTEGER := 3;
BEGIN
    IF v_self_id IS NULL THEN
        RAISE EXCEPTION 'finalize_vsmany_match() requires an authenticated user';
    END IF;

    CREATE TEMP TABLE IF NOT EXISTS tmp_vsmany_group (user_id UUID, is_bot BOOLEAN DEFAULT false, bot_engine_id TEXT) ON COMMIT DROP;
    DELETE FROM tmp_vsmany_group;

    INSERT INTO tmp_vsmany_group (user_id)
    SELECT user_id
    FROM public.matchmaking_queue
    WHERE mode = 'vsmany' AND assigned_game_id IS NULL
    ORDER BY queued_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 8;

    SELECT COUNT(*) INTO v_group_count FROM tmp_vsmany_group;

    IF v_group_count = 0 THEN
        RETURN NULL; -- caller no longer queued (already grouped elsewhere)
    END IF;

    IF v_group_count < 2 AND NOT p_allow_bot_fallback THEN
        RETURN NULL; -- not enough players queued yet; caller stays queued
    END IF;

    -- Top up with bot personas so every vsmany random match has at least
    -- v_min_group_size players, rather than leaving real humans waiting
    -- indefinitely for enough others to queue up at the same time.
    IF p_allow_bot_fallback AND v_group_count < v_min_group_size THEN
        v_bots_needed := v_min_group_size - v_group_count;
        FOR v_persona IN
            SELECT user_id, engine_bot_id
            FROM public.bot_personas
            WHERE active = true
            ORDER BY random()
            LIMIT v_bots_needed
        LOOP
            INSERT INTO tmp_vsmany_group (user_id, is_bot, bot_engine_id)
            VALUES (v_persona.user_id, true, v_persona.engine_bot_id);
        END LOOP;
        SELECT COUNT(*) INTO v_group_count FROM tmp_vsmany_group;
    END IF;

    IF v_group_count < 2 THEN
        RETURN NULL; -- no personas configured to top up with; wait for real players
    END IF;

    INSERT INTO public.games (created_by, status, game_mode, pairing_mode, max_players, max_turns, turn_timeout_hours, initial_word_length, time_pressure_enabled)
    VALUES (v_self_id, 'active', 'multiplayer', 'matchmaking', v_group_count, p_max_turns, p_turn_timeout_hours, p_initial_word_length, p_time_pressure_enabled)
    RETURNING id INTO v_game_id;

    FOR v_group IN SELECT user_id, is_bot, bot_engine_id FROM tmp_vsmany_group ORDER BY is_bot ASC, user_id LOOP
        INSERT INTO public.game_players (game_id, user_id, player_index, is_bot, bot_engine_id)
        VALUES (v_game_id, v_group.user_id, v_player_index, v_group.is_bot, v_group.bot_engine_id);
        v_player_index := v_player_index + 1;
    END LOOP;

    UPDATE public.matchmaking_queue
    SET assigned_game_id = v_game_id
    WHERE user_id IN (SELECT user_id FROM tmp_vsmany_group WHERE is_bot = false);

    RETURN v_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_vsmany_match(INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated, anon;
