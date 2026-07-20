-- Fix: the "Users can view players in their games" policy on
-- public.game_players queried public.game_players from within its own
-- USING clause, causing "infinite recursion detected in policy for
-- relation game_players". Replace the self-referencing subquery with a
-- SECURITY DEFINER helper function, which evaluates without re-triggering
-- RLS on game_players.

CREATE OR REPLACE FUNCTION public.is_game_participant(p_game_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.game_players
        WHERE game_id = p_game_id AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_game_participant(UUID) TO authenticated, anon;

DROP POLICY IF EXISTS "Users can view players in their games" ON public.game_players;
CREATE POLICY "Users can view players in their games" ON public.game_players
    FOR SELECT USING (
        user_id = auth.uid() OR public.is_game_participant(game_id)
    );
