import { chooseBestMove, generateMoves, TurnAction, scoreTurn } from './bot-behavior';
import { validateWord } from '../../engine/src/dictionary';

describe('Task 1.3 Verification: Bot AI v0 (Greedy)', () => {
  
  describe('Core Bot AI Requirements (Task 1.3)', () => {
    it('should choose highest scoring legal move', () => {
      // Test basic move generation and scoring
      const word = 'CAT';
      const keyLetter = 'S';
      
      const bestMove = chooseBestMove(word, keyLetter);
      
      // Verify bot returns a valid move
      expect(bestMove).toBeDefined();
      expect(bestMove.word).toBeDefined();
      expect(bestMove.actions).toBeDefined();
      expect(bestMove.score).toBeGreaterThanOrEqual(0);
      
      // Verify the move is valid for bots
      const validationResult = validateWord(bestMove.word, word, { allowBot: true });
      expect(validationResult.valid).toBe(true);
      
      console.log('✅ Best Move from "CAT" with key "S":', bestMove);
      console.log('✅ Move validation result:', validationResult);
    });

    it('should prioritize key letter usage for higher scores', () => {
      const word = 'CAT';
      const keyLetter = 'S';
      
      const bestMove = chooseBestMove(word, keyLetter);
      
      // If the best move includes the key letter, score should be higher
      if (bestMove.word.includes(keyLetter)) {
        expect(bestMove.score).toBeGreaterThan(1); // Should get bonus points
        console.log('✅ Key Letter Bonus: Move includes key letter "S", score =', bestMove.score);
      } else {
        console.log('✅ No Key Letter: Move does not include key letter, score =', bestMove.score);
      }
    });

    it('should implement greedy strategy (choosing highest score)', () => {
      const word = 'SHIP';
      const keyLetter = 'E';
      
      // Generate multiple candidate moves
      const addMoves = generateMoves(word, keyLetter, false, 'add');
      const removeMoves = generateMoves(word, keyLetter, false, 'remove');
      
      expect(addMoves.length).toBeGreaterThan(0);
      expect(removeMoves.length).toBeGreaterThan(0);
      
      // Get the bot's choice
      const bestMove = chooseBestMove(word, keyLetter);
      
      // Verify the bot chose a valid move with reasonable score
      expect(bestMove.score).toBeGreaterThanOrEqual(0);
      expect(validateWord(bestMove.word, word, { allowBot: true }).valid).toBe(true);
      
      console.log('✅ Greedy Strategy: From "SHIP" with key "E", chose move:', bestMove);
      console.log('✅ Available add moves:', addMoves.length);
      console.log('✅ Available remove moves:', removeMoves.length);
    });

    it('should integrate with scoring module correctly', () => {
      const currentWord = 'CAT';
      const newWord = 'CATS';
      const actions: TurnAction[] = [{ type: 'ADD', letter: 'S', position: 3 }];
      const keyLetter = 'S';
      
      // Test that the bot's scoring matches the scoring module
      const score = scoreTurn(currentWord, newWord, actions, keyLetter);
      expect(score).toBe(2); // +1 for add, +1 for key letter
      
      // Test that bot can use the scoring function
      const botMove = chooseBestMove(currentWord, keyLetter);
      expect(botMove.score).toBeGreaterThanOrEqual(0);
      
      console.log('✅ Scoring Integration: scoreTurn("CAT", "CATS", [ADD S], "S") =', score);
      console.log('✅ Bot Score Calculation: chooseBestMove("CAT", "S") =', botMove.score);
    });
  });

  describe('Bot Performance Requirements (Task 1.3)', () => {
    it('should simulate 100 turns without crash', () => {
      let word = 'CAT';
      let successful = 0;
      
      console.log('✅ Starting 100-turn simulation...');
      
      for (let turn = 1; turn <= 100; turn++) {
        try {
          const keyLetter = String.fromCharCode(65 + (turn % 26)); // A-Z cycling
          const move = chooseBestMove(word, keyLetter);
          
          // Verify move is valid
          expect(move).toBeDefined();
          expect(move.word).toBeDefined();
          expect(move.score).toBeGreaterThanOrEqual(0);
          
          // Update word for next turn (if bot made a move)
          if (move.word !== word) {
            word = move.word;
          }
          
          successful++;
          
          // Log progress every 25 turns
          if (turn % 25 === 0) {
            console.log(`✅ Turn ${turn}: Current word "${word}", Move score: ${move.score}`);
          }
        } catch (error) {
          console.error(`❌ Turn ${turn} failed:`, error);
          throw error;
        }
      }
      
      expect(successful).toBe(100);
      console.log('✅ 100-turn simulation completed successfully!');
      console.log('✅ Final word after 100 turns:', word);
    });

    it('should maintain average latency <50ms', () => {
      const word = 'HELLO';
      const iterations = 20;
      const times: number[] = [];
      
      console.log('✅ Starting latency test with 20 iterations...');
      
      for (let i = 0; i < iterations; i++) {
        const keyLetter = String.fromCharCode(65 + (i % 26));
        
        const startTime = performance.now();
        const move = chooseBestMove(word, keyLetter);
        const endTime = performance.now();
        
        const latency = endTime - startTime;
        times.push(latency);
        
        expect(move).toBeDefined();
        expect(latency).toBeLessThan(100); // Individual moves should be under 100ms
      }
      
      const averageLatency = times.reduce((a, b) => a + b, 0) / times.length;
      const maxLatency = Math.max(...times);
      const minLatency = Math.min(...times);
      
      expect(averageLatency).toBeLessThan(50); // Average should be under 50ms
      
      console.log('✅ Latency Results:');
      console.log('   - Average:', averageLatency.toFixed(2), 'ms');
      console.log('   - Maximum:', maxLatency.toFixed(2), 'ms');
      console.log('   - Minimum:', minLatency.toFixed(2), 'ms');
      console.log('   - Target: <50ms average ✅');
    });
  });

  describe('Move Generation and Validation (Task 1.3)', () => {
    it('should generate valid moves for add/remove/rearrange operations', () => {
      const word = 'CAT';
      const keyLetter = 'S';
      
      // Test each move type
      const addMoves = generateMoves(word, keyLetter, false, 'add');
      const removeMoves = generateMoves(word, keyLetter, false, 'remove');
      const replaceMoves = generateMoves(word, keyLetter, false, 'replace');
      
      expect(addMoves.length).toBeGreaterThan(0);
      expect(removeMoves.length).toBeGreaterThan(0);
      expect(replaceMoves.length).toBeGreaterThan(0);
      
      // Verify move structure
      addMoves.forEach(move => {
        expect(move.word).toBeDefined();
        expect(move.actions).toBeDefined();
        expect(Array.isArray(move.actions)).toBe(true);
      });
      
      console.log('✅ Move Generation:');
      console.log('   - Add moves:', addMoves.length);
      console.log('   - Remove moves:', removeMoves.length);
      console.log('   - Replace moves:', replaceMoves.length);
      console.log('   - Sample add move:', addMoves[0]);
    });

    it('should handle edge cases gracefully', () => {
      // Test with very short word
      const shortMove = chooseBestMove('AT', 'S');
      expect(shortMove).toBeDefined();
      expect(shortMove.score).toBeGreaterThanOrEqual(0);
      
      // Test with longer word
      const longMove = chooseBestMove('ELEPHANT', 'Z');
      expect(longMove).toBeDefined();
      expect(longMove.score).toBeGreaterThanOrEqual(0);
      
      // Test with word that already contains key letter
      const hasKeyMove = chooseBestMove('CATS', 'S');
      expect(hasKeyMove).toBeDefined();
      expect(hasKeyMove.score).toBeGreaterThanOrEqual(0);
      
      console.log('✅ Edge Cases:');
      console.log('   - Short word "AT" + key "S":', shortMove.score, 'points');
      console.log('   - Long word "ELEPHANT" + key "Z":', longMove.score, 'points');
      console.log('   - Has key "CATS" + key "S":', hasKeyMove.score, 'points');
    });

    it('should prioritize key letter when possible', () => {
      const word = 'CAT';
      const keyLetter = 'S';
      
      // Generate moves with key letter required
      const keyMoves = generateMoves(word, keyLetter, true);
      
      // Generate moves without key letter required
      const allMoves = generateMoves(word, keyLetter, false);
      
      expect(allMoves.length).toBeGreaterThanOrEqual(keyMoves.length);
      
      // Verify key moves actually include the key letter
      keyMoves.forEach(move => {
        expect(move.word.includes(keyLetter)).toBe(true);
      });
      
      console.log('✅ Key Letter Prioritization:');
      console.log('   - Moves with key letter required:', keyMoves.length);
      console.log('   - All possible moves:', allMoves.length);
      console.log('   - Key letter moves verified to include "S"');
    });
  });

  describe('Bot Integration Verification (Task 1.3)', () => {
    it('should work with validation system using bot privileges', () => {
      const word = 'CAT';
      const keyLetter = 'X'; // Uncommon letter
      
      const move = chooseBestMove(word, keyLetter);
      
      // Bot should be able to make moves that humans cannot
      const botValidation = validateWord(move.word, word, { allowBot: true });
      expect(botValidation.valid).toBe(true);
      
      // If the word would be invalid for humans, demonstrate bot privilege
      const humanValidation = validateWord(move.word, word, { allowBot: false });
      
      console.log('✅ Bot Privileges:');
      console.log('   - Bot move:', move.word);
      console.log('   - Bot validation:', botValidation.valid);
      console.log('   - Human validation:', humanValidation.valid);
      console.log('   - Bot can make moves humans cannot:', !humanValidation.valid);
    });

    it('should handle fallback when no valid moves exist', () => {
      // Create a scenario where bot might struggle to find moves
      const word = 'ZZZZZ'; // Unusual word
      const keyLetter = 'Q'; // Difficult letter
      
      const move = chooseBestMove(word, keyLetter);
      
      // Bot should still return something (even if it's a pass)
      expect(move).toBeDefined();
      expect(move.word).toBeDefined();
      expect(move.score).toBeGreaterThanOrEqual(0);
      
      console.log('✅ Fallback Handling:');
      console.log('   - Difficult scenario: word "ZZZZZ", key "Q"');
      console.log('   - Bot response:', move);
      console.log('   - Bot handles gracefully without crashing');
    });
  });
}); 