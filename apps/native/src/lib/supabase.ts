/**
 * Native Supabase Client
 *
 * Mirrors apps/web's `lib/supabase.ts`, adapted for React Native:
 * - Env vars use Expo's `EXPO_PUBLIC_` prefix (inlined at build time by
 *   Metro) instead of Vite's `VITE_` prefix / `import.meta.env`.
 * - Auth session storage is backed by AsyncStorage instead of the browser's
 *   built-in `localStorage` (which the web client relies on implicitly).
 * - `react-native-get-random-values` and `react-native-url-polyfill` must
 *   be imported before `@supabase/supabase-js` touches `crypto`/`URL` -
 *   Hermes doesn't provide either natively. Importing them at the top of
 *   this module (the first module to use supabase-js) ensures the
 *   polyfills are installed before the client is constructed.
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// For development phase, provide fallback values to prevent startup
// failures when env vars aren't configured yet (same rationale as the web
// client's fallback).
const defaultUrl = 'https://placeholder.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(
  supabaseUrl || defaultUrl,
  supabaseAnonKey || defaultKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Not applicable on native (no browser URL to parse a session out
      // of), but explicit `false` avoids Supabase trying to inspect a URL
      // that doesn't exist in this environment.
      detectSessionInUrl: false
    }
  }
);

/** Helper to check if Supabase is properly configured. */
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== defaultUrl);
};
