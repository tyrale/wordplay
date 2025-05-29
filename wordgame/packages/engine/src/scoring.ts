/**
 * Scoring Module
 * 
 * Basic scoring rules:
 * - +1 point for adding a letter
 * - +1 point for removing a letter
 * - +1 point for rearranging letters to form a new word
 * - +1 point for using the key letter
 * 
 * Examples:
 * 1. From "SHIP" to "SHOP":
 *    - Remove 'I' (+1)
 *    - Add 'O' (+1)
 *    Total: 2 points
 * 
 * 2. From "SHOP" to "HOPS":
 *    - Rearrange letters to form new word (+1)
 *    Total: 1 point
 * 
 * 3. From "SHIP" to "SHOPS" using key letter 'S':
 *    - Remove 'I' (+1)
 *    - Add 'O' (+1)
 *    - Add 'S' (+1)
 *    - Using key letter 'S' (+1)
 *    Total: 4 points
 */

export interface TurnAction {
  type: 'ADD' | 'REMOVE' | 'REARRANGE';
  letter: string;
  position: number;
}

/**
 * Calculates the score for a turn
 * @param prevWord The previous word played
 * @param newWord The new word being played
 * @param actions List of actions taken to form the word
 * @param keyLetter The key letter used (if any)
 * @returns The score for this turn
 */
export function scoreTurn(
  prevWord: string,
  newWord: string,
  actions: TurnAction[],
  keyLetter?: string
): number {
  let score = 0;

  // Count points for each action
  for (const action of actions) {
    switch (action.type) {
      case 'ADD':
      case 'REMOVE':
      case 'REARRANGE':
        score += 1;
        break;
    }
  }

  // Bonus point for using key letter
  if (keyLetter && newWord.includes(keyLetter)) {
    score += 1;
  }

  return score;
} 