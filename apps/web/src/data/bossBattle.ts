/**
 * Boss Battle Configuration
 *
 * Single source of truth for the "GUS" boss-chain encounter: the three stages
 * (boss -> megaboss -> gigaboss), the bot id and theme each stage uses, the
 * whole-game countdown length (escalating +30s per stage: 130/160/190), and the
 * fixed 20-turn round length.
 *
 * This is a transient, retryable encounter (not a permanent unlock). Playing
 * "GUS" grants one fresh chance; losing/resigning/timing out wipes the chain
 * and reverts the theme. Permanently unlocking boss-bot + the three themes only
 * happens after beating gigaboss (see unlock-definitions.ts, beat_giga_boss_bot).
 */

import { availableThemes } from '../types/theme';
import type { GameTheme } from '../types/theme';

export type BossStage = 'boss' | 'mega' | 'giga';

export interface BossStageConfig {
  stage: BossStage;
  botId: string;
  themeName: string;
  /** Whole-game countdown in seconds for this stage. */
  timeLimitSeconds: number;
  /** Next stage after beating this one, or null for the final stage. */
  next: BossStage | null;
}

export const BOSS_STAGES: Record<BossStage, BossStageConfig> = {
  boss: { stage: 'boss', botId: 'boss-bot', themeName: 'boss', timeLimitSeconds: 130, next: 'mega' },
  mega: { stage: 'mega', botId: 'mega-boss-bot', themeName: 'megaboss', timeLimitSeconds: 160, next: 'giga' },
  giga: { stage: 'giga', botId: 'giga-boss-bot', themeName: 'gigaboss', timeLimitSeconds: 190, next: null }
};

/** The boss theme names, used for effect/restore guards. */
export const BOSS_THEME_NAMES: readonly string[] = ['boss', 'megaboss', 'gigaboss'];

/** Fixed round length (turns) for every boss battle. */
export const BOSS_BATTLE_MAX_TURNS = 20;

/** Achievement id recorded when the player beats a given boss bot. */
export function bossBeatAchievement(botId: string): string {
  return `beat_${botId.split('-').join('_')}`;
}

/** The achievement that permanently unlocks boss-bot + the three boss themes. */
export const GIGA_BEAT_ACHIEVEMENT = 'beat_giga_boss_bot';

/** Resolve a boss stage's GameTheme object from the shared theme list. */
export function getBossTheme(stage: BossStage): GameTheme {
  const name = BOSS_STAGES[stage].themeName;
  return availableThemes.find(t => t.name === name) ?? availableThemes[0];
}

/** Resolve a GameTheme by name (used by the reload/restore guard). */
export function getThemeByName(name: string): GameTheme | undefined {
  return availableThemes.find(t => t.name === name);
}
