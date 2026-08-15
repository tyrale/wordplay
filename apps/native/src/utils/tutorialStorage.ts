/**
 * Native tutorial storage - ports the two flags from apps/web's
 * `utils/tutorialStorage.ts` actually needed for this slice
 * (hasSeenTutorial/markTutorialSeen). The other three web flags
 * (challenge-intro, clear-hint, zen-intro) relate to features not fully
 * built in this port yet and are deferred along with those features.
 *
 * Unlike web's synchronous `localStorage` calls, AsyncStorage is async,
 * so these can't be plain synchronous functions - callers await them
 * (typically once, in an effect on mount).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_SEEN_KEY = 'wordplay-tutorial-seen';

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TUTORIAL_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch {
    // Ignore storage errors.
  }
}
