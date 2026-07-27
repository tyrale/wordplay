-- Community Unlocks Migration
--
-- Tracks how many unique players (across everyone, not just the local
-- device) have ever triggered each unlockable. Used to power:
--   - the "world" mechanic's community-wide unlock progress line in the menu
--   - the per-unlock rarity line ("X% found") shown on the unlock alert
--
-- Every unlock counts toward the community total at most once per player
-- (first-time only), enforced via the `user_unlocks` uniqueness constraint.

-- USER_UNLOCKS table: one row per (player, unlock) the player has ever
-- triggered. Existence of a row is what "counts" toward the community total.
CREATE TABLE IF NOT EXISTS public.user_unlocks (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    unlock_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, unlock_id)
);

-- COMMUNITY_UNLOCK_COUNTS table: denormalized count of unique players who
-- have triggered each unlock, kept in sync by `record_community_unlock()`.
CREATE TABLE IF NOT EXISTS public.community_unlock_counts (
    unlock_id TEXT PRIMARY KEY,
    unlock_count INTEGER NOT NULL DEFAULT 0
);

-- COMMUNITY_STATS table: singleton row tracking the total number of players
-- (rows in public.users) the community percentages are calculated against.
CREATE TABLE IF NOT EXISTS public.community_stats (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    total_players INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.community_stats (id, total_players)
VALUES (true, (SELECT COUNT(*) FROM public.users))
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_unlock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_stats ENABLE ROW LEVEL SECURITY;

-- Players can see their own unlock history (not required by the UI today,
-- but harmless and consistent with the rest of the schema's per-user policies).
CREATE POLICY "Users can view their own unlocks" ON public.user_unlocks
    FOR SELECT USING (user_id = auth.uid());

-- Community-wide counts/stats are aggregate, non-identifying data - readable
-- by anyone (including anonymous sessions) so the menu/alert stats can be
-- shown without extra round trips.
CREATE POLICY "Anyone can view community unlock counts" ON public.community_unlock_counts
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view community stats" ON public.community_stats
    FOR SELECT USING (true);

-- No direct INSERT/UPDATE policies on user_unlocks/community_unlock_counts -
-- all writes go through the SECURITY DEFINER function below so the
-- "first-time only" de-dupe + counter increment stay atomic and consistent.

-- Keep community_stats.total_players in sync whenever a new player profile
-- is created (covers both real and anonymous sign-ins, since both insert
-- into public.users via handle_new_user()).
CREATE OR REPLACE FUNCTION public.increment_total_players()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.community_stats SET total_players = total_players + 1 WHERE id = true;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS on_user_created_increment_total_players ON public.users;
CREATE TRIGGER on_user_created_increment_total_players
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.increment_total_players();

-- Records that the calling (authenticated/anonymous) player triggered
-- `p_unlock_id`. Increments the community count only the first time this
-- particular player unlocks this particular item. Returns the up-to-date
-- community count for the item and the current total player count, so the
-- client can compute a rarity percentage without a second round trip.
CREATE OR REPLACE FUNCTION public.record_community_unlock(p_unlock_id TEXT)
RETURNS TABLE(unlock_count INTEGER, total_players INTEGER)
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

    INSERT INTO public.user_unlocks (user_id, unlock_id)
    VALUES (v_user_id, p_unlock_id)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_new_rows = ROW_COUNT;

    IF v_new_rows > 0 THEN
        INSERT INTO public.community_unlock_counts (unlock_id, unlock_count)
        VALUES (p_unlock_id, 1)
        ON CONFLICT (unlock_id) DO UPDATE SET unlock_count = community_unlock_counts.unlock_count + 1;
    END IF;

    RETURN QUERY
    SELECT c.unlock_count, s.total_players
    FROM public.community_unlock_counts c, public.community_stats s
    WHERE c.unlock_id = p_unlock_id AND s.id = true;
END;
$$ language 'plpgsql';

GRANT EXECUTE ON FUNCTION public.record_community_unlock(TEXT) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_user_unlocks_user_id ON public.user_unlocks(user_id);
