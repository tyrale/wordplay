-- Fix: record_challenge_result() raised "column reference \"step_count\" is
-- ambiguous" (Postgres error 42702) on every call, because the function's
-- RETURNS TABLE(step_count, player_count) OUT parameters share the same
-- names as the columns being selected from challenge_leaderboard in the
-- final RETURN QUERY. Since the whole function body runs in a single
-- transaction, this error rolled back the preceding INSERTs too - so no
-- challenge completion was ever actually recorded, and the leaderboard
-- always appeared empty (surfaced in the UI as "you're the first to
-- complete today" for every player).
--
-- Fix: qualify the columns with a table alias so they can't be confused
-- with the OUT parameters.

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
    SELECT cl.step_count, cl.player_count
    FROM public.challenge_leaderboard cl
    WHERE cl.challenge_date = p_challenge_date
    ORDER BY cl.step_count ASC;
END;
$$ language 'plpgsql';
