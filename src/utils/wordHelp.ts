/**
 * Word Help Utilities
 *
 * Shared logic for the "?" help feature on the game board: determining why
 * the current word is (or isn't) legal to play, and fetching a plain-English
 * definition from the free dictionaryapi.dev service. Used by both
 * `InteractiveGame.tsx` and `ChallengeGame.tsx`.
 */

import type { WordDataDependencies } from '../../packages/engine/interfaces';

/**
 * Explains why a word is (or isn't) legal to play, based on which word set
 * it's found in (proper noun / slang / standard dictionary).
 */
export function getWordLegalityReason(word: string, wordData: WordDataDependencies | null): string {
  const upper = word.trim().toUpperCase();
  if (!upper) return '';
  if (wordData?.properNounWords.has(upper)) return 'Recognized as a proper noun';
  if (wordData?.slangWords.has(upper)) return 'Recognized as valid slang';
  if (wordData?.enableWords.has(upper)) return 'Found in the standard dictionary';
  return 'Not currently a valid word';
}

const DEFINITION_FETCH_TIMEOUT_MS = 4000;

/**
 * Fetches a short definition for a word from the free Dictionary API
 * (https://dictionaryapi.dev). Returns `null` on any failure (offline,
 * not found, timeout, etc.) so callers can gracefully omit it.
 */
export async function fetchWordDefinition(word: string): Promise<string | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFINITION_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(trimmed.toLowerCase())}`,
      { signal: controller.signal }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const definition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    return typeof definition === 'string' && definition.length > 0 ? definition : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
