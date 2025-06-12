/**
 * Unlock Definitions
 * 
 * Configurable unlock rules that define how themes, mechanics, and bots
 * are unlocked through word play and achievements. This data-driven approach
 * allows for easy updates and A/B testing without code changes.
 */

import type { UnlockDefinition, UnlockState } from './interfaces';

/**
 * Initial unlock state for fresh users
 */
export const INITIAL_UNLOCK_STATE: UnlockState = {
  themes: ['classic blue'],  // Only default theme unlocked initially
  mechanics: [],             // No special mechanics unlocked
  bots: ['tester'],         // Only basic test bot unlocked
  achievements: []          // No achievements earned
};

/**
 * All unlock definitions - configurable rules for unlocking features
 */
export const UNLOCK_DEFINITIONS: UnlockDefinition[] = [
  // Theme unlocks - triggered by playing the theme name as a word
  {
    id: 'unlock_red_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'red', timing: 'word_submission' },
    target: 'red',
    immediate_effect: { type: 'apply_theme', value: 'red' }
  },
  {
    id: 'unlock_pink_theme',
    category: 'theme', 
    trigger: { type: 'word', value: 'pink', timing: 'word_submission' },
    target: 'pink',
    immediate_effect: { type: 'apply_theme', value: 'pink' }
  },
  {
    id: 'unlock_purple_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'purple', timing: 'word_submission' },
    target: 'purple',
    immediate_effect: { type: 'apply_theme', value: 'purple' }
  },
  {
    id: 'unlock_plum_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'plum', timing: 'word_submission' },
    target: 'plum',
    immediate_effect: { type: 'apply_theme', value: 'plum' }
  },
  {
    id: 'unlock_indigo_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'indigo', timing: 'word_submission' },
    target: 'indigo',
    immediate_effect: { type: 'apply_theme', value: 'indigo' }
  },
  {
    id: 'unlock_blue_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'blue', timing: 'word_submission' },
    target: 'blue',
    immediate_effect: { type: 'apply_theme', value: 'blue' }
  },
  {
    id: 'unlock_denim_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'denim', timing: 'word_submission' },
    target: 'denim',
    immediate_effect: { type: 'apply_theme', value: 'denim' }
  },
  {
    id: 'unlock_cyan_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'cyan', timing: 'word_submission' },
    target: 'cyan',
    immediate_effect: { type: 'apply_theme', value: 'cyan' }
  },
  {
    id: 'unlock_teal_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'teal', timing: 'word_submission' },
    target: 'teal',
    immediate_effect: { type: 'apply_theme', value: 'teal' }
  },
  {
    id: 'unlock_green_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'green', timing: 'word_submission' },
    target: 'green',
    immediate_effect: { type: 'apply_theme', value: 'green' }
  },
  {
    id: 'unlock_mint_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'mint', timing: 'word_submission' },
    target: 'mint',
    immediate_effect: { type: 'apply_theme', value: 'mint' }
  },
  {
    id: 'unlock_lime_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'lime', timing: 'word_submission' },
    target: 'lime',
    immediate_effect: { type: 'apply_theme', value: 'lime' }
  },
  {
    id: 'unlock_yellow_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'yellow', timing: 'word_submission' },
    target: 'yellow',
    immediate_effect: { type: 'apply_theme', value: 'yellow' }
  },
  {
    id: 'unlock_amber_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'amber', timing: 'word_submission' },
    target: 'amber',
    immediate_effect: { type: 'apply_theme', value: 'amber' }
  },
  {
    id: 'unlock_orange_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'orange', timing: 'word_submission' },
    target: 'orange',
    immediate_effect: { type: 'apply_theme', value: 'orange' }
  },
  {
    id: 'unlock_coral_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'coral', timing: 'word_submission' },
    target: 'coral',
    immediate_effect: { type: 'apply_theme', value: 'coral' }
  },
  {
    id: 'unlock_brown_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'brown', timing: 'word_submission' },
    target: 'brown',
    immediate_effect: { type: 'apply_theme', value: 'brown' }
  },
  {
    id: 'unlock_gray_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'gray', timing: 'word_submission' },
    target: 'gray',
    immediate_effect: { type: 'apply_theme', value: 'gray' }
  },
  {
    id: 'unlock_black_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'black', timing: 'word_submission' },
    target: 'black',
    immediate_effect: { type: 'apply_theme', value: 'black' }
  },

  // Special named themes
  {
    id: 'unlock_grandma_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'grandma', timing: 'word_submission' },
    target: 'grandma',
    immediate_effect: { type: 'apply_theme', value: 'grandma' }
  },
  {
    id: 'unlock_grandpa_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'grandpa', timing: 'word_submission' },
    target: 'grandpa',
    immediate_effect: { type: 'apply_theme', value: 'grandpa' }
  },
  {
    id: 'unlock_contrast_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'contrast', timing: 'word_submission' },
    target: 'contrast',
    immediate_effect: { type: 'apply_theme', value: 'contrast' }
  },
  {
    id: 'unlock_july_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'july', timing: 'word_submission' },
    target: 'july',
    immediate_effect: { type: 'apply_theme', value: 'july' }
  },
  {
    id: 'unlock_brand_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'brand', timing: 'word_submission' },
    target: 'brand',
    immediate_effect: { type: 'apply_theme', value: 'brand' }
  },
  {
    id: 'unlock_salmon_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'salmon', timing: 'word_submission' },
    target: 'salmon',
    immediate_effect: { type: 'apply_theme', value: 'salmon' }
  },
  {
    id: 'unlock_blues_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'blues', timing: 'word_submission' },
    target: 'blues',
    immediate_effect: { type: 'apply_theme', value: 'blues' }
  },
  {
    id: 'unlock_squash_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'squash', timing: 'word_submission' },
    target: 'squash',
    immediate_effect: { type: 'apply_theme', value: 'squash' }
  },
  {
    id: 'unlock_crimson_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'crimson', timing: 'word_submission' },
    target: 'crimson',
    immediate_effect: { type: 'apply_theme', value: 'crimson' }
  },
  {
    id: 'unlock_touch_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'touch', timing: 'word_submission' },
    target: 'touch',
    immediate_effect: { type: 'apply_theme', value: 'touch' }
  },
  {
    id: 'unlock_citrus_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'citrus', timing: 'word_submission' },
    target: 'citrus',
    immediate_effect: { type: 'apply_theme', value: 'citrus' }
  },
  {
    id: 'unlock_lagoon_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'lagoon', timing: 'word_submission' },
    target: 'lagoon',
    immediate_effect: { type: 'apply_theme', value: 'lagoon' }
  },
  {
    id: 'unlock_intense_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'intense', timing: 'word_submission' },
    target: 'intense',
    immediate_effect: { type: 'apply_theme', value: 'intense' }
  },
  {
    id: 'unlock_sky_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'sky', timing: 'word_submission' },
    target: 'sky',
    immediate_effect: { type: 'apply_theme', value: 'sky' }
  },
  {
    id: 'unlock_winter_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'winter', timing: 'word_submission' },
    target: 'winter',
    immediate_effect: { type: 'apply_theme', value: 'winter' }
  },
  {
    id: 'unlock_autumn_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'autumn', timing: 'word_submission' },
    target: 'autumn',
    immediate_effect: { type: 'apply_theme', value: 'autumn' }
  },
  {
    id: 'unlock_lavender_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'lavender', timing: 'word_submission' },
    target: 'lavender',
    immediate_effect: { type: 'apply_theme', value: 'lavender' }
  },
  {
    id: 'unlock_camping_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'camping', timing: 'word_submission' },
    target: 'camping',
    immediate_effect: { type: 'apply_theme', value: 'camping' }
  },
  {
    id: 'unlock_craft_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'craft', timing: 'word_submission' },
    target: 'craft',
    immediate_effect: { type: 'apply_theme', value: 'craft' }
  },
  {
    id: 'unlock_tomato_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'tomato', timing: 'word_submission' },
    target: 'tomato',
    immediate_effect: { type: 'apply_theme', value: 'tomato' }
  },
  {
    id: 'unlock_grass_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'grass', timing: 'word_submission' },
    target: 'grass',
    immediate_effect: { type: 'apply_theme', value: 'grass' }
  },
  {
    id: 'unlock_gear_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'gear', timing: 'word_submission' },
    target: 'gear',
    immediate_effect: { type: 'apply_theme', value: 'gear' }
  },
  {
    id: 'unlock_boots_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'boots', timing: 'word_submission' },
    target: 'boots',
    immediate_effect: { type: 'apply_theme', value: 'boots' }
  },
  {
    id: 'unlock_storm_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'storm', timing: 'word_submission' },
    target: 'storm',
    immediate_effect: { type: 'apply_theme', value: 'storm' }
  },
  {
    id: 'unlock_vibrant_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'vibrant', timing: 'word_submission' },
    target: 'vibrant',
    immediate_effect: { type: 'apply_theme', value: 'vibrant' }
  },
  {
    id: 'unlock_gentle_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'gentle', timing: 'word_submission' },
    target: 'gentle',
    immediate_effect: { type: 'apply_theme', value: 'gentle' }
  },
  {
    id: 'unlock_peaceful_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'peaceful', timing: 'word_submission' },
    target: 'peaceful',
    immediate_effect: { type: 'apply_theme', value: 'peaceful' }
  },
  {
    id: 'unlock_market_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'market', timing: 'word_submission' },
    target: 'market',
    immediate_effect: { type: 'apply_theme', value: 'market' }
  },
  {
    id: 'unlock_racing_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'racing', timing: 'word_submission' },
    target: 'racing',
    immediate_effect: { type: 'apply_theme', value: 'racing' }
  },
  {
    id: 'unlock_berry_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'berry', timing: 'word_submission' },
    target: 'berry',
    immediate_effect: { type: 'apply_theme', value: 'berry' }
  },
  {
    id: 'unlock_brick_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'brick', timing: 'word_submission' },
    target: 'brick',
    immediate_effect: { type: 'apply_theme', value: 'brick' }
  },
  {
    id: 'unlock_vintage_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'vintage', timing: 'word_submission' },
    target: 'vintage',
    immediate_effect: { type: 'apply_theme', value: 'vintage' }
  },
  {
    id: 'unlock_midnight_theme',
    category: 'theme',
    trigger: { type: 'word', value: 'midnight', timing: 'word_submission' },
    target: 'midnight',
    immediate_effect: { type: 'apply_theme', value: 'midnight' }
  },

  // Mechanic unlocks - triggered by playing specific words
  {
    id: 'unlock_five_letter_start',
    category: 'mechanic',
    trigger: { type: 'word', value: 'five', timing: 'word_submission' },
    target: '5-letter-start'
  },
  {
    id: 'unlock_six_letter_start',
    category: 'mechanic',
    trigger: { type: 'word', value: 'six', timing: 'word_submission' },
    target: '6-letter-start'
  },
  {
    id: 'unlock_longer_words',
    category: 'mechanic',
    trigger: { type: 'word', value: 'longer', timing: 'word_submission' },
    target: 'longer-words'
  },
  {
    id: 'unlock_time_pressure',
    category: 'mechanic',
    trigger: { type: 'word', value: 'time', timing: 'word_submission' },
    target: 'time-pressure'
  },
  {
    id: 'unlock_double_key_letters',
    category: 'mechanic',
    trigger: { type: 'word', value: 'double', timing: 'word_submission' },
    target: 'double-key-letters'
  },
  {
    id: 'unlock_reverse_scoring',
    category: 'mechanic',
    trigger: { type: 'word', value: 'reverse', timing: 'word_submission' },
    target: 'reverse-scoring'
  },

  // Bot unlocks - mixed triggers (achievements and words)
  {
    id: 'unlock_easy_bot',
    category: 'bot',
    trigger: { type: 'achievement', value: 'beat_tester', timing: 'game_completion' },
    target: 'easy-bot'
  },
  {
    id: 'unlock_pirate_bot',
    category: 'bot',
    trigger: { type: 'word', value: 'pirate', timing: 'word_submission' },
    target: 'pirate-bot'
  },
  {
    id: 'unlock_medium_bot',
    category: 'bot',
    trigger: { type: 'achievement', value: 'beat_easy_bot', timing: 'game_completion' },
    target: 'medium-bot'
  },
  {
    id: 'unlock_hard_bot',
    category: 'bot',
    trigger: { type: 'achievement', value: 'beat_medium_bot', timing: 'game_completion' },
    target: 'hard-bot'
  },
  {
    id: 'unlock_expert_bot',
    category: 'bot',
    trigger: { type: 'achievement', value: 'beat_hard_bot', timing: 'game_completion' },
    target: 'expert-bot'
  },
  {
    id: 'unlock_chaos_bot',
    category: 'bot',
    trigger: { type: 'word', value: 'chaos', timing: 'word_submission' },
    target: 'chaos-bot'
  },
  {
    id: 'unlock_puzzle_bot',
    category: 'bot',
    trigger: { type: 'word', value: 'puzzle', timing: 'word_submission' },
    target: 'puzzle-bot'
  },
  {
    id: 'unlock_speed_bot',
    category: 'bot',
    trigger: { type: 'word', value: 'speed', timing: 'word_submission' },
    target: 'speed-bot'
  },
  {
    id: 'unlock_creative_bot',
    category: 'bot',
    trigger: { type: 'word', value: 'creative', timing: 'word_submission' },
    target: 'creative-bot'
  },
  {
    id: 'unlock_vowel_bot',
    category: 'bot',
    trigger: { type: 'word', value: 'vowel', timing: 'word_submission' },
    target: 'vowel-bot'
  },
  {
    id: 'unlock_rhyme_bot',
    category: 'bot',
    trigger: { type: 'word', value: 'rhyme', timing: 'word_submission' },
    target: 'rhyme-bot'
  }
];

/**
 * Helper function to get unlock definitions by trigger type
 */
export function getUnlocksByTriggerType(triggerType: 'word' | 'achievement'): UnlockDefinition[] {
  return UNLOCK_DEFINITIONS.filter(unlock => unlock.trigger.type === triggerType);
}

/**
 * Helper function to get unlock definitions by category
 */
export function getUnlocksByCategory(category: 'theme' | 'mechanic' | 'bot'): UnlockDefinition[] {
  return UNLOCK_DEFINITIONS.filter(unlock => unlock.category === category);
}

/**
 * Helper function to find unlock definition by trigger value
 */
export function findUnlockByTrigger(triggerType: 'word' | 'achievement', value: string): UnlockDefinition[] {
  return UNLOCK_DEFINITIONS.filter(unlock => 
    unlock.trigger.type === triggerType && 
    unlock.trigger.value.toLowerCase() === value.toLowerCase()
  );
} 