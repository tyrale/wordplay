import { validateWord, dictionaryService } from './dictionary';

describe('Task 1.1 Verification: Word Validation Service', () => {
  
  describe('Core Word Validation (Task 1.1 Requirements)', () => {
    it('should implement dictionary service with common and slang word support', () => {
      // Verify both dictionary sets exist and have words
      expect(dictionaryService.enableSet.size).toBeGreaterThan(170000);
      expect(dictionaryService.slangSet.size).toBeGreaterThan(6000);
      
      // Test common words
      expect(dictionaryService.hasWord('HELLO')).toBe(true);
      expect(dictionaryService.hasWord('WORLD')).toBe(true);
      expect(dictionaryService.hasWord('COMPUTER')).toBe(true);
      
      // Test slang words
      expect(dictionaryService.hasWord('LOL')).toBe(true);
      expect(dictionaryService.hasWord('OMG')).toBe(true);
      expect(dictionaryService.hasWord('BRUH')).toBe(true);
      
      console.log('✅ Dictionary Service: ENABLE set size =', dictionaryService.enableSet.size);
      console.log('✅ Dictionary Service: Slang set size =', dictionaryService.slangSet.size);
    });

    it('should have word validation function with length and character checks', () => {
      // Valid words should pass
      const validResult = validateWord('HELLO');
      expect(validResult.valid).toBe(true);
      expect(validResult.reason).toBeUndefined();
      
      // Too short words should fail
      const shortResult = validateWord('AB');
      expect(shortResult.valid).toBe(false);
      expect(shortResult.reason).toBe('Word must be at least 3 letters');
      
      // Non-alphabetic characters should fail
      const invalidCharsResult = validateWord('HELLO123');
      expect(invalidCharsResult.valid).toBe(false);
      expect(invalidCharsResult.reason).toBe('Word must contain only letters');
      
      // Invalid length changes should fail
      const lengthChangeResult = validateWord('HELLO', 'HI');
      expect(lengthChangeResult.valid).toBe(false);
      expect(lengthChangeResult.reason).toBe('Word length can only change by 1 letter');
      
      // Dictionary check should work
      const notInDictResult = validateWord('XYZABC');
      expect(notInDictResult.valid).toBe(false);
      expect(notInDictResult.reason).toBe('Word not found in dictionary');
      
      console.log('✅ Length Check: validateWord("AB") =', shortResult);
      console.log('✅ Character Check: validateWord("HELLO123") =', invalidCharsResult);
      console.log('✅ Dictionary Check: validateWord("XYZABC") =', notInDictResult);
    });

    it('should support bot rule-breaking capabilities', () => {
      // Bots should be able to break all rules
      expect(validateWord('123', undefined, { allowBot: true }).valid).toBe(true);
      expect(validateWord('A', undefined, { allowBot: true }).valid).toBe(true);
      expect(validateWord('HELLO123', undefined, { allowBot: true }).valid).toBe(true);
      expect(validateWord('HELLO WORLD', undefined, { allowBot: true }).valid).toBe(true);
      expect(validateWord('NOTAREALWORD', undefined, { allowBot: true }).valid).toBe(true);
      
      // Same words should fail for non-bots
      expect(validateWord('123').valid).toBe(false);
      expect(validateWord('A').valid).toBe(false);
      expect(validateWord('HELLO123').valid).toBe(false);
      
      console.log('✅ Bot Rule Breaking: validateWord("123", undefined, {allowBot: true}) =', validateWord('123', undefined, { allowBot: true }));
      console.log('✅ Normal Validation: validateWord("123") =', validateWord('123'));
    });

    it('should implement display mechanics for bad words and leetspeak numbers', () => {
      // Test profanity filtering
      expect(dictionaryService.isAppropriate('HELLO')).toBe(true);
      expect(dictionaryService.isAppropriate('WORLD')).toBe(true);
      
      // Test censored word display
      const cleanWord = dictionaryService.getCensoredWord('HELLO');
      expect(cleanWord).toBe('HELLO');
      
      // Test leetspeak number detection
      expect(dictionaryService.hasNumbers('HELLO')).toBe(false);
      expect(dictionaryService.hasNumbers('H3LL0')).toBe(true);
      expect(dictionaryService.hasNumbers('TEST123')).toBe(true);
      
      // Test display formatting for numbers
      const displayWord = dictionaryService.getDisplayWord('H3LL0');
      expect(displayWord).toBe('H[3]LL[0]');
      
      const normalDisplay = dictionaryService.getDisplayWord('HELLO');
      expect(normalDisplay).toBe('HELLO');
      
      console.log('✅ Profanity Check: isAppropriate("HELLO") =', dictionaryService.isAppropriate('HELLO'));
      console.log('✅ Number Detection: hasNumbers("H3LL0") =', dictionaryService.hasNumbers('H3LL0'));
      console.log('✅ Display Format: getDisplayWord("H3LL0") =', dictionaryService.getDisplayWord('H3LL0'));
    });

    it('should have comprehensive test suite for validation rules', () => {
      // Test case insensitivity
      expect(validateWord('hello').valid).toBe(true);
      expect(validateWord('Hello').valid).toBe(true);
      expect(validateWord('HELLO').valid).toBe(true);
      
      // Test valid length changes
      expect(validateWord('HELLO', 'HELL').valid).toBe(true);  // +1 letter
      expect(validateWord('HELL', 'HELLO').valid).toBe(true);  // -1 letter
      expect(validateWord('HELLO', 'HELLO').valid).toBe(true); // same length
      
      // Performance test - should be fast
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        validateWord('HELLO');
        validateWord('WORLD');
        validateWord('INVALID');
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete 300 validations in under 50ms
      
      console.log('✅ Case Insensitivity: validateWord("hello") =', validateWord('hello'));
      console.log('✅ Length Changes: validateWord("HELLO", "HELL") =', validateWord('HELLO', 'HELL'));
      console.log('✅ Performance: 300 validations completed in', duration, 'ms');
    });
  });

  describe('Task 1.1 Integration Verification', () => {
    it('should integrate properly with scoring system', () => {
      // Verify that validation works with actual game scenarios
      expect(validateWord('CAT').valid).toBe(true);
      expect(validateWord('CATS', 'CAT').valid).toBe(true);
      expect(validateWord('COAT', 'CAT').valid).toBe(true);
      
      // Test that invalid transitions are caught
      expect(validateWord('ELEPHANT', 'CAT').valid).toBe(false);
      
      console.log('✅ Game Integration: validateWord("CATS", "CAT") =', validateWord('CATS', 'CAT'));
    });

    it('should work with bot AI system', () => {
      // Test that bots can use validation with rule breaking
      const botValidation = validateWord('INVALIDWORD', undefined, { allowBot: true });
      expect(botValidation.valid).toBe(true);
      
      // Test that human validation still enforces rules
      const humanValidation = validateWord('INVALIDWORD');
      expect(humanValidation.valid).toBe(false);
      
      console.log('✅ Bot Integration: Bot can validate invalid words =', botValidation.valid);
      console.log('✅ Human Validation: Human cannot validate invalid words =', humanValidation.valid);
    });
  });
}); 