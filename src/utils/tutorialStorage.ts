const TUTORIAL_SEEN_KEY = 'wordplay-tutorial-seen';
const CHALLENGE_INTRO_SEEN_KEY = 'wordplay-challenge-intro-seen';

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
