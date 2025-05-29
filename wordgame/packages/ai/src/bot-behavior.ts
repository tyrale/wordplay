// Greedy Bot AI v0
// Chooses the highest scoring legal move

import { scoreTurn, TurnAction } from '@wordgame/engine/src/scoring';
import { validateWord } from '@wordgame/engine/src/dictionary';

export interface BotMove {
  word: string;
  actions: TurnAction[];
  score: number;
}

/**
 * Given the current word and key letter, returns the best move (highest score)
 */
export function chooseBestMove(currentWord: string, keyLetter: string): BotMove {
  // TODO: Implement greedy search for all legal moves
  // For now, return a placeholder
  return {
    word: currentWord,
    actions: [],
    score: 0,
  };
} 