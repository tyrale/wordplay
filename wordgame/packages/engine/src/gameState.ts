// If you have not already, run: npm install zustand
import { createStore } from 'zustand/vanilla';

// Types for state
export interface GameState {
  word: string;
  keyLetters: string[];
  lockedLetters: string[];
  setWord: (word: string) => void;
  addKeyLetter: (letter: string) => void;
  removeKeyLetter: (letter: string) => void;
  addLockedLetter: (letter: string) => void;
  removeLockedLetter: (letter: string) => void;
  moveLetter: (from: number, to: number) => void;
  reset: (initialWord: string, keyLetters?: string[], lockedLetters?: string[]) => void;
}

export const useGameState = createStore<GameState>((set: (fn: (state: GameState) => Partial<GameState> | GameState) => void, get: () => GameState) => ({
  word: '',
  keyLetters: [],
  lockedLetters: [],
  setWord: (word: string) => set(() => ({ word })),
  addKeyLetter: (letter: string) => set((state) => ({ keyLetters: [...state.keyLetters, letter] })),
  removeKeyLetter: (letter: string) => set((state) => ({ keyLetters: state.keyLetters.filter((l: string) => l !== letter) })),
  addLockedLetter: (letter: string) => set((state) => ({ lockedLetters: [...state.lockedLetters, letter] })),
  removeLockedLetter: (letter: string) => set((state) => ({ lockedLetters: state.lockedLetters.filter((l: string) => l !== letter) })),
  moveLetter: (from: number, to: number) => set((state) => {
    const arr = state.word.split('');
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    return { word: arr.join('') };
  }),
  reset: (initialWord: string, keyLetters: string[] = [], lockedLetters: string[] = []) => set(() => ({ word: initialWord, keyLetters, lockedLetters })),
})); 