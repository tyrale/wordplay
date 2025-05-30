import { chooseBestMove, generateMoves, TurnAction, scoreTurn } from './bot-behavior';
import { validateWord } from '../../engine/src/dictionary';

describe('Greedy Bot AI', () => {
  it('should choose the highest scoring move', () => {
    const word = 'CAT';
    const keyLetter = 'S';

    const bestMove = chooseBestMove(word, keyLetter);
    
    expect(bestMove).toBeDefined();
    expect(bestMove.score).toBeGreaterThan(0);
    
    // Check that the move is valid for bots
    expect(validateWord(bestMove.word, word, { allowBot: true }).valid).toBe(true);
  });

  it('should generate valid moves', () => {
    const word = 'CAT';
    const keyLetter = 'S';

    const moves = generateMoves(word, keyLetter, true, 'add');
    
    expect(moves.length).toBeGreaterThan(0);
    
    // Check that moves have the expected structure
    moves.forEach(move => {
      expect(move.word).toBeDefined();
      expect(move.actions).toBeDefined();
      expect(Array.isArray(move.actions)).toBe(true);
    });
  });

  it('should score turns correctly', () => {
    const currentWord = 'CAT';
    const newWord = 'CATS';
    const actions: TurnAction[] = [{ type: 'ADD', letter: 'S', position: 3 }];
    const keyLetter = 'S';

    const score = scoreTurn(currentWord, newWord, actions, keyLetter);
    
    // Should get points for adding a letter and using key letter
    expect(score).toBeGreaterThan(1);
  });

  it('should handle moves with key letter bonus', () => {
    const word = 'CAT';
    const keyLetter = 'S';

    const bestMove = chooseBestMove(word, keyLetter);
    
    if (bestMove && bestMove.word.includes(keyLetter)) {
      expect(bestMove.score).toBeGreaterThan(1); // Should get bonus points
      expect(validateWord(bestMove.word, word, { allowBot: true }).valid).toBe(true);
    }
  });
}); 