import type { GameState, GameConfig } from '../../../packages/engine/interfaces';

export interface TutorialState {
  lastPendingWord: string;
  submittedWords: string[];
  lastTurnHistoryLength: number;
}

export interface TutorialStep {
  id: number;
  /** Lines of copy shown in the instruction banner for this step */
  banner: string[];
  /** Forwarded to InteractiveGame to block click-to-remove during drag-only steps */
  disableLetterRemoval?: boolean;
  completionCondition: (gameState: GameState | null, tutorialState: TutorialState) => boolean;
}

/**
 * Forced starting config for the tutorial's first game. Merged with the
 * real bot config (botId) by the caller. Using a fixed 'WORD' start lets
 * the scripted steps (add S, remove D, rearrange to ROWS) always apply.
 */
export const TUTORIAL_INITIAL_CONFIG: GameConfig = {
  initialWord: 'WORD',
  maxTurns: 20,
  allowBotPlayer: true,
  enableKeyLetters: true,
  enableLockedLetters: true
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    banner: ['Tap the S', 'to spell words'],
    completionCondition: (gameState, tutorialState) =>
      tutorialState.lastPendingWord === 'WORDS' ||
      Boolean(gameState && gameState.currentWord === 'WORDS')
  },
  {
    id: 2,
    banner: ['Tap the D', 'to remove it'],
    completionCondition: (gameState, tutorialState) =>
      tutorialState.lastPendingWord === 'WORS' ||
      Boolean(gameState && gameState.currentWord === 'WORS')
  },
  {
    id: 3,
    banner: ['Drag letters around', 'to spell ROWS', 'then tap ✓'],
    disableLetterRemoval: true,
    completionCondition: (_gameState, tutorialState) =>
      tutorialState.submittedWords.includes('ROWS')
  },
  {
    id: 4,
    banner: ['Key letters +1 point', "& locked next round", 'now play the game!'],
    completionCondition: (_gameState, tutorialState) =>
      tutorialState.submittedWords.includes('ROWS') && tutorialState.submittedWords.length >= 2
  },
  {
    id: 5,
    // Closing message only - no further action required, so it completes (and the
    // overlay disappears) as soon as it's shown, after the same delay every other
    // step uses before advancing.
    banner: ['20 turns - high score wins', "You got this. It's easy work."],
    completionCondition: () => true
  }
];
