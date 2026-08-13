/**
 * Supabase Word Path Graph Adapter
 *
 * Uploads the local player's word path graph edges to a server-side master
 * graph via Supabase (see `supabase/migrations/20260731150000_word_path_graph.sql`).
 * Every call silently no-ops if Supabase isn't configured or unreachable, so
 * the word path graph feature keeps working fully offline/local-only.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ensureAnonymousSession } from './supabaseAuthAdapter';

/**
 * Uploads a batch of word path edges (pairs of connected words) to the
 * server's master word path graph. Returns true if the sync succeeded (or
 * there was nothing to sync), false if it failed and should be retried later.
 */
export async function syncWordPathEdges(edges: Array<[string, string]>): Promise<boolean> {
  if (edges.length === 0) return true;
  if (!isSupabaseConfigured()) return false;

  try {
    const userId = await ensureAnonymousSession();
    if (!userId) return false;

    const { error } = await supabase.rpc('sync_word_path_edges', { p_edges: edges });
    if (error) {
      console.warn('Failed to sync word path edges:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Failed to sync word path edges:', error);
    return false;
  }
}
