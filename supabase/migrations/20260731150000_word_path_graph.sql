-- Word Path Graph Migration
--
-- Aggregates every player's local word path graph (see
-- `packages/engine/word-path-graph.ts`) into a single server-side "master"
-- graph: an undirected edge between two words exists here if at least one
-- player has ever connected them via a real word-change move (add/remove/
-- rearrange/substitute a letter). Mirrors the community-unlocks pattern in
-- `20260727150000_community_unlocks.sql` (per-user de-dupe table + a
-- denormalized aggregate table, both kept in sync via a SECURITY DEFINER
-- RPC so writes stay atomic and RLS-safe).

-- USER_WORD_PATH_EDGES table: one row per (player, edge) the player has
-- ever synced. Existence of a row is what "counts" toward the master graph;
-- re-syncing the same edge for the same player is a no-op.
CREATE TABLE IF NOT EXISTS public.user_word_path_edges (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    word_a TEXT NOT NULL,
    word_b TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, word_a, word_b),
    CONSTRAINT user_word_path_edges_canonical_order CHECK (word_a <= word_b)
);

-- MASTER_WORD_PATH_EDGES table: denormalized master graph edge list, with a
-- count of how many unique players have ever made that connection.
CREATE TABLE IF NOT EXISTS public.master_word_path_edges (
    word_a TEXT NOT NULL,
    word_b TEXT NOT NULL,
    player_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (word_a, word_b),
    CONSTRAINT master_word_path_edges_canonical_order CHECK (word_a <= word_b)
);

ALTER TABLE public.user_word_path_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_word_path_edges ENABLE ROW LEVEL SECURITY;

-- Players can see their own synced edges (not required by the UI today,
-- but harmless and consistent with the rest of the schema's per-user policies).
CREATE POLICY "Users can view their own word path edges" ON public.user_word_path_edges
    FOR SELECT USING (user_id = auth.uid());

-- The master graph is aggregate, non-identifying data - readable by anyone
-- (including anonymous sessions), matching community_unlock_counts.
CREATE POLICY "Anyone can view master word path edges" ON public.master_word_path_edges
    FOR SELECT USING (true);

-- No direct INSERT/UPDATE policies - all writes go through the SECURITY
-- DEFINER function below so the "first-time only" de-dupe + counter
-- increment stay atomic and consistent.

-- Records that the calling (authenticated/anonymous) player has these word
-- path edges in their local graph. `p_edges` is a JSON array of two-element
-- arrays, e.g. `[["CAT","CATS"],["CATS","BATS"]]`; each pair is normalized
-- into canonical (word_a <= word_b) order before storage. Only increments
-- the master player_count the first time this particular player syncs this
-- particular edge, regardless of how many times this is called for it.
CREATE OR REPLACE FUNCTION public.sync_word_path_edges(p_edges JSONB)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_pair JSONB;
    v_word_a TEXT;
    v_word_b TEXT;
    v_new_rows INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    FOR v_pair IN SELECT * FROM jsonb_array_elements(p_edges)
    LOOP
        v_word_a := upper(v_pair->>0);
        v_word_b := upper(v_pair->>1);

        IF v_word_a IS NULL OR v_word_b IS NULL OR v_word_a = v_word_b THEN
            CONTINUE;
        END IF;

        IF v_word_a > v_word_b THEN
            SELECT v_word_b, v_word_a INTO v_word_a, v_word_b;
        END IF;

        INSERT INTO public.user_word_path_edges (user_id, word_a, word_b)
        VALUES (v_user_id, v_word_a, v_word_b)
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_new_rows = ROW_COUNT;

        IF v_new_rows > 0 THEN
            INSERT INTO public.master_word_path_edges (word_a, word_b, player_count)
            VALUES (v_word_a, v_word_b, 1)
            ON CONFLICT (word_a, word_b) DO UPDATE SET player_count = master_word_path_edges.player_count + 1;
        END IF;
    END LOOP;
END;
$$ language 'plpgsql';

GRANT EXECUTE ON FUNCTION public.sync_word_path_edges(JSONB) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_user_word_path_edges_user_id ON public.user_word_path_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_master_word_path_edges_word_a ON public.master_word_path_edges(word_a);
CREATE INDEX IF NOT EXISTS idx_master_word_path_edges_word_b ON public.master_word_path_edges(word_b);
