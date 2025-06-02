import { validateWord, dictionaryService, addWord, censorWord, getWordLengthDifference, getRandomWord, findAnagrams, getWordsByLength, areAnagrams } from './dictionary';

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

  // New comprehensive tests for Task 1.5
  describe('Full Dictionary Integration (Task 1.5)', () => {
    it('should have comprehensive ENABLE word list loaded', () => {
      // Verify the dictionary has a substantial word count (ENABLE word list)
      expect(dictionaryService.enableSet.size).toBeGreaterThan(170000);
      
      // Test some specific words that should be in ENABLE
      expect(dictionaryService.hasWord('AARDVARK')).toBe(true);
      expect(dictionaryService.hasWord('ZYGOTE')).toBe(true);
      expect(dictionaryService.hasWord('QUIXOTIC')).toBe(true);
    });

    it('should have slang word list loaded', () => {
      // Verify slang dictionary has words
      expect(dictionaryService.slangSet.size).toBeGreaterThan(6000);
      
      // Test specific slang terms
      expect(dictionaryService.hasWord('LOL')).toBe(true);
      expect(dictionaryService.hasWord('OMG')).toBe(true);
    });

    it('should generate random words of specified lengths', () => {
      const word4 = getRandomWord(4, 4);
      const word6 = getRandomWord(6, 6);
      const word8 = getRandomWord(8, 8);
      
      expect(word4.length).toBe(4);
      expect(word6.length).toBe(6);
      expect(word8.length).toBe(8);
      
      // All generated words should be valid
      expect(validateWord(word4).valid).toBe(true);
      expect(validateWord(word6).valid).toBe(true);
      expect(validateWord(word8).valid).toBe(true);
    });

    it('should find anagrams correctly', () => {
      const anagrams = findAnagrams('CAT');
      expect(anagrams).toContain('ACT');
      
      // Test anagram detection
      expect(areAnagrams('CAT', 'ACT')).toBe(true);
      expect(areAnagrams('LISTEN', 'SILENT')).toBe(true);
      expect(areAnagrams('CAT', 'DOG')).toBe(false);
    });

    it('should get words by length efficiently', () => {
      const words4 = getWordsByLength(4);
      const words6 = getWordsByLength(6);
      
      expect(words4.length).toBeGreaterThan(1000);
      expect(words6.length).toBeGreaterThan(5000);
      
      // All returned words should be the correct length
      words4.forEach(word => expect(word.length).toBe(4));
      words6.forEach(word => expect(word.length).toBe(6));
    });

    it('should handle edge cases properly', () => {
      // Test edge cases
      expect(getRandomWord(25, 25)).toBeDefined(); // Should return fallback or valid word
      expect(findAnagrams('ZZQQXX')).toEqual([]); // No anagrams for invalid word
      expect(getWordsByLength(1)).toEqual([]); // No single-letter words
    });

    it('should perform dictionary lookups efficiently', () => {
      const startTime = Date.now();
      
      // Test 1000 word lookups for performance
      for (let i = 0; i < 1000; i++) {
        dictionaryService.hasWord('HELLO');
        dictionaryService.hasWord('WORLD');
        dictionaryService.hasWord('INVALID');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 3000 lookups in under 100ms (performance benchmark)
      expect(duration).toBeLessThan(100);
    });
  });
}); 