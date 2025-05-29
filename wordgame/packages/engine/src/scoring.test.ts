import { scoreTurn, TurnAction } from './scoring';

describe('Scoring Module', () => {
  describe('scoreTurn', () => {
    it('should score letter addition and removal', () => {
      const actions: TurnAction[] = [
        { type: 'REMOVE', letter: 'I', position: 2 },
        { type: 'ADD', letter: 'O', position: 2 }
      ];
      expect(scoreTurn('SHIP', 'SHOP', actions))
        .toBe(2); // +1 for removing 'I', +1 for adding 'O'
    });

    it('should score letter rearrangement', () => {
      const actions: TurnAction[] = [
        { type: 'REARRANGE', letter: 'S', position: 3 }
      ];
      expect(scoreTurn('SHOP', 'HOPS', actions))
        .toBe(1); // +1 for rearranging letters
    });

    it('should score multiple actions with key letter', () => {
      const actions: TurnAction[] = [
        { type: 'REMOVE', letter: 'I', position: 2 },
        { type: 'ADD', letter: 'O', position: 2 },
        { type: 'ADD', letter: 'S', position: 4 }
      ];
      expect(scoreTurn('SHIP', 'SHOPS', actions, 'S'))
        .toBe(4); // +1 for removing 'I', +1 for adding 'O', +1 for adding 'S', +1 for using key letter
    });

    it('should score complex word transformation', () => {
      const actions: TurnAction[] = [
        { type: 'REMOVE', letter: 'I', position: 2 },
        { type: 'ADD', letter: 'O', position: 2 },
        { type: 'REARRANGE', letter: 'S', position: 3 }
      ];
      expect(scoreTurn('SHIP', 'HOPS', actions))
        .toBe(3); // +1 for removing 'I', +1 for adding 'O', +1 for rearranging
    });

    it('should score multiple rearrangements', () => {
      const actions: TurnAction[] = [
        { type: 'REARRANGE', letter: 'S', position: 3 },
        { type: 'REARRANGE', letter: 'H', position: 0 }
      ];
      expect(scoreTurn('SHOP', 'OPSH', actions))
        .toBe(2); // +1 for each rearrangement
    });

    it('should score letter addition at end', () => {
      const actions: TurnAction[] = [
        { type: 'ADD', letter: 'S', position: 3 }
      ];
      expect(scoreTurn('CAT', 'CATS', actions))
        .toBe(1); // +1 for adding 'S' at the end
    });

    it('should score letter addition in middle', () => {
      const actions: TurnAction[] = [
        { type: 'ADD', letter: 'O', position: 1 }
      ];
      expect(scoreTurn('CAT', 'COAT', actions))
        .toBe(1); // +1 for adding 'O' in the middle
    });

    it('should score letter addition at start', () => {
      const actions: TurnAction[] = [
        { type: 'ADD', letter: 'S', position: 0 }
      ];
      expect(scoreTurn('CAT', 'SCAT', actions))
        .toBe(1); // +1 for adding 'S' at the start
    });

    it('should score letter removal from end', () => {
      const actions: TurnAction[] = [
        { type: 'REMOVE', letter: 'T', position: 2 }
      ];
      expect(scoreTurn('CAT', 'CA', actions))
        .toBe(1); // +1 for removing 'T' from the end
    });

    it('should score letter removal from middle', () => {
      const actions: TurnAction[] = [
        { type: 'REMOVE', letter: 'A', position: 1 }
      ];
      expect(scoreTurn('CAT', 'CT', actions))
        .toBe(1); // +1 for removing 'A' from the middle
    });

    it('should score letter removal from start', () => {
      const actions: TurnAction[] = [
        { type: 'REMOVE', letter: 'C', position: 0 }
      ];
      expect(scoreTurn('CAT', 'AT', actions))
        .toBe(1); // +1 for removing 'C' from the start
    });

    it('should score letter addition with key letter bonus', () => {
      const actions: TurnAction[] = [
        { type: 'ADD', letter: 'S', position: 3 }
      ];
      expect(scoreTurn('CAT', 'CATS', actions, 'S'))
        .toBe(2); // +1 for adding 'S', +1 for using key letter (bonus)
    });

    it('should score letter addition with different key letter', () => {
      const actions: TurnAction[] = [
        { type: 'ADD', letter: 'E', position: 3 }
      ];
      expect(scoreTurn('CAT', 'CATE', actions, 'E'))
        .toBe(2); // +1 for adding 'E', +1 for using key letter (bonus)
    });

    it('should score letter removal with key letter bonus', () => {
      const actions: TurnAction[] = [
        { type: 'REMOVE', letter: 'C', position: 0 },
        { type: 'ADD', letter: 'B', position: 0 }
      ];
      expect(scoreTurn('CAT', 'BAT', actions, 'B'))
        .toBe(3); // +1 for removing 'C', +1 for adding 'B', +1 for using key letter (bonus)
    });

    it('should score letter rearrangement with key letter bonus', () => {
      const actions: TurnAction[] = [
        { type: 'REARRANGE', letter: 'T', position: 0 },
        { type: 'ADD', letter: 'E', position: 3 }
      ];
      expect(scoreTurn('CAT', 'TACE', actions, 'E'))
        .toBe(3); // +1 for rearranging, +1 for adding 'E', +1 for using key letter (bonus)
    });
  });
}); 