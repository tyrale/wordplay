const TUTORIAL_SEEN_KEY = 'wordplay-tutorial-seen';

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
