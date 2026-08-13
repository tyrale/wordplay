/**
 * Phase 0 smoke test (see docs/project/REACT_NATIVE_PORT_PLAN.md).
 *
 * Proves that @wordplay/engine - the same platform-agnostic package apps/web
 * consumes - can be imported and exercised from apps/native's Jest
 * environment (jest-expo preset) with zero changes. This is the regression
 * backstop for "never re-implement game logic in the RN app" (see the
 * plan's critical items list): if this ever fails, either the engine
 * accidentally picked up a DOM/browser dependency, or the native Jest
 * environment can't resolve the workspace package - both are Phase 0-level
 * problems that should be caught here before any real native UI is built.
 */
import { getScoreForMove, calculateScore } from '@wordplay/engine/scoring';
import { validateWordWithDependencies } from '@wordplay/engine/dictionary';
import { LocalGameStateManagerWithDependencies } from '@wordplay/engine/gamestate';
import { createTestAdapter } from '@wordplay/engine/adapters/testAdapter';

describe('@wordplay/engine consumed from apps/native (Jest/jest-expo)', () => {
  it('scores a simple add-letter move the same way the engine does on web', () => {
    // CAT -> CATS is a single-letter add: +1.
    expect(getScoreForMove('CAT', 'CATS', [])).toBe(1);
  });

  it('calculateScore returns the structured breakdown shape', () => {
    const result = calculateScore('CAT', 'CATS');
    expect(result.score).toBe(1);
    expect(typeof result.breakdown).toBe('object');
    expect(result.breakdown.addLetterPoints).toBe(1);
  });

  it('validates words via the dependency-injected dictionary using the test adapter word data', () => {
    const testAdapter = createTestAdapter();
    const wordData = testAdapter.getWordData();

    const valid = validateWordWithDependencies('CAT', wordData);
    expect(valid.isValid).toBe(true);

    const invalid = validateWordWithDependencies('ZZZZZZ', wordData);
    expect(invalid.isValid).toBe(false);
  });

  it('runs a full game via the game state manager and produces a finished game', () => {
    const testAdapter = createTestAdapter();
    testAdapter.addWord('CATS');
    const dependencies = testAdapter.getGameDependencies();

    // A 1-round game: initial word CAT -> human plays CATS (turn 1) -> bot
    // passes (turn 2) -> 2 individual turns = 1 round with 2 players, so the
    // game should finish. This deliberately drives the manager directly
    // (applyMove/passTurn) rather than depending on bot move-finding
    // heuristics against a tiny test dictionary, which is a property of the
    // bot AI, not of engine/native compatibility - not what this smoke test
    // is trying to prove.
    const gameManager = new LocalGameStateManagerWithDependencies(dependencies, {
      maxTurns: 1,
      initialWord: 'CAT',
      allowBotPlayer: true
    });
    gameManager.startGame();
    expect(gameManager.getState().gameStatus).toBe('playing');

    gameManager.applyMove('CATS');
    expect(gameManager.getState().currentWord).toBe('CATS');

    gameManager.passTurn();

    const finalState = gameManager.getState();
    expect(finalState.gameStatus).toBe('finished');
    expect(finalState.usedWords).toContain('CATS');
  });
});
