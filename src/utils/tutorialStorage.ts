const TUTORIAL_SEEN_KEY = 'wordplay-tutorial-seen';
const CHALLENGE_INTRO_SEEN_KEY = 'wordplay-challenge-intro-seen';
const CLEAR_HINT_SEEN_KEY = 'wordplay-clear-hint-seen';

export const hasSeenTutorial = (): boolean => {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markTutorialSeen = (): void => {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch {
    // Ignore storage errors (e.g. private browsing)
  }
};

/** First-time "vs world" (challenge mode) intro banner - separate flag from the
 * vs-bot tutorial since a player may try either mode first. */
export const hasSeenChallengeIntro = (): boolean => {
  try {
    return localStorage.getItem(CHALLENGE_INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markChallengeIntroSeen = (): void => {
  try {
    localStorage.setItem(CHALLENGE_INTRO_SEEN_KEY, 'true');
  } catch {
    // Ignore storage errors (e.g. private browsing)
  }
};

/** First-time hint shown when the player taps X to clear the word in play -
 * a separate flag so the hint only ever appears once, regardless of game
 * mode (bot / challenge / multiplayer). */
export const hasSeenClearHint = (): boolean => {
  try {
    return localStorage.getItem(CLEAR_HINT_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markClearHintSeen = (): void => {
  try {
    localStorage.setItem(CLEAR_HINT_SEEN_KEY, 'true');
  } catch {
    // Ignore storage errors (e.g. private browsing)
  }
};
