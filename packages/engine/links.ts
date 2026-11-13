/**
 * Public URLs for Reword, shared by web, native and marketing surfaces
 * (share text, landing page CTAs). Change GAME_URL here once the custom
 * domain is chosen - see docs/launch/LAUNCH_PLAN.md "Execution status".
 */
export const GAME_URL = 'https://wordplay-blond.vercel.app';

/** Opens today's Daily Challenge directly (handled by apps/web App.tsx). */
export const DAILY_CHALLENGE_URL = `${GAME_URL}/?daily`;

/** Appends the Daily Challenge link to a challenge share result, so anyone
 * who sees a shared grid can open the same puzzle. Kept out of
 * generateSharingText itself because the in-game completion overlay renders
 * that text line-by-line and shouldn't show a URL. */
export function withDailyChallengeLink(shareText: string): string {
  return `${shareText}\n${DAILY_CHALLENGE_URL}`;
}
