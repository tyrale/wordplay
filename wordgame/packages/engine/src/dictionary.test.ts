import { validateWord, dictionaryService, addWord, censorWord, getWordLengthDifference } from './dictionary';

describe('Dictionary Service', () => {
  describe('validateWord', () => {
    it('should validate common English words', () => {
      expect(validateWord('HELLO').valid).toBe(true);
      expect(validateWord('WORLD').valid).toBe(true);
      expect(validateWord('GAME').valid).toBe(true);
    });

    it('should validate slang words', () => {
      expect(validateWord('BRUH').valid).toBe(true);
      expect(validateWord('LOL').valid).toBe(true);
      expect(validateWord('OMG').valid).toBe(true);
    });

    it('should validate word length changes', () => {
      expect(validateWord('HELLO', 'HELL').valid).toBe(true);  // +1 letter
      expect(validateWord('HELL', 'HELLO').valid).toBe(true);  // -1 letter
      expect(validateWord('HELLO', 'HELLO').valid).toBe(true); // same length
    });

    it('should reject words with invalid length changes', () => {
      expect(validateWord('HELLO', 'HE').valid).toBe(false);   // +3 letters
      expect(validateWord('HE', 'HELLO').valid).toBe(false);   // -3 letters
    });

    it('should reject words that are too short', () => {
      expect(validateWord('HI').valid).toBe(false);
    });

    it('should allow bots to break rules', () => {
      expect(validateWord('123', undefined, { allowBot: true }).valid).toBe(true);
      expect(validateWord('HELLO123', undefined, { allowBot: true }).valid).toBe(true);
      expect(validateWord('A', undefined, { allowBot: true }).valid).toBe(true);
      expect(validateWord('HELLO WORLD', undefined, { allowBot: true }).valid).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(validateWord('hello').valid).toBe(true);
      expect(validateWord('Hello').valid).toBe(true);
      expect(validateWord('HELLO').valid).toBe(true);
    });

    it('should reject words not in dictionary', () => {
      expect(validateWord('XYZABC').valid).toBe(false);
      expect(validateWord('ZZQQXX').valid).toBe(false); // Use a definitely invalid word
    });

    it('should reject words with non-alphabetic characters for non-bots', () => {
      expect(validateWord('HELLO123').valid).toBe(false);
      expect(validateWord('HELLO WORLD').valid).toBe(false);
      expect(validateWord('HELLO-WORLD').valid).toBe(false);
    });
  });

  describe('dictionaryService', () => {
    it('should check if word exists in dictionary', () => {
      expect(dictionaryService.hasWord('HELLO')).toBe(true);
      expect(dictionaryService.hasWord('XYZABC')).toBe(false);
    });

    it('should check if word is appropriate', () => {
      expect(dictionaryService.isAppropriate('HELLO')).toBe(true);
      expect(dictionaryService.isAppropriate('WORLD')).toBe(true);
    });
  });

  describe('addWord', () => {
    it('should add new words to common dictionary', () => {
      addWord('NEWWORD', 'common');
      expect(validateWord('NEWWORD').valid).toBe(true);
    });

    it('should add new words to slang dictionary', () => {
      addWord('NEWSLANG', 'slang');
      expect(validateWord('NEWSLANG').valid).toBe(true);
    });
  });

  describe('censorWord', () => {
    it('should return word if not profane', () => {
      expect(censorWord('NEWWORD')).toBe('NEWWORD');
      expect(censorWord('newword')).toBe('NEWWORD');
    });
  });

  describe('getWordLengthDifference', () => {
    it('should calculate length difference correctly', () => {
      expect(getWordLengthDifference('HELLO', 'HELL')).toBe(1);
      expect(getWordLengthDifference('HELL', 'HELLO')).toBe(1);
      expect(getWordLengthDifference('HELLO', 'HELLO')).toBe(0);
    });
  });
}); 