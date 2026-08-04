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

/**
 * Reports whether a word is playable in the game, i.e. present in any of the
 * accepted word sets (standard dictionary, slang, or recognized proper nouns).
 */
export function isPlayableWord(word: string, wordData: WordDataDependencies | null): boolean {
  const upper = word.trim().toUpperCase();
  if (!upper) return false;
  return !!(
    wordData &&
    (wordData.enableWords.has(upper) ||
      wordData.slangWords.has(upper) ||
      wordData.properNounWords.has(upper))
  );
}

/**
 * Checks if a word is a Dr. Seuss word (canonical or invented).
 */
export function isSeussWord(word: string, wordData: WordDataDependencies | null): boolean {
  const upper = word.trim().toUpperCase();
  if (!upper || !wordData) return false;
  return wordData.seussCanonicalWords.has(upper) || wordData.seussInventedWords.has(upper);
}

/**
 * Checks if a word is a canonical Dr. Seuss word only (not invented).
 */
export function isSeussCanonicalWord(word: string, wordData: WordDataDependencies | null): boolean {
  const upper = word.trim().toUpperCase();
  if (!upper || !wordData) return false;
  return wordData.seussCanonicalWords.has(upper);
}

/**
 * Checks if a word is an invented Dr. Seuss-style word only (not canonical).
 */
export function isSeussInventedWord(word: string, wordData: WordDataDependencies | null): boolean {
  const upper = word.trim().toUpperCase();
  if (!upper || !wordData) return false;
  return wordData.seussInventedWords.has(upper);
}

/**
 * Returns an explanatory note for words that are NOT playable in the game but
 * DO have an entry in a broader external dictionary (Wiktionary /
 * dictionaryapi.dev). Such words are typically archaic, dialectal, or variant
 * spellings (e.g. "gords", the plural of the dialectal "gord"). Without this
 * note, players see a dictionary definition and assume the word is playable.
 *
 * Returns `null` when the note does not apply (the word is playable, or no
 * external definition was found).
 */
export function getVariantDefinitionNote(
  word: string,
  wordData: WordDataDependencies | null,
  definition: string | null
): string | null {
  const upper = word.trim().toUpperCase();
  // Word data is required to confidently say the word is not playable; without
  // it we can't tell a disallowed variant apart from "dictionary not loaded yet".
  if (!upper || !definition || !wordData) return null;
  if (isPlayableWord(upper, wordData)) return null;
  return 'The dictionary entry below is a variant or non-standard form, and is not accepted as a valid word in this game.';
}

const DEFINITION_FETCH_TIMEOUT_MS = 4000;

/** Strips HTML tags/entities from a Wiktionary definition string. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches a short definition for a word from the free Dictionary API
 * (https://dictionaryapi.dev). Returns `null` on any failure (offline,
 * not found, timeout, etc.).
 */
async function fetchFromDictionaryApi(word: string, signal: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const definition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    return typeof definition === 'string' && definition.length > 0 ? definition : null;
  } catch {
    return null;
  }
}

/**
 * Fallback definition source for words not present in dictionaryapi.dev
 * (e.g. archaic/dialectal words like "feal"). Uses Wiktionary's public REST
 * API, which has no API key requirement and permissive CORS.
 */
async function fetchFromWiktionary(word: string, signal: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
      { signal }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const entries = data?.en;
    if (!Array.isArray(entries)) return null;

    // Wiktionary's "en" bucket includes entries for words in *other* languages
    // that happen to use Latin script (e.g. "las" is also a Catalan adjective
    // and a Translingual ISO 639-3 code). Prefer entries whose `language` is
    // actually English so we don't surface a foreign-language definition.
    const englishFirst = [
      ...entries.filter((entry) => entry?.language === 'English'),
      ...entries.filter((entry) => entry?.language !== 'English')
    ];

    for (const entry of englishFirst) {
      const rawDefinition = entry?.definitions?.[0]?.definition;
      if (typeof rawDefinition === 'string') {
        const cleaned = stripHtml(rawDefinition);
        if (cleaned.length > 0) return cleaned;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches a short definition for a word, trying dictionaryapi.dev first and
 * falling back to Wiktionary if the word isn't found there. Returns `null`
 * if neither source has a definition (offline, timeout, truly unknown word).
 */
export async function fetchWordDefinition(word: string): Promise<string | null> {
  const trimmed = word.trim().toLowerCase();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFINITION_FETCH_TIMEOUT_MS);

  try {
    const primary = await fetchFromDictionaryApi(trimmed, controller.signal);
    if (primary) return primary;

    return await fetchFromWiktionary(trimmed, controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}
