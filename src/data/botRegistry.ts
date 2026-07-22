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
    displayName: 'basicbot', 
    difficulty: 'basic',
    category: 'progression',
    description: 'Basic bot for new players'
  },

  // Progression Bots (unlocked by achievements)
  { 
    id: 'easy-bot', 
    displayName: 'easybot', 
    difficulty: 'easy',
    category: 'progression',
    description: 'Unlocked by beating basicBot'
  },
  { 
    id: 'medium-bot', 
    displayName: 'mediumbot', 
    difficulty: 'medium',
    category: 'progression',
    description: 'Unlocked by beating easy bot'
  },
  { 
    id: 'hard-bot', 
    displayName: 'hardbot', 
    difficulty: 'hard',
    category: 'progression',
    description: 'Unlocked by beating medium bot'
  },
  { 
    id: 'expert-bot', 
    displayName: 'expertbot', 
    difficulty: 'expert',
    category: 'progression',
    description: 'Unlocked by beating hard bot'
  },

  // Themed Bots (unlocked by playing specific words)
  { 
    id: 'pirate-bot', 
    displayName: 'piratebot', 
    theme: 'pirate',
    category: 'themed',
    description: 'Unlocked by playing "pirate"'
  },

  // Behavior Bots (unlocked by various means)
  { 
    id: 'noob-bot', 
    displayName: 'noobbot', 
    category: 'behavior',
    description: 'Only knows one move: adds an S, rules be damned. Unlocked by playing "noob"'
  },
  { 
    id: 'bruh-bot', 
    displayName: 'bruhbot', 
    category: 'behavior',
    description: 'Never plays a word, only ever passes. Unlocked by playing "bruh"'
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