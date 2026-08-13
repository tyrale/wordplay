/**
 * Persistent Storage
 *
 * Requests "persistent" storage mode from the browser via the Storage API.
 * This does NOT protect against a user explicitly clearing site data, but it
 * exempts the origin from automatic, silent eviction under disk pressure
 * (the main way unlocks/stats can quietly disappear without the user doing
 * anything). Safe to call multiple times; the browser may show a permission
 * prompt on some platforms, or grant/deny silently based on site engagement
 * heuristics (e.g. Chrome auto-grants for bookmarked/installed/frequently
 * visited sites).
 */

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage || !navigator.storage.persist) {
      return false;
    }

    const alreadyPersisted = await navigator.storage.persisted?.();
    if (alreadyPersisted) {
      return true;
    }

    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('[Storage] Persistent storage granted - unlocks/stats are protected from automatic eviction');
    } else {
      console.log('[Storage] Persistent storage not granted (browser heuristics); data may still be evicted under storage pressure');
    }
    return granted;
  } catch (error) {
    console.warn('[Storage] Failed to request persistent storage:', error);
    return false;
  }
}
