-- Challenge Leaderboard Migration
--
-- Tracks how many players completed each daily challenge, grouped by the
-- number of steps it took them. Powers the "vs world > leaderboard" overlay:
-- a histogram of completions by step count for today's challenge, with the
-- local player's own step count highlighted ("YOU").
--
-- Mirrors the community-unlocks / word-path-graph pattern: a per-user
-- de-dupe table + a denormalized aggregate histogram table, kept in sync
-- via a SECURITY DEFINER RPC so writes stay atomic and RLS-safe. Only
-- completions (not forfeitures) are recorded, and each player counts toward
-- a given day's histogram at most once (first completion only).

-- USER_CHALLENGE_RESULTS table: one row per (player, challenge date) the
-- player has ever completed. Existence of a row de-dupes re-submissions;
-- the stored step_count is the number of word-change moves it took them.
CREATE TABLE IF NOT EXISTS public.user_challenge_results (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    challenge_date DATE NOT NULL,
    step_count INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, challenge_date)
);

-- CHALLENGE_LEADERBOARD table: denormalized histogram of completions per
-- (challenge date, step count), kept in sync by record_challenge_result().
CREATE TABLE IF NOT EXISTS public.challenge_leaderboard (
    challenge_date DATE NOT NULL,
    step_count INTEGER NOT NULL,
    player_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (challenge_date, step_count)
);

ALTER TABLE public.user_challenge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_leaderboard ENABLE ROW LEVEL SECURITY;

-- Players can see their own challenge results (not required by the UI today,
-- but harmless and consistent with the rest of the schema's per-user policies).
CREATE POLICY "Users can view their own challenge results" ON public.user_challenge_results
    FOR SELECT USING (user_id = auth.uid());

-- The leaderboard histogram is aggregate, non-identifying data - readable by
-- anyone (including anonymous sessions), matching community_unlock_counts.
CREATE POLICY "Anyone can view the challenge leaderboard" ON public.challenge_leaderboard
    FOR SELECT USING (true);

-- No direct INSERT/UPDATE policies - all writes go through the SECURITY
-- DEFINER function below so the "first-time only" de-dupe + histogram
-- increment stay atomic and consistent.

-- Records that the calling (authenticated/anonymous) player completed
-- `p_challenge_date`'s daily challenge in `p_step_count` steps. Only counts
-- the FIRST time a given player completes a given day's challenge (de-duped
-- server-side by the (user_id, challenge_date) primary key), regardless of
-- how many times this is called for the same day. Returns the up-to-date
-- histogram for that challenge date so the client can refresh the leaderboard
-- without a second round trip.
CREATE OR REPLACE FUNCTION public.record_challenge_result(
    p_challenge_date DATE,
    p_step_count INTEGER
)
RETURNS TABLE(step_count INTEGER, player_count INTEGER)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_rows INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO public.user_challenge_results (user_id, challenge_date, step_count)
    VALUES (v_user_id, p_challenge_date, p_step_count)
    ON CONFLICT (user_id, challenge_date) DO NOTHING;

    GET DIAGNOSTICS v_new_rows = ROW_COUNT;

    IF v_new_rows > 0 THEN
        INSERT INTO public.challenge_leaderboard (challenge_date, step_count, player_count)
        VALUES (p_challenge_date, p_step_count, 1)
        ON CONFLICT (challenge_date, step_count) DO UPDATE SET player_count = challenge_leaderboard.player_count + 1;
    END IF;

    RETURN QUERY
    SELECT step_count, player_count
    FROM public.challenge_leaderboard
    WHERE challenge_date = p_challenge_date
    ORDER BY step_count ASC;
END;
$$ language 'plpgsql';

GRANT EXECUTE ON FUNCTION public.record_challenge_result(DATE, INTEGER) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_user_challenge_results_user_id ON public.user_challenge_results(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_leaderboard_date ON public.challenge_leaderboard(challenge_date);
