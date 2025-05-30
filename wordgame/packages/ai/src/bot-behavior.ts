// Greedy Bot AI v1
// Chooses the highest scoring legal move, prioritizing key letter and powerful moves

import { scoreTurn, TurnAction } from '../../engine/src/scoring';
import { validateWord } from '../../engine/src/dictionary';

export interface BotMove {
  word: string;
  actions: TurnAction[];
  score: number;
}

function getAnagrams(word: string): string[] {
  if (word.length > 7) return []; // avoid combinatorial explosion
  const results: Set<string> = new Set();
  function permute(arr: string[], l: number) {
    if (l === arr.length - 1) {
      results.add(arr.join(''));
      return;
    }
    for (let i = l; i < arr.length; i++) {
      [arr[l], arr[i]] = [arr[i], arr[l]];
      permute(arr, l + 1);
      [arr[l], arr[i]] = [arr[i], arr[l]];
    }
  }
  permute(word.split(''), 0);
  results.delete(word); // don't include original
  return Array.from(results);
}

function generateMoves(currentWord: string, keyLetter: string, requireKey: boolean, moveType?: 'replace' | 'add' | 'remove'): {word: string, actions: TurnAction[]}[] {
  const moves: {word: string, actions: TurnAction[]}[] = [];
  const origHasKey = currentWord.includes(keyLetter);

  // Helper function to add moves if they meet requirements
  const addMoveIfValid = (word: string, actions: TurnAction[]) => {
    if (!requireKey || word.includes(keyLetter)) {
      moves.push({ word, actions });
    }
  };

  // Generate moves based on the specified type
  if (!moveType || moveType === 'replace') {
    // Replace + Rearrange
    for (let i = 0; i < currentWord.length; i++) {
      if (currentWord[i] === keyLetter) continue;
      const replaced = currentWord.slice(0, i) + keyLetter + currentWord.slice(i + 1);
      addMoveIfValid(replaced, [
        { type: 'REMOVE', letter: currentWord[i], position: i },
        { type: 'ADD', letter: keyLetter, position: i }
      ]);
      
      // Add anagrams of the replaced word
      for (const anagram of getAnagrams(replaced)) {
        addMoveIfValid(anagram, [
          { type: 'REMOVE', letter: currentWord[i], position: i },
          { type: 'ADD', letter: keyLetter, position: i },
          { type: 'REARRANGE', letter: anagram[0], position: 0 }
        ]);
      }
    }
  }

  if (!moveType || moveType === 'add') {
    // Add + Rearrange
    for (let i = 0; i <= currentWord.length; i++) {
      const added = currentWord.slice(0, i) + keyLetter + currentWord.slice(i);
      addMoveIfValid(added, [{ type: 'ADD', letter: keyLetter, position: i }]);
      
      // Add anagrams of the added word
      for (const anagram of getAnagrams(added)) {
        addMoveIfValid(anagram, [
          { type: 'ADD', letter: keyLetter, position: i },
          { type: 'REARRANGE', letter: anagram[0], position: 0 }
        ]);
      }
    }
  }

  if (!moveType || moveType === 'remove') {
    // Remove + Rearrange
    for (let i = 0; i < currentWord.length; i++) {
      const removed = currentWord.slice(0, i) + currentWord.slice(i + 1);
      addMoveIfValid(removed, [{ type: 'REMOVE', letter: currentWord[i], position: i }]);
      
      // Add anagrams of the removed word
      for (const anagram of getAnagrams(removed)) {
        addMoveIfValid(anagram, [
          { type: 'REMOVE', letter: currentWord[i], position: i },
          { type: 'REARRANGE', letter: anagram[0], position: 0 }
        ]);
      }
    }
  }

  return moves;
}

function getValidMoves(candidates: {word: string, actions: TurnAction[]}[], currentWord: string, keyLetter: string): BotMove[] {
  const unique = new Map<string, {word: string, actions: TurnAction[]}>();
  for (const c of candidates) {
    unique.set(c.word, c);
    if (unique.size >= 10) break; // Limit to first 10 unique candidates
  }
  const validMoves: BotMove[] = [];
  for (const {word, actions} of unique.values()) {
    if (validateWord(word, currentWord, true)) { // true = bot
      const score = scoreTurn(currentWord, word, actions, keyLetter);
      validMoves.push({ word, actions, score });
    }
  }
  return validMoves;
}

/**
 * Given the current word and key letter, returns the best move (highest score)
 */
export function chooseBestMove(currentWord: string, keyLetter: string): BotMove {
  // Try each move type in order of preference
  const moveTypes: ('replace' | 'add' | 'remove')[] = ['replace', 'add', 'remove'];
  let validMoves: BotMove[] = [];

  // First try with key letter required
  for (const type of moveTypes) {
    const candidates = generateMoves(currentWord, keyLetter, true, type);
    validMoves = getValidMoves(candidates, currentWord, keyLetter);
    if (validMoves.length > 0) break;
  }

  // If no valid moves with key letter, try without requiring it
  if (validMoves.length === 0) {
    for (const type of moveTypes) {
      const candidates = generateMoves(currentWord, keyLetter, false, type);
      validMoves = getValidMoves(candidates, currentWord, keyLetter);
      if (validMoves.length > 0) break;
    }
  }

  // Pick best move
  const best = (arr: BotMove[]) => arr.reduce((a, b) => (b.score > a.score ? b : a), arr[0]);
  let bestMove: BotMove | undefined = undefined;
  if (validMoves.length > 0) {
    bestMove = best(validMoves);
  }

  // If no valid moves, pass
  if (!bestMove) {
  return {
    word: currentWord,
    actions: [],
    score: 0,
  };
} 

  return bestMove;
}

export { generateMoves, scoreTurn };

export type { TurnAction }; 