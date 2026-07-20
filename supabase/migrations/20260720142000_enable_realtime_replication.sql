-- Enable Realtime replication for the tables the multiplayer client
-- subscribes to via postgres_changes. Without this, INSERT/UPDATE events
-- on these tables are never broadcast, so e.g. the invite host's screen
-- never learns that an opponent joined.

ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.turns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
