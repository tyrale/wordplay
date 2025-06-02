import { useGameState, GameState } from './gameState';

describe('Task 1.4 Verification: Local GameState Reducer', () => {
  
  // Helper to reset Zustand state between tests
  const resetStore = () => {
    useGameState.getState().reset('TEST', [], []);
  };

  beforeEach(() => {
    resetStore();
  });

  describe('Core GameState Requirements (Task 1.4)', () => {
    it('should implement Zustand slice for game state management', () => {
      // Verify that the store exists and has the correct structure
      const state = useGameState.getState();
      
      expect(state).toBeDefined();
      expect(typeof state.word).toBe('string');
      expect(Array.isArray(state.keyLetters)).toBe(true);
      expect(Array.isArray(state.lockedLetters)).toBe(true);
      
      // Verify all required methods exist
      expect(typeof state.setWord).toBe('function');
      expect(typeof state.addKeyLetter).toBe('function');
      expect(typeof state.removeKeyLetter).toBe('function');
      expect(typeof state.addLockedLetter).toBe('function');
      expect(typeof state.removeLockedLetter).toBe('function');
      expect(typeof state.moveLetter).toBe('function');
      expect(typeof state.reset).toBe('function');
      
      console.log('✅ Zustand Store Structure:', {
        word: typeof state.word,
        keyLetters: typeof state.keyLetters,
        lockedLetters: typeof state.lockedLetters,
        methods: Object.keys(state).filter(key => typeof state[key as keyof GameState] === 'function')
      });
    });

    it('should manage current word state correctly', () => {
      const initialWord = useGameState.getState().word;
      expect(initialWord).toBe('TEST'); // From beforeEach reset
      
      // Test setting different words
      useGameState.getState().setWord('HELLO');
      expect(useGameState.getState().word).toBe('HELLO');
      
      useGameState.getState().setWord('WORLD');
      expect(useGameState.getState().word).toBe('WORLD');
      
      useGameState.getState().setWord('');
      expect(useGameState.getState().word).toBe('');
      
      console.log('✅ Word State Management:');
      console.log('   - Initial word: "TEST"');
      console.log('   - Set "HELLO": ✅');
      console.log('   - Set "WORLD": ✅');
      console.log('   - Set empty string: ✅');
    });

    it('should manage key letters array correctly', () => {
      const initialKeyLetters = useGameState.getState().keyLetters;
      expect(initialKeyLetters).toEqual([]);
      
      // Test adding key letters
      useGameState.getState().addKeyLetter('A');
      expect(useGameState.getState().keyLetters).toEqual(['A']);
      
      useGameState.getState().addKeyLetter('B');
      expect(useGameState.getState().keyLetters).toEqual(['A', 'B']);
      
      useGameState.getState().addKeyLetter('C');
      expect(useGameState.getState().keyLetters).toEqual(['A', 'B', 'C']);
      
      // Test removing key letters
      useGameState.getState().removeKeyLetter('B');
      expect(useGameState.getState().keyLetters).toEqual(['A', 'C']);
      
      useGameState.getState().removeKeyLetter('A');
      expect(useGameState.getState().keyLetters).toEqual(['C']);
      
      useGameState.getState().removeKeyLetter('C');
      expect(useGameState.getState().keyLetters).toEqual([]);
      
      console.log('✅ Key Letters Management:');
      console.log('   - Add A, B, C: ["A", "B", "C"] ✅');
      console.log('   - Remove B: ["A", "C"] ✅');
      console.log('   - Remove A: ["C"] ✅');
      console.log('   - Remove C: [] ✅');
    });

    it('should manage locked letters array correctly', () => {
      const initialLockedLetters = useGameState.getState().lockedLetters;
      expect(initialLockedLetters).toEqual([]);
      
      // Test adding locked letters
      useGameState.getState().addLockedLetter('X');
      expect(useGameState.getState().lockedLetters).toEqual(['X']);
      
      useGameState.getState().addLockedLetter('Y');
      expect(useGameState.getState().lockedLetters).toEqual(['X', 'Y']);
      
      useGameState.getState().addLockedLetter('Z');
      expect(useGameState.getState().lockedLetters).toEqual(['X', 'Y', 'Z']);
      
      // Test removing locked letters
      useGameState.getState().removeLockedLetter('Y');
      expect(useGameState.getState().lockedLetters).toEqual(['X', 'Z']);
      
      useGameState.getState().removeLockedLetter('X');
      expect(useGameState.getState().lockedLetters).toEqual(['Z']);
      
      useGameState.getState().removeLockedLetter('Z');
      expect(useGameState.getState().lockedLetters).toEqual([]);
      
      console.log('✅ Locked Letters Management:');
      console.log('   - Add X, Y, Z: ["X", "Y", "Z"] ✅');
      console.log('   - Remove Y: ["X", "Z"] ✅');
      console.log('   - Remove X: ["Z"] ✅');
      console.log('   - Remove Z: [] ✅');
    });
  });

  describe('Letter Movement System (Task 1.4)', () => {
    it('should handle letter movement within words correctly', () => {
      // Set up a test word
      useGameState.getState().setWord('WORD');
      expect(useGameState.getState().word).toBe('WORD');
      
      // Test moving first letter to end: WORD -> ORDW
      useGameState.getState().moveLetter(0, 3);
      expect(useGameState.getState().word).toBe('ORDW');
      
      // Test moving last letter to start: ORDW -> WORD (back to original)
      useGameState.getState().moveLetter(3, 0);
      expect(useGameState.getState().word).toBe('WORD');
      
      // Test moving middle letters: WORD -> WROD
      useGameState.getState().moveLetter(1, 2);
      expect(useGameState.getState().word).toBe('WROD');
      
      // Test moving letter to same position (should not change)
      useGameState.getState().moveLetter(1, 1);
      expect(useGameState.getState().word).toBe('WROD');
      
      console.log('✅ Letter Movement System:');
      console.log('   - WORD -> ORDW (move first to end): ✅');
      console.log('   - ORDW -> WORD (move last to start): ✅');
      console.log('   - WORD -> WROD (move middle): ✅');
      console.log('   - Same position move: No change ✅');
    });

    it('should handle complex letter rearrangements', () => {
      // Test with a longer word
      useGameState.getState().setWord('SHIP');
      
      // Multiple moves to create anagram: SHIP -> HIPS
      useGameState.getState().moveLetter(0, 1); // SHIP -> HSIP
      expect(useGameState.getState().word).toBe('HSIP');
      
      useGameState.getState().moveLetter(2, 0); // HSIP -> IHSP
      expect(useGameState.getState().word).toBe('IHSP');
      
      useGameState.getState().moveLetter(1, 0); // IHSP -> HISP
      expect(useGameState.getState().word).toBe('HISP');
      
      useGameState.getState().moveLetter(3, 2); // HISP -> HIPS
      expect(useGameState.getState().word).toBe('HIPS');
      
      console.log('✅ Complex Rearrangements:');
      console.log('   - SHIP -> HSIP -> IHSP -> HISP -> HIPS: ✅');
    });

    it('should handle edge cases in letter movement', () => {
      // Test with single letter
      useGameState.getState().setWord('A');
      useGameState.getState().moveLetter(0, 0);
      expect(useGameState.getState().word).toBe('A');
      
      // Test with two letters
      useGameState.getState().setWord('AB');
      useGameState.getState().moveLetter(0, 1); // AB -> BA
      expect(useGameState.getState().word).toBe('BA');
      
      useGameState.getState().moveLetter(1, 0); // BA -> AB
      expect(useGameState.getState().word).toBe('AB');
      
      console.log('✅ Edge Cases:');
      console.log('   - Single letter: No change ✅');
      console.log('   - Two letters: AB <-> BA ✅');
    });
  });

  describe('Reset Functionality (Task 1.4)', () => {
    it('should reset state with new initial values', () => {
      // Set up some state
      useGameState.getState().setWord('CURRENT');
      useGameState.getState().addKeyLetter('K');
      useGameState.getState().addKeyLetter('E');
      useGameState.getState().addLockedLetter('L');
      useGameState.getState().addLockedLetter('O');
      
      // Verify state is set
      expect(useGameState.getState().word).toBe('CURRENT');
      expect(useGameState.getState().keyLetters).toEqual(['K', 'E']);
      expect(useGameState.getState().lockedLetters).toEqual(['L', 'O']);
      
      // Reset with new values
      useGameState.getState().reset('NEWWORD', ['A', 'B'], ['X', 'Y', 'Z']);
      
      // Verify reset worked
      expect(useGameState.getState().word).toBe('NEWWORD');
      expect(useGameState.getState().keyLetters).toEqual(['A', 'B']);
      expect(useGameState.getState().lockedLetters).toEqual(['X', 'Y', 'Z']);
      
      console.log('✅ Reset Functionality:');
      console.log('   - Before reset: word="CURRENT", key=["K","E"], locked=["L","O"]');
      console.log('   - After reset: word="NEWWORD", key=["A","B"], locked=["X","Y","Z"] ✅');
    });

    it('should reset with default empty arrays', () => {
      // Set up some state
      useGameState.getState().setWord('BEFORE');
      useGameState.getState().addKeyLetter('K');
      useGameState.getState().addLockedLetter('L');
      
      // Reset with only word (should default empty arrays)
      useGameState.getState().reset('AFTER');
      
      expect(useGameState.getState().word).toBe('AFTER');
      expect(useGameState.getState().keyLetters).toEqual([]);
      expect(useGameState.getState().lockedLetters).toEqual([]);
      
      console.log('✅ Reset with Defaults:');
      console.log('   - Reset with only word: arrays defaulted to empty ✅');
    });
  });

  describe('State Persistence and Reactivity (Task 1.4)', () => {
    it('should maintain state across multiple operations', () => {
      // Perform a sequence of operations
      useGameState.getState().setWord('CAT');
      useGameState.getState().addKeyLetter('S');
      useGameState.getState().addLockedLetter('C');
      
      // Verify initial state
      expect(useGameState.getState().word).toBe('CAT');
      expect(useGameState.getState().keyLetters).toEqual(['S']);
      expect(useGameState.getState().lockedLetters).toEqual(['C']);
      
      // Modify word while keeping letters
      useGameState.getState().setWord('CATS');
      expect(useGameState.getState().word).toBe('CATS');
      expect(useGameState.getState().keyLetters).toEqual(['S']); // Should still be there
      expect(useGameState.getState().lockedLetters).toEqual(['C']); // Should still be there
      
      // Add more letters
      useGameState.getState().addKeyLetter('T');
      useGameState.getState().addLockedLetter('A');
      
      expect(useGameState.getState().keyLetters).toEqual(['S', 'T']);
      expect(useGameState.getState().lockedLetters).toEqual(['C', 'A']);
      
      console.log('✅ State Persistence:');
      console.log('   - Multiple operations maintain consistency ✅');
      console.log('   - Final state: word="CATS", key=["S","T"], locked=["C","A"] ✅');
    });

    it('should handle rapid state changes efficiently', () => {
      const startTime = performance.now();
      
      // Perform many rapid operations
      for (let i = 0; i < 100; i++) {
        useGameState.getState().setWord(`WORD${i}`);
        useGameState.getState().addKeyLetter(String.fromCharCode(65 + (i % 26)));
        useGameState.getState().addLockedLetter(String.fromCharCode(97 + (i % 26)));
        
        if (i > 50) {
          useGameState.getState().removeKeyLetter(String.fromCharCode(65 + ((i - 50) % 26)));
          useGameState.getState().removeLockedLetter(String.fromCharCode(97 + ((i - 50) % 26)));
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be fast (under 50ms for 100 operations)
      expect(duration).toBeLessThan(50);
      
      // Verify final state makes sense
      const finalState = useGameState.getState();
      expect(finalState.word).toBe('WORD99');
      expect(finalState.keyLetters.length).toBeGreaterThan(0);
      expect(finalState.lockedLetters.length).toBeGreaterThan(0);
      
      console.log('✅ Performance Test:');
      console.log(`   - 100 rapid operations completed in ${duration.toFixed(2)}ms ✅`);
      console.log('   - Target: <50ms ✅');
      console.log('   - Final word:', finalState.word);
      console.log('   - Final key letters count:', finalState.keyLetters.length);
      console.log('   - Final locked letters count:', finalState.lockedLetters.length);
    });
  });

  describe('Game Integration Scenarios (Task 1.4)', () => {
    it('should support typical game flow scenarios', () => {
      // Scenario 1: Start new game
      useGameState.getState().reset('START', [], []);
      expect(useGameState.getState().word).toBe('START');
      
      // Scenario 2: Player makes a move (rearrange letters)
      useGameState.getState().moveLetter(0, 4); // START -> TARTS
      expect(useGameState.getState().word).toBe('TARTS');
      
      // Scenario 3: Set key letter for this turn
      useGameState.getState().addKeyLetter('E');
      expect(useGameState.getState().keyLetters).toEqual(['E']);
      
      // Scenario 4: Lock some letters
      useGameState.getState().addLockedLetter('T');
      useGameState.getState().addLockedLetter('A');
      expect(useGameState.getState().lockedLetters).toEqual(['T', 'A']);
      
      // Scenario 5: Update word after turn
      useGameState.getState().setWord('STARE');
      expect(useGameState.getState().word).toBe('STARE');
      
      // Scenario 6: Clear key letter after turn
      useGameState.getState().removeKeyLetter('E');
      expect(useGameState.getState().keyLetters).toEqual([]);
      
      console.log('✅ Game Flow Scenario:');
      console.log('   - New game: START ✅');
      console.log('   - Rearrange: START -> TARTS ✅');
      console.log('   - Set key: E ✅');
      console.log('   - Lock letters: T, A ✅');
      console.log('   - Update word: STARE ✅');
      console.log('   - Clear key: [] ✅');
    });

    it('should handle multi-player game state', () => {
      // Each player could have their own restrictions
      useGameState.getState().reset('SHARED');
      
      // Player 1's turn - add their key and locked letters
      useGameState.getState().addKeyLetter('P1KEY');
      useGameState.getState().addLockedLetter('P1LOCK');
      
      // Word changes during play
      useGameState.getState().setWord('WORD1');
      
      // Player 2's turn - different key/locked letters
      useGameState.getState().removeKeyLetter('P1KEY');
      useGameState.getState().addKeyLetter('P2KEY');
      useGameState.getState().addLockedLetter('P2LOCK');
      
      expect(useGameState.getState().keyLetters).toEqual(['P2KEY']);
      expect(useGameState.getState().lockedLetters).toEqual(['P1LOCK', 'P2LOCK']);
      
      console.log('✅ Multi-Player Support:');
      console.log('   - Player transitions working ✅');
      console.log('   - Independent key/locked letter management ✅');
    });
  });
}); 