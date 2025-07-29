/**
 * Bot Registry - Centralized Bot Definitions
 * 
 * Single source of truth for all bot definitions, display names, and metadata.
 * This eliminates duplication across components and ensures consistency.
 */

export interface Bot {
  id: string;
  displayName: string;
  description?: string;
  difficulty?: 'basic' | 'easy' | 'medium' | 'hard' | 'expert';
  theme?: string;
  category?: 'progression' | 'themed' | 'behavior';
}

/**
 * Complete bot registry with all available bots
 * Ordered by unlock progression and theme grouping
 */
export const BOT_REGISTRY: Bot[] = [
  // Default/Starter Bot
  { 
    id: 'trainer-bot', 
    displayName: 'trainerbot', 
    difficulty: 'basic',
    category: 'progression',
    description: 'Trainer bot for new players - ignores key letters'
  },

  // Progression Bots (unlocked by achievements)
  { 
    id: 'easy-bot', 
    displayName: 'easybot', 
    difficulty: 'easy',
    category: 'progression',
    description: 'Unlocked by beating trainer-bot - never uses key letters'
  },
  { 
    id: 'medium-bot', 
    displayName: 'mediumbot', 
    difficulty: 'medium',
    category: 'progression',
    description: 'Unlocked by beating easy bot - plays 1-3 point moves'
  },
  { 
    id: 'hard-bot', 
    displayName: 'hardbot', 
    difficulty: 'hard',
    category: 'progression',
    description: 'Unlocked by beating medium bot - plays 1-4 point moves'
  },
  { 
    id: 'boss-bot', 
    displayName: 'bossbot', 
    difficulty: 'expert',
    category: 'progression',
    description: 'Unlocked by beating hard bot - plays 3-4 point moves, prioritizes key letters'
  },

  // Themed Bots (unlocked by playing specific words)
  { 
    id: 'pirate-bot', 
    displayName: 'piratebot', 
    theme: 'pirate',
    category: 'themed',
    description: 'Unlocked by playing "pirate"'
  },
  { 
    id: 'chaos-bot', 
    displayName: 'chaosbot', 
    theme: 'chaos',
    category: 'themed',
    description: 'Unlocked by playing "chaos"'
  },
  { 
    id: 'puzzle-bot', 
    displayName: 'puzzlebot', 
    theme: 'puzzle',
    category: 'themed',
    description: 'Unlocked by playing "puzzle"'
  },
  { 
    id: 'speed-bot', 
    displayName: 'speedbot', 
    theme: 'speed',
    category: 'themed',
    description: 'Unlocked by playing "speed"'
  },
  { 
    id: 'creative-bot', 
    displayName: 'creativebot', 
    theme: 'creative',
    category: 'themed',
    description: 'Unlocked by playing "creative"'
  },
  { 
    id: 'vowel-bot', 
    displayName: 'vowelbot', 
    theme: 'vowel',
    category: 'themed',
    description: 'Unlocked by playing "vowel"'
  },
  { 
    id: 'rhyme-bot', 
    displayName: 'rhymebot', 
    theme: 'rhyme',
    category: 'themed',
    description: 'Unlocked by playing "rhyme"'
  },

  // Behavior Bots (unlocked by various means)
  { 
    id: 'aggressive-bot', 
    displayName: 'aggressivebot', 
    category: 'behavior',
    description: 'High-risk, high-reward strategies'
  },
  { 
    id: 'defensive-bot', 
    displayName: 'defensivebot', 
    category: 'behavior',
    description: 'Conservative, blocking strategies'
  },
  { 
    id: 'learning-bot', 
    displayName: 'learningbot', 
    category: 'behavior',
    description: 'Adapts strategy based on player behavior'
  },
  { 
    id: 'random-bot', 
    displayName: 'randombot', 
    category: 'behavior',
    description: 'Completely unpredictable moves'
  },
  { 
    id: 'mirror-bot', 
    displayName: 'mirrorbot', 
    category: 'behavior',
    description: 'Mirrors player strategies'
  },
  { 
    id: 'blitz-bot', 
    displayName: 'blitzbot', 
    category: 'behavior',
    description: 'Lightning-fast aggressive play'
  },
  { 
    id: 'zen-bot', 
    displayName: 'zenbot', 
    category: 'behavior',
    description: 'Calm, methodical strategies'
  },
  { 
    id: 'trickster-bot', 
    displayName: 'tricksterbot', 
    category: 'behavior',
    description: 'Uses unexpected and clever moves'
  },
  { 
    id: 'scholar-bot', 
    displayName: 'scholarbot', 
    category: 'behavior',
    description: 'Focuses on rare and unusual words'
  },
  { 
    id: 'minimalist-bot', 
    displayName: 'minimalistbot', 
    category: 'behavior',
    description: 'Uses the fewest moves possible'
  },
  { 
    id: 'maximalist-bot', 
    displayName: 'maximalistbot', 
    category: 'behavior',
    description: 'Uses complex, multi-step strategies'
  },
  { 
    id: 'perfectionist-bot', 
    displayName: 'perfectionistbot', 
    category: 'behavior',
    description: 'Never makes suboptimal moves'
  },
  { 
    id: 'wildcard-bot', 
    displayName: 'wildcardbot', 
    category: 'behavior',
    description: 'Completely unpredictable behavior'
  },
  { 
    id: 'tactical-bot', 
    displayName: 'tacticalbot', 
    category: 'behavior',
    description: 'Focuses on tactical letter placement'
  },
  { 
    id: 'strategic-bot', 
    displayName: 'strategicbot', 
    category: 'behavior',
    description: 'Long-term strategic planning'
  },
  { 
    id: 'adaptive-bot', 
    displayName: 'adaptivebot', 
    category: 'behavior',
    description: 'Changes strategy mid-game'
  },
  { 
    id: 'comeback-bot', 
    displayName: 'comebackbot', 
    category: 'behavior',
    description: 'Stronger when behind in score'
  },
  { 
    id: 'guardian-bot', 
    displayName: 'guardianbot', 
    category: 'behavior',
    description: 'Protects and nurtures key letters'
  },
  { 
    id: 'hunter-bot', 
    displayName: 'hunterbot', 
    category: 'behavior',
    description: 'Aggressively pursues key letters'
  },
  { 
    id: 'ninja-bot', 
    displayName: 'ninjabot', 
    category: 'behavior',
    description: 'Silent, precise, strategic moves'
  },
  { 
    id: 'wizard-bot', 
    displayName: 'wizardbot', 
    category: 'behavior',
    description: 'Uses magical word transformations'
  },
  { 
    id: 'robot-bot', 
    displayName: 'robotbot', 
    category: 'behavior',
    description: 'Pure algorithmic precision'
  },
  { 
    id: 'beast-bot', 
    displayName: 'beastbot', 
    category: 'behavior',
    description: 'Raw power and aggression'
  }
];

/**
 * Get bot display name by ID
 */
export function getBotDisplayName(botId: string): string {
  const bot = BOT_REGISTRY.find(b => b.id === botId);
  return bot?.displayName || botId;
}

/**
 * Get complete bot object by ID
 */
export function getBotById(botId: string): Bot | undefined {
  return BOT_REGISTRY.find(b => b.id === botId);
}

/**
 * Get all bots
 */
export function getAllBots(): Bot[] {
  return [...BOT_REGISTRY];
}

/**
 * Get bots by category
 */
export function getBotsByCategory(category: Bot['category']): Bot[] {
  return BOT_REGISTRY.filter(bot => bot.category === category);
}

/**
 * Get bots by difficulty
 */
export function getBotsByDifficulty(difficulty: Bot['difficulty']): Bot[] {
  return BOT_REGISTRY.filter(bot => bot.difficulty === difficulty);
}

/**
 * Create bot display names mapping for legacy compatibility
 */
export function getBotDisplayNamesMapping(): Record<string, string> {
  const mapping: Record<string, string> = {};
  BOT_REGISTRY.forEach(bot => {
    mapping[bot.id] = bot.displayName;
  });
  return mapping;
} 