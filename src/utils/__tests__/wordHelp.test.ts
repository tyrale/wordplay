/**
 * Unit tests for wordHelp utilities — legality reason, playability check, and
 * the variant-definition note used by the dictionary (?) overlay.
 */

import { describe, it, expect } from 'vitest';
import type { WordDataDependencies } from '../../../packages/engine/interfaces';
import {
  getWordLegalityReason,
  isPlayableWord,
  getVariantDefinitionNote
} from '../wordHelp';

function makeWordData(overrides: Partial<WordDataDependencies> = {}): WordDataDependencies {
  return {
    enableWords: new Set(['CAT', 'GOURD', 'GOURDS']),
    slangWords: new Set(['BRUH']),
    profanityWords: new Set(),
    properNounWords: new Set(['PARIS']),
    wordCount: 3,
    ...overrides
  };
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
    expect(getWordLegalityReason('  Cat  ', makeWordData())).toBe(
      'Found in the standard dictionary'
    );
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
    // it is a disallowed variant either — return null to avoid false framing.
    expect(getVariantDefinitionNote('gords', null, 'plural of gord')).toBeNull();
  });
});
