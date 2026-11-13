-- Lets a signed-in player permanently delete their own account and data
-- (App Store guideline 5.1.1(v); also backs the privacy policy's deletion
-- promise). Everything per-player cascades from auth.users -> public.users:
-- game_players, turns, matchmaking_queue, user_unlocks,
-- user_word_path_edges, user_challenge_results, and games they created.
--
-- Not removed (no per-player data in them): the aggregate counters
-- community_unlock_counts, community_stats, challenge_leaderboard and
-- master_word_path_edges.
--
-- games.winner_id has no ON DELETE rule, so a player who has won a game
-- would block the delete; it's cleared first.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id AND is_bot) THEN
        RAISE EXCEPTION 'Bot accounts cannot be deleted';
    END IF;

    UPDATE public.games SET winner_id = NULL WHERE winner_id = v_user_id;

    DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
