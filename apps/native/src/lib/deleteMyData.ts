/**
 * "Delete my data" (menu → about). Permanently removes everything this
 * app stores about the player:
 *
 * - Server: if the player ever signed in (an anonymous Supabase session
 *   created the first time they used online play or the daily challenge),
 *   the `delete_my_account` RPC deletes their account; every per-player
 *   row cascades from it (see
 *   supabase/migrations/20261113120000_delete_my_account.sql).
 * - Device: every AsyncStorage key the app owns (progress, unlocks,
 *   stats, settings, display name and the Supabase session).
 *
 * The server delete runs first and must succeed before anything local is
 * cleared. Otherwise a failed request would throw away the only session
 * that can still delete the server account.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings } from 'react-native';
import * as Updates from 'expo-updates';
import { supabase } from './supabase';

export interface DeleteMyDataResult {
  /** True if a server account existed and was deleted. */
  deletedServerAccount: boolean;
}

export async function deleteMyData(): Promise<DeleteMyDataResult> {
  const { data } = await supabase.auth.getSession();
  let deletedServerAccount = false;

  if (data.session) {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      throw new Error(`Could not delete your online account: ${error.message}`);
    }
    deletedServerAccount = true;
    // The account is gone, so only the local copy of the session needs
    // dropping (a server-side sign-out would just fail).
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }

  await AsyncStorage.clear();
  return { deletedServerAccount };
}

/**
 * Restarts the JS app so every provider re-reads the now-empty storage.
 * Returns false if neither restart path is available; the caller should
 * then ask the player to close and reopen the app.
 */
export async function restartApp(): Promise<boolean> {
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    if (__DEV__) {
      DevSettings.reload();
      return true;
    }
    return false;
  }
}
