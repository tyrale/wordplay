/**
 * Ports apps/web's `utils/__tests__/wordHelp.test.ts` (Jest instead of
 * Vitest), plus additional coverage for `isSeussWord`/`isSeussCanonicalWord`/
 * `isSeussInventedWord` and `fetchWordDefinition` that web itself doesn't
 * test (the fetch-based functions are network-dependent, hence mocked
 * `global.fetch` here rather than skipped).
 */
import type { WordDataDependencies } from '@wordplay/engine/interfaces';
import {
  getWordLegalityReason,
  isPlayableWord,
  isSeussWord,
  isSeussCanonicalWord,
  isSeussInventedWord,
  getVariantDefinitionNote,
  fetchWordDefinition
} from '../wordHelp';

function makeWordData(overrides: Partial<WordDataDependencies> = {}): WordDataDependencies {
  return {
    enableWords: new Set(['CAT', 'GOURD', 'GOURDS']),
    slangWords: new Set(['BRUH']),
    profanityWords: new Set(),
    properNounWords: new Set(['PARIS']),
    seussCanonicalWords: new Set(['FOX']),
    seussInventedWords: new Set(['SNEETCH']),
    wordCount: 3,
    ...overrides
  } as WordDataDependencies;
}

describe('getWordLegalityReason', () => {
  it('recognizes standard dictionary words', () => {
    expect(getWordLegalityReason('cat', makeWordData())).toBe('Found in the standard dictionary');
  });

  it('recognizes slang words', () => {
    expect(getWordLegalityReason('bruh', makeWordData())).toBe('Recognized as valid slang');
  });

  it('recognizes proper nouns', () => {
    expect(getWordLegalityReason('paris', makeWordData())).toBe('Recognized as a proper noun');
  });

  it('marks unknown words as not valid', () => {
    expect(getWordLegalityReason('gords', makeWordData())).toBe('Not currently a valid word');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(getWordLegalityReason('  Cat  ', makeWordData())).toBe('Found in the standard dictionary');
  });

  it('handles missing word data gracefully', () => {
    expect(getWordLegalityReason('cat', null)).toBe('Not currently a valid word');
  });
});

describe('isPlayableWord', () => {
  it('returns true for dictionary, slang, and proper-noun words', () => {
    const data = makeWordData();
    expect(isPlayableWord('cat', data)).toBe(true);
    expect(isPlayableWord('bruh', data)).toBe(true);
    expect(isPlayableWord('paris', data)).toBe(true);
  });

  it('returns false for words not in any accepted set', () => {
    expect(isPlayableWord('gords', makeWordData())).toBe(false);
  });

  it('returns false for null word data or empty input', () => {
    expect(isPlayableWord('cat', null)).toBe(false);
    expect(isPlayableWord('', makeWordData())).toBe(false);
    expect(isPlayableWord('   ', makeWordData())).toBe(false);
  });
});

describe('isSeussWord/isSeussCanonicalWord/isSeussInventedWord', () => {
  it('identifies canonical and invented Seuss words as Seuss words', () => {
    const data = makeWordData();
    expect(isSeussWord('fox', data)).toBe(true);
    expect(isSeussWord('sneetch', data)).toBe(true);
    expect(isSeussWord('cat', data)).toBe(false);
  });

  it('distinguishes canonical from invented', () => {
    const data = makeWordData();
    expect(isSeussCanonicalWord('fox', data)).toBe(true);
    expect(isSeussCanonicalWord('sneetch', data)).toBe(false);
    expect(isSeussInventedWord('sneetch', data)).toBe(true);
    expect(isSeussInventedWord('fox', data)).toBe(false);
  });

  it('returns false for null word data or empty input', () => {
    expect(isSeussWord('fox', null)).toBe(false);
    expect(isSeussWord('', makeWordData())).toBe(false);
  });
});

describe('getVariantDefinitionNote', () => {
  it('returns an explanatory note when a word is not playable but has a definition', () => {
    // "gords" is a dialectal plural found in Wiktionary but not in the game list.
    const note = getVariantDefinitionNote('gords', makeWordData(), 'plural of gord');
    expect(note).not.toBeNull();
    expect(note).toMatch(/variant or non-standard form/i);
    expect(note).toMatch(/not accepted/i);
  });

  it('returns null when the word IS playable (even if a definition exists)', () => {
    expect(getVariantDefinitionNote('cat', makeWordData(), 'a small feline')).toBeNull();
  });

  it('returns null when the word is not playable and there is no definition', () => {
    expect(getVariantDefinitionNote('qqqqq', makeWordData(), null)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(getVariantDefinitionNote('', makeWordData(), 'something')).toBeNull();
  });

  it('returns null when word data is missing but a definition exists', () => {
    // Without word data we cannot prove the word is playable, so we cannot claim
    // it is a disallowed variant either - return null to avoid false framing.
    expect(getVariantDefinitionNote('gords', null, 'plural of gord')).toBeNull();
  });
});

describe('fetchWordDefinition', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns null for empty input without making a network call', async () => {
    global.fetch = jest.fn();
    expect(await fetchWordDefinition('   ')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns the dictionaryapi.dev definition when found', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ meanings: [{ definitions: [{ definition: 'a small feline' }] }] }]
    });

    expect(await fetchWordDefinition('cat')).toBe('a small feline');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('api.dictionaryapi.dev');
  });

  it('falls back to Wiktionary when dictionaryapi.dev has no entry', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          en: [{ language: 'English', definitions: [{ definition: '<i>plural of</i> gord' }] }]
        })
      });

    expect(await fetchWordDefinition('gords')).toBe('plural of gord');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('wiktionary.org');
  });

  it('prefers an English-language Wiktionary entry over other languages', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          en: [
            { language: 'Catalan', definitions: [{ definition: 'a Catalan word' }] },
            { language: 'English', definitions: [{ definition: 'the English meaning' }] }
          ]
        })
      });

    expect(await fetchWordDefinition('las')).toBe('the English meaning');
  });

  it('returns null when neither source has a definition', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false });

    expect(await fetchWordDefinition('zzzznotaword')).toBeNull();
  });

  it('returns null (not throw) when fetch itself rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    expect(await fetchWordDefinition('cat')).toBeNull();
  });
});
