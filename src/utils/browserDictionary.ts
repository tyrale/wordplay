/**
 * Browser-Compatible Dictionary Service
 * 
 * This provides the same interface as the Node.js dictionary service
 * but works in browser environments without fs/path dependencies.
 */

// Types for validation
export interface ValidationOptions {
  isBot?: boolean;
  allowSlang?: boolean;
  allowProfanity?: boolean;
  checkLength?: boolean;
  previousWord?: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  word: string;
  censored?: string;
}

// Browser-compatible word dictionary
class BrowserWordDictionary {
  private enableWords: Set<string> = new Set();
  private slangWords: Set<string> = new Set();
  private profanityWords: Set<string> = new Set();
  private initialized = false;

  constructor() {
    this.initializeDictionary();
  }

  private initializeDictionary() {
    if (this.initialized) return;

    try {
      // Add a basic set of common words for browser environment
      // In a real application, you'd load this from a static asset or API
      const commonWords = [
        'WORD', 'PLAY', 'GAME', 'TURN', 'MOVE', 'LOVE', 'LIFE', 'TIME', 'YEAR', 'WORK',
        'HAND', 'PART', 'CHILD', 'WORLD', 'PLACE', 'NUMBER', 'POINT', 'HOUSE', 'WATER',
        'MONEY', 'STORY', 'FACT', 'MONTH', 'LIGHT', 'NIGHT', 'RIGHT', 'STUDY', 'BOOK',
        'STATE', 'POWER', 'HOUR', 'BUSINESS', 'ISSUE', 'AREA', 'ROOM', 'FORM', 'MUSIC',
        'FIELD', 'MONEY', 'HEALTH', 'VOICE', 'REASON', 'PEOPLE', 'FAMILY', 'STUDENT',
        'MOMENT', 'RESULT', 'CHANGE', 'MORNING', 'MARKET', 'GROUP', 'PROBLEM', 'SERVICE',
        'HELP', 'IDEA', 'INFORMATION', 'WAY', 'HEAD', 'MOTHER', 'FATHER', 'TEACHER',
        'OFFICE', 'PARTY', 'COMPANY', 'SYSTEM', 'PROGRAM', 'QUESTION', 'GOVERNMENT',
        'CASE', 'START', 'SCHOOL', 'COUNTRY', 'AMERICAN', 'FORCE', 'USE', 'OPEN',
        'PUBLIC', 'SUPPORT', 'ORDER', 'POLICY', 'BOARD', 'RATE', 'LEVEL', 'COMMUNITY',
        'DEVELOPMENT', 'NAME', 'TEAM', 'MINUTE', 'IDEA', 'CHANCE', 'DETAIL', 'FOCUS',
        'ROLE', 'EFFORT', 'DECISION', 'GOAL', 'MATTER', 'ACTIVITY', 'CLASS', 'QUALITY',
        // Words for gameplay
        'CAT', 'CATS', 'BAT', 'BATS', 'RAT', 'RATS', 'HAT', 'HATS', 'MAT', 'MATS',
        'COT', 'COTS', 'DOT', 'DOTS', 'HOT', 'HOTS', 'LOT', 'LOTS', 'NOT', 'NOTS',
        'POT', 'POTS', 'ROT', 'ROTS', 'SOT', 'SOTS', 'TOT', 'TOTS', 'GOT', 'GOTS',
        'BOAT', 'BOATS', 'COAT', 'COATS', 'GOAT', 'GOATS', 'MOAT', 'MOATS',
        'HEAT', 'HEATS', 'MEAT', 'MEATS', 'NEAT', 'NEATS', 'PEAT', 'PEATS', 'BEAT', 'BEATS',
        'SEAT', 'SEATS', 'FEAT', 'FEATS', 'TREAT', 'TREATS', 'GREAT', 'GREATS',
        'SHIP', 'SHIPS', 'HIP', 'HIPS', 'LIP', 'LIPS', 'TIP', 'TIPS', 'RIP', 'RIPS',
        'DIP', 'DIPS', 'SIP', 'SIPS', 'ZIP', 'ZIPS', 'FLIP', 'FLIPS', 'SLIP', 'SLIPS',
        'TRIP', 'TRIPS', 'GRIP', 'GRIPS', 'DRIP', 'DRIPS', 'CHIP', 'CHIPS', 'WHIP', 'WHIPS',
        'PUSH', 'PUSHY', 'PULL', 'PULLS', 'DUCK', 'DUCKS', 'LUCK', 'LUCKS', 'MUCK', 'MUCKS',
        'PUCK', 'PUCKS', 'BUCK', 'BUCKS', 'TUCK', 'TUCKS', 'SUCK', 'SUCKS', 'STUCK',
        'LAPS', 'LAP', 'CAP', 'CAPS', 'GAP', 'GAPS', 'MAP', 'MAPS', 'NAP', 'NAPS',
        'RAP', 'RAPS', 'SAP', 'SAPS', 'TAP', 'TAPS', 'ZAP', 'ZAPS', 'CLAP', 'CLAPS',
        'SNAP', 'SNAPS', 'TRAP', 'TRAPS', 'WRAP', 'WRAPS', 'FLAP', 'FLAPS', 'SLAP', 'SLAPS'
      ];
      
      commonWords.forEach(word => this.enableWords.add(word.toUpperCase()));

      // Add common slang words that are acceptable in casual play
      const slangWords = [
        'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG',
        'VLOG', 'WIFI', 'UBER', 'GOOGLE', 'TWEET', 'UNFRIEND', 'HASHTAG',
        'PHOTOBOMB', 'MANSPLAIN', 'GHOSTING', 'CATFISH', 'TROLL', 'MEME',
        'VIRAL', 'CLICKBAIT', 'SPAM', 'PHISHING', 'MALWARE', 'AVATAR',
        'NOOB', 'PWNED', 'EPIC', 'FAIL', 'WIN', 'OWNED', 'LEET', 'HAXOR'
      ];
      slangWords.forEach(word => this.slangWords.add(word.toUpperCase()));

      // Basic profanity list (used for vanity display only)
      const profanityWords = [
        'DAMN', 'HELL', 'CRAP', 'PISS', 'SHIT', 'FUCK', 'BITCH', 'ASSHOLE',
        'BASTARD', 'WHORE', 'SLUT', 'FART', 'POOP', 'BUTT', 'ASS'
      ];
      profanityWords.forEach(word => this.profanityWords.add(word.toUpperCase()));

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize browser dictionary:', error);
      // Graceful fallback - still allow basic validation
      this.initialized = true;
    }
  }

  public isInEnable(word: string): boolean {
    return this.enableWords.has(word.toUpperCase());
  }

  public isSlang(word: string): boolean {
    return this.slangWords.has(word.toUpperCase());
  }

  public isProfanity(word: string): boolean {
    return this.profanityWords.has(word.toUpperCase());
  }

  public censorWord(word: string): string {
    if (!this.isProfanity(word)) return word;
    
    const upperWord = word.toUpperCase();
    const firstChar = upperWord[0];
    const lastChar = upperWord[upperWord.length - 1];
    const middle = '*'.repeat(Math.max(0, upperWord.length - 2));
    
    return firstChar + middle + lastChar;
  }

  public getWordCount(): number {
    return this.enableWords.size;
  }

  /**
   * Get a random word of specified length from the dictionary
   */
  public getRandomWordByLength(length: number): string | null {
    const wordsOfLength = Array.from(this.enableWords).filter(word => word.length === length);
    
    if (wordsOfLength.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * wordsOfLength.length);
    return wordsOfLength[randomIndex];
  }

  /**
   * Get multiple random words of specified length
   */
  public getRandomWordsByLength(length: number, count: number = 1): string[] {
    const wordsOfLength = Array.from(this.enableWords).filter(word => word.length === length);
    
    if (wordsOfLength.length === 0) {
      return [];
    }
    
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * wordsOfLength.length);
      result.push(wordsOfLength[randomIndex]);
    }
    
    return result;
  }
}

// Singleton dictionary instance
const dictionary = new BrowserWordDictionary();

/**
 * Validates a word according to game rules (browser version)
 */
export function validateWord(word: string, options: ValidationOptions = {}): ValidationResult {
  const {
    isBot = false,
    allowSlang = true,
    checkLength = true,
    previousWord
  } = options;

  // Handle null/undefined gracefully
  if (word == null) {
    return {
      isValid: false,
      reason: 'Word cannot be empty',
      word: ''
    };
  }

  const normalizedWord = word.trim().toUpperCase();

  // Bots can bypass all validation rules - early return
  if (isBot) {
    return {
      isValid: true,
      word: normalizedWord
    };
  }

  // Early validation: empty or invalid characters
  if (!normalizedWord) {
    return {
      isValid: false,
      reason: 'Word cannot be empty',
      word: normalizedWord
    };
  }

  // Character validation (alphabetic only for humans)
  if (!/^[A-Z]+$/.test(normalizedWord)) {
    return {
      isValid: false,
      reason: 'Word must contain only alphabetic characters',
      word: normalizedWord
    };
  }

  // Length validation (minimum 3 letters)
  if (checkLength && normalizedWord.length < 3) {
    return {
      isValid: false,
      reason: 'Word must be at least 3 letters long',
      word: normalizedWord
    };
  }

  // Length change validation (max ±1 letter difference between turns)
  if (previousWord && checkLength) {
    const lengthDiff = Math.abs(normalizedWord.length - previousWord.length);
    if (lengthDiff > 1) {
      return {
        isValid: false,
        reason: `Word length can only change by 1 letter (was ${previousWord.length}, now ${normalizedWord.length})`,
        word: normalizedWord
      };
    }
  }

  // Dictionary validation - check if word exists in our dictionaries
  const isInDictionary = dictionary.isInEnable(normalizedWord);
  const isSlangWord = allowSlang && dictionary.isSlang(normalizedWord);
  
  if (!isInDictionary && !isSlangWord) {
    return {
      isValid: false,
      reason: 'Word not found in dictionary',
      word: normalizedWord
    };
  }

  // If we get here, the word is valid
  return {
    isValid: true,
    word: normalizedWord,
    censored: dictionary.censorWord(normalizedWord)
  };
}

/**
 * Check if a word is in the main dictionary
 */
export function isValidDictionaryWord(word: string): boolean {
  return dictionary.isInEnable(word);
}

/**
 * Check if a word is considered slang
 */
export function isSlangWord(word: string): boolean {
  return dictionary.isSlang(word);
}

/**
 * Check if a word contains profanity
 */
export function containsProfanity(word: string): boolean {
  return dictionary.isProfanity(word);
}

/**
 * Get the total number of words in the dictionary
 */
export function getDictionarySize(): number {
  return dictionary.getWordCount();
}

/**
 * Get a random word of specified length from the dictionary
 */
export function getRandomWordByLength(length: number): string | null {
  return dictionary.getRandomWordByLength(length);
}

/**
 * Get multiple random words of specified length
 */
export function getRandomWordsByLength(length: number, count: number = 1): string[] {
  return dictionary.getRandomWordsByLength(length, count);
}

/**
 * Performance test function
 */
export function performanceTest(iterations = 1000): { averageTime: number; totalTime: number } {
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    validateWord('TEST');
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  return {
    averageTime: totalTime / iterations,
    totalTime
  };
}

// Vanity system interfaces and functions
export interface VanityState {
  hasUnlockedToggle: boolean;
  isVanityFilterOn: boolean;
}

export interface VanityDisplayOptions {
  vanityState: VanityState;
  isEditing?: boolean;
}

export function getVanityDisplayWord(
  word: string, 
  options: VanityDisplayOptions
): string {
  const { vanityState, isEditing = false } = options;
  
  if (!vanityState.hasUnlockedToggle || !vanityState.isVanityFilterOn || isEditing) {
    return word;
  }
  
  if (dictionary.isProfanity(word)) {
    return transformToSymbols(word);
  }
  
  return word;
}

function transformToSymbols(word: string): string {
  const symbols = ['%', '#', '^', '&', '*'];
  return word.split('').map(() => 
    symbols[Math.floor(Math.random() * symbols.length)]
  ).join('');
}

export function shouldUnlockVanityToggle(word: string): boolean {
  return word.toUpperCase() === 'DAMN';
}

export function isCurrentWordProfane(word: string): boolean {
  return dictionary.isProfanity(word);
}

export function censorProfanity(word: string): string {
  return dictionary.censorWord(word);
} 