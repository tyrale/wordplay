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
      // Add a comprehensive set of common words for browser environment
      const commonWords = [
        // Basic words
        'WORD', 'PLAY', 'GAME', 'TURN', 'MOVE', 'LOVE', 'LIFE', 'TIME', 'YEAR', 'WORK',
        'HAND', 'PART', 'CHILD', 'WORLD', 'PLACE', 'NUMBER', 'POINT', 'HOUSE', 'WATER',
        'MONEY', 'STORY', 'FACT', 'MONTH', 'LIGHT', 'NIGHT', 'RIGHT', 'STUDY', 'BOOK',
        'STATE', 'POWER', 'HOUR', 'BUSINESS', 'ISSUE', 'AREA', 'ROOM', 'FORM', 'MUSIC',
        'FIELD', 'HEALTH', 'VOICE', 'REASON', 'PEOPLE', 'FAMILY', 'STUDENT',
        'MOMENT', 'RESULT', 'CHANGE', 'MORNING', 'MARKET', 'GROUP', 'PROBLEM', 'SERVICE',
        'HELP', 'IDEA', 'INFORMATION', 'WAY', 'HEAD', 'MOTHER', 'FATHER', 'TEACHER',
        'OFFICE', 'PARTY', 'COMPANY', 'SYSTEM', 'PROGRAM', 'QUESTION', 'GOVERNMENT',
        'CASE', 'START', 'SCHOOL', 'COUNTRY', 'AMERICAN', 'FORCE', 'USE', 'OPEN',
        'PUBLIC', 'SUPPORT', 'ORDER', 'POLICY', 'BOARD', 'RATE', 'LEVEL', 'COMMUNITY',
        'DEVELOPMENT', 'NAME', 'TEAM', 'MINUTE', 'CHANCE', 'DETAIL', 'FOCUS',
        'ROLE', 'EFFORT', 'DECISION', 'GOAL', 'MATTER', 'ACTIVITY', 'CLASS', 'QUALITY',
        
        // Three letter words
        'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
        'OUR', 'HAD', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'LET', 'NEW',
        'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'GOT', 'MAN', 'PUT', 'SAY', 'SHE',
        'TOO', 'USE', 'WHY', 'ASK', 'BAD', 'BAG', 'BED', 'BIG', 'BOX', 'BUS', 'BUY', 'CAR',
        'CUP', 'CUT', 'DOG', 'EAR', 'EAT', 'END', 'EYE', 'FAR', 'FEW', 'FUN', 'GUN', 'HIT',
        'HOT', 'JOB', 'LAW', 'LEG', 'LET', 'LIE', 'LOT', 'LOW', 'MEN', 'MOM', 'OIL', 'PAY',
        'PEN', 'PET', 'POT', 'RUN', 'SIT', 'SIX', 'SUN', 'TAX', 'TEN', 'TOP', 'TRY', 'WAR',
        'WAY', 'WIN', 'YES', 'YET', 'ZOO', 'ACE', 'ADD', 'AGE', 'AGO', 'AID', 'AIM', 'AIR',
        'ART', 'ATE', 'BAR', 'BAT', 'BEE', 'BET', 'BIT', 'BOW', 'BOY', 'BUN', 'BUT', 'BUY',
        
        // Four letter words (common gameplay words)
        'ABLE', 'BACK', 'BALL', 'BASE', 'BEAT', 'BEEN', 'BEST', 'BLUE', 'BODY', 'BOOK',
        'BOTH', 'CALL', 'CAME', 'CARE', 'CASE', 'CITY', 'COME', 'COST', 'DATA', 'DAYS',
        'DEAL', 'DONE', 'DOWN', 'EACH', 'EVEN', 'EVER', 'FACE', 'FACT', 'FALL', 'FAST',
        'FEEL', 'FEET', 'FELT', 'FIND', 'FIRE', 'FIRM', 'FISH', 'FIVE', 'FORM', 'FOUR',
        'FREE', 'FROM', 'FULL', 'GAME', 'GAVE', 'GIVE', 'GOES', 'GOLD', 'GOOD', 'HAND',
        'HARD', 'HEAD', 'HEAR', 'HELD', 'HELP', 'HERE', 'HIGH', 'HOLD', 'HOME', 'HOPE',
        'HOUR', 'IDEA', 'INTO', 'ITEM', 'JUST', 'KEEP', 'KIND', 'KNEW', 'KNOW', 'LAND',
        'LAST', 'LATE', 'LEAD', 'LEFT', 'LIFE', 'LINE', 'LIVE', 'LONG', 'LOOK', 'LORD',
        'LOSE', 'LOST', 'LOVE', 'MADE', 'MAKE', 'MANY', 'MARK', 'MASS', 'MEAN', 'MEET',
        'MIND', 'MISS', 'MORE', 'MOST', 'MOVE', 'MUCH', 'MUST', 'NAME', 'NEAR', 'NEED',
        'NEXT', 'NICE', 'NOTE', 'ONCE', 'ONLY', 'OPEN', 'OVER', 'PAID', 'PART', 'PASS',
        'PAST', 'PATH', 'PLAN', 'PLAY', 'POOR', 'PUSH', 'PUTS', 'RACE', 'RATE', 'READ',
        'REAL', 'ROOM', 'RULE', 'SAID', 'SAME', 'SAVE', 'SEEK', 'SEEM', 'SELF', 'SELL',
        'SEND', 'SENT', 'SHOW', 'SIDE', 'SIZE', 'SOME', 'SOON', 'SORT', 'STOP', 'SUCH',
        'SURE', 'TAKE', 'TALK', 'TELL', 'TEST', 'THAN', 'THAT', 'THEM', 'THEN', 'THEY',
        'THIS', 'TIME', 'TOLD', 'TOOK', 'TREE', 'TRUE', 'TURN', 'TYPE', 'UNIT', 'UPON',
        'USED', 'VERY', 'WALK', 'WANT', 'WAYS', 'WEEK', 'WELL', 'WENT', 'WERE', 'WHAT',
        'WHEN', 'WILL', 'WIND', 'WITH', 'WORD', 'WORK', 'YEAR', 'YOUR',
        
        // Animal words
        'CAT', 'DOG', 'COW', 'PIG', 'RAT', 'BAT', 'BEE', 'ANT', 'FLY', 'OWL', 'FOX',
        'BEAR', 'DEER', 'FISH', 'BIRD', 'DUCK', 'GOAT', 'LAMB', 'LION', 'MICE', 'SEAL',
        'WOLF', 'FROG', 'CRAB', 'SNAIL', 'TIGER', 'HORSE', 'WHALE', 'SHARK', 'EAGLE',
        
        // Simple gameplay words
        'CAT', 'CATS', 'BAT', 'BATS', 'RAT', 'RATS', 'HAT', 'HATS', 'MAT', 'MATS',
        'COT', 'COTS', 'DOT', 'DOTS', 'HOT', 'HOTS', 'LOT', 'LOTS', 'NOT', 'NOTS',
        'POT', 'POTS', 'ROT', 'ROTS', 'SOT', 'SOTS', 'TOT', 'TOTS', 'GOT', 'GOTS',
        'CUT', 'CUTS', 'BUT', 'BUTS', 'HUT', 'HUTS', 'NUT', 'NUTS', 'GUT', 'GUTS',
        'JUT', 'JUTS', 'PUT', 'PUTS', 'RUT', 'RUTS', 'TUT', 'TUTS',
        
        // Boat words
        'BOAT', 'BOATS', 'COAT', 'COATS', 'GOAT', 'GOATS', 'MOAT', 'MOATS',
        'FLOAT', 'BLOAT', 'GLOAT', 'THROAT',
        
        // Heat words
        'HEAT', 'HEATS', 'MEAT', 'MEATS', 'NEAT', 'NEATS', 'PEAT', 'PEATS', 'BEAT', 'BEATS',
        'SEAT', 'SEATS', 'FEAT', 'FEATS', 'TREAT', 'TREATS', 'GREAT', 'GREATS',
        'WHEAT', 'SWEAT', 'CHEAT', 'PLEAT',
        
        // Hip words
        'SHIP', 'SHIPS', 'HIP', 'HIPS', 'LIP', 'LIPS', 'TIP', 'TIPS', 'RIP', 'RIPS',
        'DIP', 'DIPS', 'SIP', 'SIPS', 'ZIP', 'ZIPS', 'FLIP', 'FLIPS', 'SLIP', 'SLIPS',
        'TRIP', 'TRIPS', 'GRIP', 'GRIPS', 'DRIP', 'DRIPS', 'CHIP', 'CHIPS', 'WHIP', 'WHIPS',
        'SKIP', 'SKIPS', 'CLIP', 'CLIPS', 'SNIP', 'SNIPS',
        
        // Push words
        'PUSH', 'PUSHY', 'PULL', 'PULLS', 'FULL', 'BULL', 'DULL', 'HULL', 'LULL', 'MULL',
        'NULL', 'CULL', 'GULL',
        
        // Duck words
        'DUCK', 'DUCKS', 'LUCK', 'LUCKS', 'MUCK', 'MUCKS', 'PUCK', 'PUCKS', 'BUCK', 'BUCKS',
        'TUCK', 'TUCKS', 'SUCK', 'SUCKS', 'STUCK', 'CHUCK', 'CLUCK', 'PLUCK', 'TRUCK',
        
        // Lap words
        'LAPS', 'LAP', 'CAP', 'CAPS', 'GAP', 'GAPS', 'MAP', 'MAPS', 'NAP', 'NAPS',
        'RAP', 'RAPS', 'SAP', 'SAPS', 'TAP', 'TAPS', 'ZAP', 'ZAPS', 'CLAP', 'CLAPS',
        'SNAP', 'SNAPS', 'TRAP', 'TRAPS', 'WRAP', 'WRAPS', 'FLAP', 'FLAPS', 'SLAP', 'SLAPS',
        'CHAP', 'CHAPS', 'STRAP', 'SCRAP',
        
        // Food words
        'FOOD', 'BREAD', 'MEAT', 'MILK', 'EGG', 'EGGS', 'CAKE', 'PIE', 'RICE', 'SOUP',
        'FISH', 'BEEF', 'PORK', 'LAMB', 'BEAN', 'CORN', 'APPLE', 'PEAR', 'PLUM',
        
        // Common ending words
        'ABLE', 'IBLE', 'TION', 'SION', 'NESS', 'MENT', 'LING', 'RING', 'SING', 'WING',
        'KING', 'DING', 'PING', 'TING', 'MING', 'ZING', 'BRING', 'THING', 'SWING',
        
        // Action words
        'RUN', 'RUNS', 'WALK', 'WALKS', 'JUMP', 'JUMPS', 'SWIM', 'SWIMS', 'DANCE', 'DANCES',
        'SING', 'SINGS', 'TALK', 'TALKS', 'LOOK', 'LOOKS', 'HEAR', 'HEARS', 'FEEL', 'FEELS',
        'THINK', 'THINKS', 'KNOW', 'KNOWS', 'LEARN', 'LEARNS', 'TEACH', 'TEACHES',
        
        // Colors
        'RED', 'BLUE', 'GREEN', 'BLACK', 'WHITE', 'BROWN', 'PINK', 'GRAY', 'GREY',
        'ORANGE', 'YELLOW', 'PURPLE', 'VIOLET',
        
        // Numbers
        'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
        'ELEVEN', 'TWELVE', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY',
        'EIGHTY', 'NINETY', 'HUNDRED', 'THOUSAND',
        
        // Body parts
        'HEAD', 'HAIR', 'FACE', 'EYE', 'EYES', 'NOSE', 'MOUTH', 'TOOTH', 'TEETH', 'EAR',
        'EARS', 'NECK', 'HAND', 'HANDS', 'ARM', 'ARMS', 'LEG', 'LEGS', 'FOOT', 'FEET',
        'FINGER', 'THUMB', 'KNEE', 'ELBOW', 'SHOULDER', 'BACK', 'CHEST', 'HEART',
        
        // Common adjectives
        'BIG', 'SMALL', 'TALL', 'SHORT', 'LONG', 'WIDE', 'THIN', 'THICK', 'HEAVY', 'LIGHT',
        'FAST', 'SLOW', 'HOT', 'COLD', 'WARM', 'COOL', 'WET', 'DRY', 'CLEAN', 'DIRTY',
        'SOFT', 'HARD', 'SMOOTH', 'ROUGH', 'SHARP', 'DULL', 'BRIGHT', 'DARK', 'LOUD', 'QUIET',
        
        // Weather
        'SUN', 'RAIN', 'SNOW', 'WIND', 'CLOUD', 'CLOUDS', 'STORM', 'STORMS', 'THUNDER',
        'LIGHTNING', 'FOG', 'MIST', 'ICE', 'FROST', 'HEAT', 'COLD',
        
        // Technology words
        'COMPUTER', 'PHONE', 'EMAIL', 'INTERNET', 'WEBSITE', 'APP', 'CODE', 'DATA',
        'FILE', 'FILES', 'SCREEN', 'MOUSE', 'KEYBOARD', 'BUTTON', 'CLICK', 'TYPE',
        
        // Common verbs
        'GO', 'GOES', 'WENT', 'COME', 'COMES', 'CAME', 'SEE', 'SEES', 'SAW', 'HEAR',
        'HEARS', 'HEARD', 'SAY', 'SAYS', 'SAID', 'TELL', 'TELLS', 'TOLD', 'ASK', 'ASKS',
        'ASKED', 'GIVE', 'GIVES', 'GAVE', 'GET', 'GETS', 'GOT', 'TAKE', 'TAKES', 'TOOK',
        'MAKE', 'MAKES', 'MADE', 'DO', 'DOES', 'DID', 'HAVE', 'HAS', 'HAD', 'BE', 'IS',
        'ARE', 'WAS', 'WERE', 'BEEN', 'WILL', 'WOULD', 'CAN', 'COULD', 'MAY', 'MIGHT',
        'MUST', 'SHOULD', 'SHALL',
        
        // Transportation
        'CAR', 'CARS', 'BUS', 'BUSES', 'TRAIN', 'TRAINS', 'PLANE', 'PLANES', 'BIKE', 'BIKES',
        'BOAT', 'BOATS', 'SHIP', 'SHIPS', 'TRUCK', 'TRUCKS', 'TAXI', 'TAXIS',
        
        // Places
        'HOME', 'HOUSE', 'HOUSES', 'SCHOOL', 'SCHOOLS', 'WORK', 'OFFICE', 'OFFICES',
        'STORE', 'STORES', 'SHOP', 'SHOPS', 'PARK', 'PARKS', 'STREET', 'STREETS',
        'ROAD', 'ROADS', 'CITY', 'CITIES', 'TOWN', 'TOWNS', 'COUNTRY', 'COUNTRIES',
        
        // Time words
        'TIME', 'TIMES', 'DAY', 'DAYS', 'WEEK', 'WEEKS', 'MONTH', 'MONTHS', 'YEAR', 'YEARS',
        'HOUR', 'HOURS', 'MINUTE', 'MINUTES', 'SECOND', 'SECONDS', 'MORNING', 'AFTERNOON',
        'EVENING', 'NIGHT', 'NIGHTS', 'TODAY', 'TOMORROW', 'YESTERDAY', 'NOW', 'THEN',
        'SOON', 'LATE', 'EARLY', 'BEFORE', 'AFTER', 'DURING', 'WHILE'
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
  
  console.log('Dictionary validation:', { 
    word: normalizedWord, 
    isInDictionary, 
    isSlangWord,
    result: isInDictionary || isSlangWord ? 'VALID' : 'NOT FOUND'
  });
  
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