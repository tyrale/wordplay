import { validateWord, censorWord, addWord, isInDictionary, getWordLengthDifference } from './dictionary';

describe('Dictionary Service', () => {
  describe('validateWord', () => {
    it('should validate common words', () => {
      expect(validateWord('HELLO')).toBe(true);
      expect(validateWord('WORLD')).toBe(true);
      expect(validateWord('GAME')).toBe(true);
    });

    it('should validate slang words', () => {
      expect(validateWord('BRUH')).toBe(true);
      expect(validateWord('LOL')).toBe(true);
      expect(validateWord('OMG')).toBe(true);
    });

    it('should validate word length based on previous word', () => {
      expect(validateWord('HELLO', 'HELL')).toBe(true);  // +1 letter
      expect(validateWord('HELL', 'HELLO')).toBe(true);  // -1 letter
      expect(validateWord('HELLO', 'HELLO')).toBe(true); // same length
      expect(validateWord('HELLO', 'HEL')).toBe(false);  // +2 letters
      expect(validateWord('HEL', 'HELLO')).toBe(false);  // -2 letters
    });

    it('should reject invalid words', () => {
      expect(validateWord('')).toBe(false);
      expect(validateWord('123')).toBe(false);
      expect(validateWord('HELLO123')).toBe(false);
      expect(validateWord('HELLO WORLD')).toBe(false);
    });

    it('should allow bots to break rules', () => {
      expect(validateWord('123', undefined, true)).toBe(true);
      expect(validateWord('HELLO123', undefined, true)).toBe(true);
      expect(validateWord('A', undefined, true)).toBe(true);
      expect(validateWord('HELLO WORLD', undefined, true)).toBe(true);
    });

    it('should handle case insensitivity', () => {
      expect(validateWord('hello')).toBe(true);
      expect(validateWord('Hello')).toBe(true);
      expect(validateWord('HELLO')).toBe(true);
    });
  });

  describe('censorWord', () => {
    it('should return empty string for empty input', () => {
      expect(censorWord('')).toBe('');
    });

    it('should return uppercase word for valid input', () => {
      expect(censorWord('hello')).toBe('HELLO');
      expect(censorWord('WORLD')).toBe('WORLD');
    });

    it('should censor inappropriate words', () => {
      // Use a word that is actually profane according to the bad-words filter
      const censored = censorWord('ass');
      expect(censored).toBe('*'.repeat('ass'.length));
    });
  });

  describe('addWord', () => {
    it('should add words to common dictionary', () => {
      addWord('NEWWORD', 'common');
      expect(validateWord('NEWWORD')).toBe(true);
    });

    it('should add words to slang dictionary', () => {
      addWord('NEWSLANG', 'slang');
      expect(validateWord('NEWSLANG')).toBe(true);
    });

    it('should handle case insensitivity when adding words', () => {
      addWord('newword', 'common');
      expect(validateWord('NEWWORD')).toBe(true);
      expect(validateWord('newword')).toBe(true);
    });
  });

  describe('isInDictionary', () => {
    it('should check if word is in dictionary', () => {
      expect(isInDictionary('HELLO')).toBe(true);
      expect(isInDictionary('BRUH')).toBe(true);
      expect(isInDictionary('NOTAWORD')).toBe(false);
    });
  });

  describe('getWordLengthDifference', () => {
    it('should calculate length difference between words', () => {
      expect(getWordLengthDifference('HELLO', 'HELL')).toBe(1);
      expect(getWordLengthDifference('HELL', 'HELLO')).toBe(1);
      expect(getWordLengthDifference('HELLO', 'HELLO')).toBe(0);
      expect(getWordLengthDifference('HELLO', 'HEL')).toBe(2);
    });
  });
}); 