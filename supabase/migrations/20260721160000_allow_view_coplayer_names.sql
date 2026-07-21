-- Allow a player to see the display_name/username of anyone they share a
-- game with. Previously the "Users can view their own profile" policy only
-- allowed auth.uid() = id, so opponent names (needed for in-game display
-- and the "active games" list) were silently blocked by RLS and always
-- came back NULL.

CREATE OR REPLACE FUNCTION public.shares_game_with(target_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.game_players gp1
        JOIN public.game_players gp2 ON gp1.game_id = gp2.game_id
        WHERE gp1.user_id = auth.uid() AND gp2.user_id = target_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.shares_game_with(UUID) TO authenticated, anon;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (
        auth.uid() = id OR public.shares_game_with(id)
    );
