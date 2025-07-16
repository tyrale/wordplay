import { describe, it, expect } from 'vitest';
import { 
  BOT_REGISTRY, 
  getBotDisplayName, 
  getBotById, 
  getAllBots, 
  getBotsByCategory, 
  getBotDisplayNamesMapping 
} from '../botRegistry';

describe('Bot Registry', () => {
  it('should have the basic bot as the first entry', () => {
    expect(BOT_REGISTRY[0].id).toBe('basicBot');
    expect(BOT_REGISTRY[0].displayName).toBe('basicBot');
  });

  it('should return correct display name for valid bot ID', () => {
    expect(getBotDisplayName('basicBot')).toBe('basicBot');
    expect(getBotDisplayName('easy-bot')).toBe('easy bot');
    expect(getBotDisplayName('pirate-bot')).toBe('pirate bot');
  });

  it('should return bot ID as fallback for unknown bot', () => {
    expect(getBotDisplayName('unknown-bot')).toBe('unknown-bot');
  });

  it('should return bot object by ID', () => {
    const basicBot = getBotById('basicBot');
    expect(basicBot).toBeDefined();
    expect(basicBot?.id).toBe('basicBot');
    expect(basicBot?.displayName).toBe('basicBot');
    expect(basicBot?.difficulty).toBe('basic');
  });

  it('should return undefined for unknown bot ID', () => {
    const unknownBot = getBotById('unknown-bot');
    expect(unknownBot).toBeUndefined();
  });

  it('should return all bots', () => {
    const allBots = getAllBots();
    expect(allBots.length).toBeGreaterThan(0);
    expect(allBots[0].id).toBe('basicBot');
  });

  it('should filter bots by category', () => {
    const progressionBots = getBotsByCategory('progression');
    expect(progressionBots.length).toBeGreaterThan(0);
    expect(progressionBots.every(bot => bot.category === 'progression')).toBe(true);
    
    const themedBots = getBotsByCategory('themed');
    expect(themedBots.length).toBeGreaterThan(0);
    expect(themedBots.every(bot => bot.category === 'themed')).toBe(true);
  });

  it('should create display names mapping', () => {
    const mapping = getBotDisplayNamesMapping();
    expect(mapping['basicBot']).toBe('basicBot');
    expect(mapping['easy-bot']).toBe('easy bot');
    expect(mapping['pirate-bot']).toBe('pirate bot');
  });

  it('should have all required bots from the original system', () => {
    const requiredBots = [
      'basicBot',
      'easy-bot', 
      'medium-bot',
      'hard-bot',
      'expert-bot',
      'pirate-bot',
      'chaos-bot'
    ];
    
    requiredBots.forEach(botId => {
      const bot = getBotById(botId);
      expect(bot).toBeDefined();
      expect(bot?.id).toBe(botId);
    });
  });
}); 