import { describe, it, expect } from 'vitest';
import { TestAdapter } from './testAdapter';
import { createGameStateManagerWithDependencies } from '../../packages/engine/gamestate';
import { findUnlockBySequenceTrigger } from '../../packages/engine/unlock-definitions';

describe('Zen mode grinch sequence repro', () => {
  it('should detect STINK -> STANK -> STUNK the way ZenGame builds wordPath', () => {
    const testAdapter = TestAdapter.getInstance();
    const wordData = (testAdapter as any).wordData ?? testAdapter.getWordData();
    wordData.addWord('STICK');
    wordData.addWord('STINK');
    wordData.addWord('STANK');
    wordData.addWord('STUNK');

    const dependencies = testAdapter.getGameDependencies();
    const gameManager = createGameStateManagerWithDependencies(dependencies, {
      maxTurns: Number.MAX_SAFE_INTEGER,
      allowBotPlayer: false,
      startingWordLength: 5
    });

    gameManager.startGame();
    // Force known starting word (bypasses validation, just like the initial random word pick would)
    gameManager.setWord('STICK');

    let state = gameManager.getState();
    console.log('initial state', state.currentWord, state.gameStatus);

    const words = ['STINK', 'STANK', 'STUNK'];
    let lastZenWordPath: string[] = [];
    for (const w of words) {
      // Capture "stale" React closure state exactly as ZenGame.tsx would have
      // it at the top of handleSubmit, i.e. BEFORE calling actions.applyMove
      // for this move (reflects the last completed render).
      const staleState = gameManager.getState();
      const staleCurrentWord = staleState.currentWord; // wordState.currentWord
      const staleTurnHistory = staleState.turnHistory; // gameState.turnHistory

      const attempt = gameManager.attemptMove(w);
      console.log('attempt', w, attempt.isValid, attempt.canApply, attempt.validationResult);
      const applied = gameManager.applyMove(attempt);
      console.log('applied', w, applied);
      state = gameManager.getState();
      console.log('turnHistory now', JSON.stringify(state.turnHistory.map(t => t.newWord)));

      // Exactly ZenGame.tsx's construction:
      // const wordPath = [wordState.currentWord, ...gameState.turnHistory.map(t => t.newWord), newWord];
      const newWord = attempt.newWord;
      lastZenWordPath = [staleCurrentWord, ...staleTurnHistory.map(t => t.newWord), newWord];
      console.log('ZenGame-style wordPath after playing', w, '=', lastZenWordPath);

      if (lastZenWordPath.length >= 3) {
        const stepMatches = findUnlockBySequenceTrigger(lastZenWordPath);
        console.log('  -> matches at this step:', stepMatches.map(m => m.id));
      }
    }

    const matches = findUnlockBySequenceTrigger(lastZenWordPath);
    console.log('final matches', matches.map(m => m.id));
    expect(matches.length).toBeGreaterThan(0);
  });
});
