import { useGameState } from './gameState';

// Helper to reset Zustand state between tests
const resetStore = () => {
  useGameState.getState().reset('TEST', [], []);
};

describe('GameState Zustand Slice', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should set the word', () => {
    useGameState.getState().setWord('HELLO');
    expect(useGameState.getState().word).toBe('HELLO');
  });

  it('should add and remove key letters', () => {
    useGameState.getState().addKeyLetter('A');
    useGameState.getState().addKeyLetter('B');
    expect(useGameState.getState().keyLetters).toEqual(['A', 'B']);
    useGameState.getState().removeKeyLetter('A');
    expect(useGameState.getState().keyLetters).toEqual(['B']);
  });

  it('should add and remove locked letters', () => {
    useGameState.getState().addLockedLetter('X');
    useGameState.getState().addLockedLetter('Y');
    expect(useGameState.getState().lockedLetters).toEqual(['X', 'Y']);
    useGameState.getState().removeLockedLetter('X');
    expect(useGameState.getState().lockedLetters).toEqual(['Y']);
  });

  it('should move letters in the word', () => {
    useGameState.getState().setWord('WORD');
    useGameState.getState().moveLetter(0, 3); // Move 'W' to end
    expect(useGameState.getState().word).toBe('ORDW');
    useGameState.getState().moveLetter(2, 0); // Move 'D' to start
    expect(useGameState.getState().word).toBe('DORW');
  });

  it('should reset the state', () => {
    useGameState.getState().setWord('FOO');
    useGameState.getState().addKeyLetter('Z');
    useGameState.getState().addLockedLetter('Q');
    useGameState.getState().reset('BAR', ['A'], ['B']);
    expect(useGameState.getState().word).toBe('BAR');
    expect(useGameState.getState().keyLetters).toEqual(['A']);
    expect(useGameState.getState().lockedLetters).toEqual(['B']);
  });
}); 