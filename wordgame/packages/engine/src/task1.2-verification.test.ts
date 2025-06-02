import { scoreTurn, TurnAction } from './scoring';

describe('Task 1.2 Verification: Scoring Module', () => {
  
  describe('Core Scoring Rules (Task 1.2 Requirements)', () => {
    it('should implement +1 point for adding a letter (any position)', () => {
      // Adding letter at end
      const actionsEnd = [{ type: 'ADD' as const, letter: 'S', position: 3 }];
      const scoreEnd = scoreTurn('CAT', 'CATS', actionsEnd);
      expect(scoreEnd).toBe(1);
      
      // Adding letter in middle  
      const actionsMiddle = [{ type: 'ADD' as const, letter: 'O', position: 1 }];
      const scoreMiddle = scoreTurn('CAT', 'COAT', actionsMiddle);
      expect(scoreMiddle).toBe(1);
      
      // Adding letter at start
      const actionsStart = [{ type: 'ADD' as const, letter: 'S', position: 0 }];
      const scoreStart = scoreTurn('CAT', 'SCAT', actionsStart);
      expect(scoreStart).toBe(1);
      
      console.log('✅ Add Letter End: scoreTurn("CAT", "CATS", [ADD S]) =', scoreEnd);
      console.log('✅ Add Letter Middle: scoreTurn("CAT", "COAT", [ADD O]) =', scoreMiddle);
      console.log('✅ Add Letter Start: scoreTurn("CAT", "SCAT", [ADD S]) =', scoreStart);
    });

    it('should implement +1 point for removing a letter (any position)', () => {
      // Removing letter from end
      const actionsEnd = [{ type: 'REMOVE' as const, letter: 'T', position: 2 }];
      const scoreEnd = scoreTurn('CAT', 'CA', actionsEnd);
      expect(scoreEnd).toBe(1);
      
      // Removing letter from middle
      const actionsMiddle = [{ type: 'REMOVE' as const, letter: 'A', position: 1 }];
      const scoreMiddle = scoreTurn('CAT', 'CT', actionsMiddle);
      expect(scoreMiddle).toBe(1);
      
      // Removing letter from start
      const actionsStart = [{ type: 'REMOVE' as const, letter: 'C', position: 0 }];
      const scoreStart = scoreTurn('CAT', 'AT', actionsStart);
      expect(scoreStart).toBe(1);
      
      console.log('✅ Remove Letter End: scoreTurn("CAT", "CA", [REMOVE T]) =', scoreEnd);
      console.log('✅ Remove Letter Middle: scoreTurn("CAT", "CT", [REMOVE A]) =', scoreMiddle);
      console.log('✅ Remove Letter Start: scoreTurn("CAT", "AT", [REMOVE C]) =', scoreStart);
    });

    it('should implement +1 point for rearranging letters to form a new word', () => {
      // Single rearrangement
      const actionsSingle = [{ type: 'REARRANGE' as const, letter: 'S', position: 3 }];
      const scoreSingle = scoreTurn('SHOP', 'HOPS', actionsSingle);
      expect(scoreSingle).toBe(1);
      
      // Multiple rearrangements
      const actionsMultiple = [
        { type: 'REARRANGE' as const, letter: 'S', position: 3 },
        { type: 'REARRANGE' as const, letter: 'H', position: 0 }
      ];
      const scoreMultiple = scoreTurn('SHOP', 'OPSH', actionsMultiple);
      expect(scoreMultiple).toBe(2);
      
      console.log('✅ Single Rearrange: scoreTurn("SHOP", "HOPS", [REARRANGE]) =', scoreSingle);
      console.log('✅ Multiple Rearrange: scoreTurn("SHOP", "OPSH", [2x REARRANGE]) =', scoreMultiple);
    });

    it('should implement +1 point for using the key letter (must be new letter)', () => {
      // Key letter with addition
      const actionsAdd = [{ type: 'ADD' as const, letter: 'S', position: 3 }];
      const scoreAdd = scoreTurn('CAT', 'CATS', actionsAdd, 'S');
      expect(scoreAdd).toBe(2); // +1 for add, +1 for key letter
      
      // Key letter with different action
      const actionsKey = [{ type: 'ADD' as const, letter: 'E', position: 3 }];
      const scoreKey = scoreTurn('CAT', 'CATE', actionsKey, 'E');
      expect(scoreKey).toBe(2); // +1 for add, +1 for key letter
      
      console.log('✅ Key Letter S: scoreTurn("CAT", "CATS", [ADD S], "S") =', scoreAdd);
      console.log('✅ Key Letter E: scoreTurn("CAT", "CATE", [ADD E], "E") =', scoreKey);
    });
  });

  describe('Comprehensive Test Suite Coverage (Task 1.2 Requirements)', () => {
    it('should handle letter addition/removal at different positions', () => {
      // Complex transformation: SHIP → SHOP
      const actions = [
        { type: 'REMOVE' as const, letter: 'I', position: 2 },
        { type: 'ADD' as const, letter: 'O', position: 2 }
      ];
      const score = scoreTurn('SHIP', 'SHOP', actions);
      expect(score).toBe(2); // +1 for remove, +1 for add
      
      console.log('✅ Position Changes: scoreTurn("SHIP", "SHOP", [REMOVE I, ADD O]) =', score);
    });

    it('should handle letter rearrangement scenarios', () => {
      // Rearrangement with other actions
      const actions = [
        { type: 'REMOVE' as const, letter: 'I', position: 2 },
        { type: 'ADD' as const, letter: 'O', position: 2 },
        { type: 'REARRANGE' as const, letter: 'S', position: 3 }
      ];
      const score = scoreTurn('SHIP', 'HOPS', actions);
      expect(score).toBe(3); // +1 for remove, +1 for add, +1 for rearrange
      
      console.log('✅ Rearrangement Complex: scoreTurn("SHIP", "HOPS", [REMOVE, ADD, REARRANGE]) =', score);
    });

    it('should handle key letter bonus with various actions', () => {
      // Key letter with remove and add
      const actions = [
        { type: 'REMOVE' as const, letter: 'C', position: 0 },
        { type: 'ADD' as const, letter: 'B', position: 0 }
      ];
      const score = scoreTurn('CAT', 'BAT', actions, 'B');
      expect(score).toBe(3); // +1 for remove, +1 for add, +1 for key letter
      
      console.log('✅ Key Letter Complex: scoreTurn("CAT", "BAT", [REMOVE C, ADD B], "B") =', score);
    });

    it('should handle multiple action combinations', () => {
      // Multiple actions with key letter
      const actions = [
        { type: 'REMOVE' as const, letter: 'I', position: 2 },
        { type: 'ADD' as const, letter: 'O', position: 2 },
        { type: 'ADD' as const, letter: 'S', position: 4 }
      ];
      const score = scoreTurn('SHIP', 'SHOPS', actions, 'S');
      expect(score).toBe(4); // +1 for remove, +1 for add O, +1 for add S, +1 for key letter S
      
      console.log('✅ Multiple Actions: scoreTurn("SHIP", "SHOPS", [REMOVE I, ADD O, ADD S], "S") =', score);
    });
  });

  describe('Task 1.2 Examples Verification', () => {
    it('should verify example: "CAT" → "CATS" (+1 for adding S)', () => {
      const actions = [{ type: 'ADD' as const, letter: 'S', position: 3 }];
      const score = scoreTurn('CAT', 'CATS', actions);
      expect(score).toBe(1);
      
      console.log('✅ Example 1: "CAT" → "CATS" =', score, 'points');
    });

    it('should verify example: "CAT" → "COAT" (+1 for adding O)', () => {
      const actions = [{ type: 'ADD' as const, letter: 'O', position: 1 }];
      const score = scoreTurn('CAT', 'COAT', actions);
      expect(score).toBe(1);
      
      console.log('✅ Example 2: "CAT" → "COAT" =', score, 'points');
    });

    it('should verify example: "CAT" → "BAT" with key B (+3 points)', () => {
      const actions = [
        { type: 'REMOVE' as const, letter: 'C', position: 0 },
        { type: 'ADD' as const, letter: 'B', position: 0 }
      ];
      const score = scoreTurn('CAT', 'BAT', actions, 'B');
      expect(score).toBe(3); // +1 for removing C, +1 for adding B, +1 for key letter B
      
      console.log('✅ Example 3: "CAT" → "BAT" with key "B" =', score, 'points');
    });

    it('should verify example: "CAT" → "TACE" with key E (+3 points)', () => {
      const actions = [
        { type: 'REARRANGE' as const, letter: 'T', position: 0 },
        { type: 'ADD' as const, letter: 'E', position: 3 }
      ];
      const score = scoreTurn('CAT', 'TACE', actions, 'E');
      expect(score).toBe(3); // +1 for rearranging, +1 for adding E, +1 for key letter E
      
      console.log('✅ Example 4: "CAT" → "TACE" with key "E" =', score, 'points');
    });
  });

  describe('Task 1.2 Performance and Edge Cases', () => {
    it('should handle empty actions array', () => {
      const score = scoreTurn('CAT', 'CAT', []);
      expect(score).toBe(0);
      
      console.log('✅ No Actions: scoreTurn("CAT", "CAT", []) =', score);
    });

    it('should handle key letter without using it', () => {
      const actions = [{ type: 'ADD' as const, letter: 'S', position: 3 }];
      const score = scoreTurn('CAT', 'CATS', actions, 'Z');
      expect(score).toBe(1); // Only +1 for add, no key letter bonus
      
      console.log('✅ Unused Key Letter: scoreTurn("CAT", "CATS", [ADD S], "Z") =', score);
    });

    it('should perform efficiently with complex scenarios', () => {
      const startTime = Date.now();
      
      // Run 1000 scoring calculations
      for (let i = 0; i < 1000; i++) {
        const actions = [
          { type: 'REMOVE' as const, letter: 'I', position: 2 },
          { type: 'ADD' as const, letter: 'O', position: 2 },
          { type: 'REARRANGE' as const, letter: 'S', position: 3 }
        ];
        scoreTurn('SHIP', 'HOPS', actions, 'S');
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete 1000 calculations in under 50ms
      
      console.log('✅ Performance: 1000 score calculations completed in', duration, 'ms');
    });
  });
}); 