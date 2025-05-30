import { chooseBestMove, generateMoves, TurnAction, scoreTurn } from './bot-behavior';
import { validateWord } from '../../engine/src/dictionary';

describe('Greedy Bot AI', () => {
  it('should simulate 100 turns without crashing and with <50ms average latency', () => {
    const startWord = 'PLAY';
    const keyLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let word = startWord;
    let totalTime = 0;
    for (let i = 0; i < 100; i++) {
      const keyLetter = keyLetters[i % keyLetters.length];
      const t0 = performance.now();
      const move = chooseBestMove(word, keyLetter);
      const t1 = performance.now();
      totalTime += (t1 - t0);
      // The move should be valid
      expect(validateWord(move.word, word, true)).toBe(true);
      // If possible, should use the key letter
      if (!word.includes(keyLetter)) {
        expect(move.word.includes(keyLetter)).toBe(true);
      }
      word = move.word;
    }
    const avgLatency = totalTime / 100;
    expect(avgLatency).toBeLessThan(50);
  });

  it('should always choose a valid, high-scoring move', () => {
    const word = 'GAME';
    const keyLetter = 'S';
    const move = chooseBestMove(word, keyLetter);
    expect(validateWord(move.word, word, true)).toBe(true);
    // Should use the key letter if not present
    if (!word.includes(keyLetter)) {
      expect(move.word.includes(keyLetter)).toBe(true);
    }
    // Should not return the same word unless no moves are possible
    if (move.word === word) {
      expect(move.score).toBe(0);
    } else {
      expect(move.score).toBeGreaterThan(0);
    }
  });

  it('should print the top 5 candidate moves for debugging', () => {
    const word = 'JEST';
    const keyLetter = 'A';
    const candidates = generateMoves(word, keyLetter, true, 'add'); // Example: show add+rearrange
    // Score and sort candidates
    const scored = candidates.map((c) => ({
      ...c,
      score: scoreTurn(word, c.word, c.actions, keyLetter)
    }));
    scored.sort((a, b) => b.score - a.score);
    console.log(`Word in play: ${word}, Key letter: ${keyLetter}`);
    console.log('Top 5 candidate moves:');
    for (const c of scored.slice(0, 5)) {
      console.log(`  ${c.word} (score: ${c.score}, actions: ${c.actions.map(a => a.type + ':' + a.letter + '@' + a.position).join(', ')})`);
    }
    expect(scored.length).toBeGreaterThan(0);
  });

  it('should find the highest possible scoring move', () => {
    const word = 'CAT';
    const keyLetter = 'S';
    const move = chooseBestMove(word, keyLetter);
    
    // Verify the move is valid
    expect(validateWord(move.word, word, true)).toBe(true);
    
    // Calculate expected maximum score:
    // +1 for adding key letter
    // +1 for removing a letter
    // +1 for rearranging
    // +1 for using key letter
    const expectedMaxScore = 4;
    
    // Log the move details for debugging
    console.log(`\nTesting maximum score move:`);
    console.log(`From: ${word}`);
    console.log(`To: ${move.word}`);
    console.log(`Score: ${move.score}`);
    console.log(`Actions: ${move.actions.map(a => a.type + ':' + a.letter + '@' + a.position).join(', ')}`);
    
    // Verify the score is at least the expected maximum
    expect(move.score).toBeGreaterThanOrEqual(expectedMaxScore);
    
    // Verify the move includes all possible scoring actions
    const actionTypes = new Set(move.actions.map(a => a.type));
    expect(actionTypes.has('ADD')).toBe(true);
    expect(actionTypes.has('REMOVE')).toBe(true);
    expect(actionTypes.has('REARRANGE')).toBe(true);
    
    // Verify the key letter is used
    expect(move.word.includes(keyLetter)).toBe(true);
  });
}); 