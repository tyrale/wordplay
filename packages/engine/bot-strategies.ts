/**
 * Bot Strategy System
 * 
 * Defines different AI strategies for various bot personalities in the WordPlay game.
 * Each strategy specifies point limits and key letter behavior to create distinct
 * gameplay experiences.
 */

import type { BotMove } from './interfaces';

export interface BotStrategy {
  id: string;
  displayName: string;
  maxPoints: number;
  minPoints?: number;
  keyLetterBehavior: 'ignore' | 'avoid' | 'allow' | 'prioritize';
  description: string;
}

/**
 * All available bot strategies
 */
export const BOT_STRATEGIES: Record<string, BotStrategy> = {
  'trainer-bot': {
    id: 'trainer-bot',
    displayName: 'trainerbot',
    maxPoints: 2,
    keyLetterBehavior: 'ignore',
    description: 'Plays 1-2 point moves, completely ignores key letters'
  },
  'easy-bot': {
    id: 'easy-bot', 
    displayName: 'easybot',
    maxPoints: 2,
    keyLetterBehavior: 'avoid',
    description: 'Plays 1-2 point moves, never uses key letters'
  },
  'medium-bot': {
    id: 'medium-bot',
    displayName: 'mediumbot', 
    maxPoints: 3,
    keyLetterBehavior: 'allow',
    description: 'Plays 1-3 point moves, can use key letters'
  },
  'hard-bot': {
    id: 'hard-bot',
    displayName: 'hardbot',
    maxPoints: 4, 
    keyLetterBehavior: 'allow',
    description: 'Plays 1-4 point moves, can use key letters'
  },
  'boss-bot': {
    id: 'boss-bot',
    displayName: 'bossbot',
    minPoints: 3,
    maxPoints: 4,
    keyLetterBehavior: 'prioritize', 
    description: 'Plays 3-4 point moves, prioritizes key letter usage'
  }
};

/**
 * Get strategy for a bot ID, fallback to trainer-bot if not found
 */
export function getBotStrategy(botId: string): BotStrategy {
  return BOT_STRATEGIES[botId] || BOT_STRATEGIES['trainer-bot'];
}

/**
 * Filter bot moves based on strategy rules
 */
export function filterCandidatesByStrategy(
  candidates: BotMove[],
  strategy: BotStrategy,
  keyLetters: string[] = []
): BotMove[] {
  let filtered = [...candidates];
  
  // Filter by point limits
  filtered = filtered.filter(move => {
    const score = move.score;
    const meetsMin = !strategy.minPoints || score >= strategy.minPoints;
    const meetsMax = score <= strategy.maxPoints;
    return meetsMin && meetsMax;
  });
  
  // Apply key letter behavior
  switch (strategy.keyLetterBehavior) {
    case 'ignore':
      // Don't filter based on key letters at all - use original scoring without key letter bonus
      break;
      
    case 'avoid':
      // Filter out moves that use key letters
      filtered = filtered.filter(move => {
        return !usesKeyLetters(move, keyLetters);
      });
      break;
      
    case 'allow':
      // No additional filtering - allow key letter moves
      break;
      
    case 'prioritize':
      // Sort key letter moves to the top, but don't exclude non-key-letter moves
      filtered = filtered.sort((a, b) => {
        const aUsesKey = usesKeyLetters(a, keyLetters);
        const bUsesKey = usesKeyLetters(b, keyLetters);
        
        if (aUsesKey && !bUsesKey) return -1; // a comes first
        if (!aUsesKey && bUsesKey) return 1;  // b comes first
        return b.score - a.score; // Both same key letter status, sort by score
      });
      break;
  }
  
  return filtered;
}

/**
 * Check if a move uses any key letters
 */
function usesKeyLetters(move: BotMove, keyLetters: string[]): boolean {
  if (!keyLetters.length) return false;
  
  // Check if the move's reasoning mentions key letter usage
  return move.reasoning.some(reason => 
    reason.toLowerCase().includes('used key letter') || 
    reason.toLowerCase().includes('key letter')
  );
}

/**
 * Calculate score for a move ignoring key letters (for trainer-bot)
 */
export function calculateScoreIgnoringKeyLetters(
  originalScore: number,
  move: BotMove,
  keyLetters: string[]
): number {
  if (!keyLetters.length) return originalScore;
  
  // If this move used key letters, subtract the key letter bonus
  if (usesKeyLetters(move, keyLetters)) {
    return Math.max(1, originalScore - 1); // Ensure minimum score of 1
  }
  
  return originalScore;
}

/**
 * Apply strategy-specific scoring adjustments to moves
 */
export function applyStrategyScoring(
  moves: BotMove[],
  strategy: BotStrategy,
  keyLetters: string[]
): BotMove[] {
  return moves.map(move => {
    let adjustedScore = move.score;
    
    // For trainer-bot, ignore key letter bonuses in scoring
    if (strategy.keyLetterBehavior === 'ignore') {
      adjustedScore = calculateScoreIgnoringKeyLetters(move.score, move, keyLetters);
    }
    
    return {
      ...move,
      score: adjustedScore
    };
  });
} 