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
    banner: ['Tap the glowing letter', 'to add it to your word'],
    completionCondition: (gameState, tutorialState) =>
      tutorialState.lastPendingWord === 'WORDS' ||
      Boolean(gameState && gameState.currentWord === 'WORDS')
  },
  {
    id: 2,
    banner: ['Tap a letter in your word', 'to remove it'],
    completionCondition: (gameState, tutorialState) =>
      tutorialState.lastPendingWord === 'WORS' ||
      Boolean(gameState && gameState.currentWord === 'WORS')
  },
  {
    id: 3,
    banner: ['Drag letters to rearrange', 'Spell ROWS, then tap to submit'],
    disableLetterRemoval: true,
    completionCondition: (_gameState, tutorialState) =>
      tutorialState.submittedWords.includes('ROWS')
  },
  {
    id: 4,
    banner: ['Key letters score double', "Locked letters can't be removed", '20 turns each - high score wins'],
    completionCondition: (_gameState, tutorialState) =>
      tutorialState.submittedWords.includes('ROWS') && tutorialState.submittedWords.length >= 2
  },
  {
    id: 5,
    banner: ["You're ready - have fun!"],
    completionCondition: (_gameState, tutorialState) =>
      tutorialState.submittedWords.includes('ROWS') && tutorialState.submittedWords.length >= 3
  }
];
