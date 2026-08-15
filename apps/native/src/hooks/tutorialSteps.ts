/**
 * Native tutorial step definitions - ports apps/web's
 * `components/tutorial/tutorialSteps.ts`, with one real adaptation: step
 * 3 on web is a drag-only step ("Drag letters around to spell ROWS") that
 * disables tap-to-remove specifically to force the player to practice
 * dragging. This native port has no drag-and-drop at all (tap-to-append/
 * tap-to-remove only - see AlphabetGrid.tsx's doc comment), so the step
 * is rewritten for the tap interaction model instead of ported verbatim:
 * the banner now instructs clearing letters and retyping rather than
 * dragging, and `disableLetterRemoval` is dropped (there's no drag
 * alternative to fall back on if removal were disabled here).
 *
 * The actual completion condition for step 3 - "the player has submitted
 * the word ROWS" - is unchanged, since it doesn't care *how* the word was
 * built, only that it was played.
 */
import type { GameState, GameConfig } from '@wordplay/engine/interfaces';

export interface TutorialState {
  submittedWords: string[];
  lastTurnHistoryLength: number;
  /** submittedWords.length captured when the final step starts, used to require
   *  one more real word play before the tutorial is allowed to close. */
  finalStepWordBaseline?: number;
}

export interface TutorialStep {
  id: number;
  /** Lines of copy shown in the instruction banner for this step */
  banner: string[];
  completionCondition: (pendingWord: string, gameState: GameState | null, tutorialState: TutorialState) => boolean;
}

/**
 * Forced starting config for the tutorial's first game. Merged with the
 * real bot config (botId) by the caller. Using a fixed 'WORD' start lets
 * the scripted steps (add S, remove D, rearrange to ROWS) always apply.
 */
export const TUTORIAL_INITIAL_CONFIG: Partial<GameConfig> = {
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
    completionCondition: (pendingWord, gameState) =>
      pendingWord === 'WORDS' || Boolean(gameState && gameState.currentWord === 'WORDS')
  },
  {
    id: 2,
    banner: ['Tap the D', 'in the word to remove it'],
    completionCondition: (pendingWord, gameState) =>
      pendingWord === 'WORS' || Boolean(gameState && gameState.currentWord === 'WORS')
  },
  {
    id: 3,
    banner: ['Clear it, then tap letters', 'to spell ROWS,', 'then tap the checkmark'],
    completionCondition: (_pendingWord, _gameState, tutorialState) =>
      tutorialState.submittedWords.includes('ROWS')
  },
  {
    id: 4,
    banner: ['Key letters +1 point', '& locked next round', 'now play the game!'],
    completionCondition: (_pendingWord, _gameState, tutorialState) =>
      tutorialState.submittedWords.includes('ROWS') && tutorialState.submittedWords.length >= 2
  },
  {
    id: 5,
    // Closing message - the tutorial only closes once the player has actually
    // played a word after this step is shown (tracked via finalStepWordBaseline,
    // captured when this step starts).
    banner: ['20 turns - high score wins', "You got this. It's easy work."],
    completionCondition: (_pendingWord, _gameState, tutorialState) =>
      tutorialState.finalStepWordBaseline !== undefined &&
      tutorialState.submittedWords.length > tutorialState.finalStepWordBaseline
  }
];
