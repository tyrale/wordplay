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
    id: 'basicBot', 
    displayName: 'Basic Bot', 
    difficulty: 'basic',
    category: 'progression',
    description: 'Basic bot for new players'
  },

  // Progression Bots (unlocked by achievements)
  { 
    id: 'easy-bot', 
    displayName: 'easy bot', 
    difficulty: 'easy',
    category: 'progression',
    description: 'Unlocked by beating basicBot'
  },
  { 
    id: 'medium-bot', 
    displayName: 'medium bot', 
    difficulty: 'medium',
    category: 'progression',
    description: 'Unlocked by beating easy bot'
  },
  { 
    id: 'hard-bot', 
    displayName: 'hard bot', 
    difficulty: 'hard',
    category: 'progression',
    description: 'Unlocked by beating medium bot'
  },
  { 
    id: 'expert-bot', 
    displayName: 'expert bot', 
    difficulty: 'expert',
    category: 'progression',
    description: 'Unlocked by beating hard bot'
  },

  // Themed Bots (unlocked by playing specific words)
  { 
    id: 'pirate-bot', 
    displayName: 'pirate bot', 
    theme: 'pirate',
    category: 'themed',
    description: 'Unlocked by playing "pirate"'
  },
  { 
    id: 'chaos-bot', 
    displayName: 'chaos bot', 
    theme: 'chaos',
    category: 'themed',
    description: 'Unlocked by playing "chaos"'
  },
  { 
    id: 'puzzle-bot', 
    displayName: 'puzzle bot', 
    theme: 'puzzle',
    category: 'themed',
    description: 'Unlocked by playing "puzzle"'
  },
  { 
    id: 'speed-bot', 
    displayName: 'speed bot', 
    theme: 'speed',
    category: 'themed',
    description: 'Unlocked by playing "speed"'
  },
  { 
    id: 'creative-bot', 
    displayName: 'creative bot', 
    theme: 'creative',
    category: 'themed',
    description: 'Unlocked by playing "creative"'
  },
  { 
    id: 'vowel-bot', 
    displayName: 'vowel bot', 
    theme: 'vowel',
    category: 'themed',
    description: 'Unlocked by playing "vowel"'
  },
  { 
    id: 'rhyme-bot', 
    displayName: 'rhyme bot', 
    theme: 'rhyme',
    category: 'themed',
    description: 'Unlocked by playing "rhyme"'
  },

  // Behavior-Based Bots
  { 
    id: 'aggressive-bot', 
    displayName: 'aggressive bot', 
    category: 'behavior',
    description: 'High-risk, high-reward strategy'
  },
  { 
    id: 'defensive-bot', 
    displayName: 'defensive bot', 
    category: 'behavior',
    description: 'Focuses on blocking player moves'
  },
  { 
    id: 'learning-bot', 
    displayName: 'learning bot', 
    category: 'behavior',
    description: 'Adapts to player strategies'
  },
  { 
    id: 'memory-bot', 
    displayName: 'memory bot', 
    category: 'behavior',
    description: 'Remembers and counters patterns'
  },
  { 
    id: 'pattern-bot', 
    displayName: 'pattern bot', 
    category: 'behavior',
    description: 'Uses advanced pattern recognition'
  },
  { 
    id: 'minimalist-bot', 
    displayName: 'minimalist bot', 
    category: 'behavior',
    description: 'Prefers simple, efficient moves'
  },
  { 
    id: 'maximalist-bot', 
    displayName: 'maximalist bot', 
    category: 'behavior',
    description: 'Goes for maximum scoring moves'
  },
  { 
    id: 'consonant-bot', 
    displayName: 'consonant bot', 
    category: 'behavior',
    description: 'Favors consonant-heavy words'
  },
  { 
    id: 'alliteration-bot', 
    displayName: 'alliteration bot', 
    category: 'behavior',
    description: 'Prefers alliterative words'
  },
  { 
    id: 'length-bot', 
    displayName: 'length bot', 
    category: 'behavior',
    description: 'Focuses on word length optimization'
  },
  { 
    id: 'suffix-bot', 
    displayName: 'suffix bot', 
    category: 'behavior',
    description: 'Specializes in suffix transformations'
  },
  { 
    id: 'prefix-bot', 
    displayName: 'prefix bot', 
    category: 'behavior',
    description: 'Specializes in prefix transformations'
  },
  { 
    id: 'compound-bot', 
    displayName: 'compound bot', 
    category: 'behavior',
    description: 'Prefers compound words'
  },
  { 
    id: 'analytical-bot', 
    displayName: 'analytical bot', 
    category: 'behavior',
    description: 'Uses deep analysis for moves'
  },
  { 
    id: 'intuitive-bot', 
    displayName: 'intuitive bot', 
    category: 'behavior',
    description: 'Makes quick, instinctive moves'
  },
  { 
    id: 'experimental-bot', 
    displayName: 'experimental bot', 
    category: 'behavior',
    description: 'Tries unconventional strategies'
  },
  { 
    id: 'classic-bot', 
    displayName: 'classic bot', 
    category: 'behavior',
    description: 'Uses traditional word game strategies'
  },
  { 
    id: 'modern-bot', 
    displayName: 'modern bot', 
    category: 'behavior',
    description: 'Uses contemporary word patterns'
  },

  // Special/Advanced Bots
  { 
    id: 'adaptive-bot', 
    displayName: 'adaptive bot', 
    category: 'behavior',
    description: 'Adapts strategy mid-game'
  },
  { 
    id: 'strategic-bot', 
    displayName: 'strategic bot', 
    category: 'behavior',
    description: 'Long-term strategic planning'
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