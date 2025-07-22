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
    expect(BOT_REGISTRY[0].displayName).toBe('basicbot');
  });

  it('should return correct display name for valid bot ID', () => {
    expect(getBotDisplayName('basicBot')).toBe('basicbot');
    expect(getBotDisplayName('easy-bot')).toBe('easybot');
    expect(getBotDisplayName('pirate-bot')).toBe('piratebot');
  });

  it('should return bot ID as fallback for unknown bot', () => {
    expect(getBotDisplayName('unknown-bot')).toBe('unknown-bot');
  });

  it('should return bot object by ID', () => {
    const basicBot = getBotById('basicBot');
    expect(basicBot).toBeDefined();
    expect(basicBot?.id).toBe('basicBot');
    expect(basicBot?.displayName).toBe('basicbot');
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
  });

  it('should create display names mapping', () => {
    const mapping = getBotDisplayNamesMapping();
    expect(mapping['basicBot']).toBe('basicbot');
    expect(mapping['easy-bot']).toBe('easybot');
    expect(mapping['pirate-bot']).toBe('piratebot');
  });

  it('should have all required bots from the original system', () => {
    const allBots = getAllBots();
    const botIds = allBots.map(bot => bot.id);
    
    // Check for key original bots
    expect(botIds).toContain('basicBot');
    expect(botIds).toContain('easy-bot');
    expect(botIds).toContain('medium-bot');
    expect(botIds).toContain('hard-bot');
    expect(botIds).toContain('pirate-bot');
    expect(botIds).toContain('chaos-bot');
  });
}); 