/**
 * Browser-Compatible Dictionary Service
 * 
 * This provides the same interface as the Node.js dictionary service
 * but works in browser environments by loading the ENABLE dictionary
 * from the public assets.
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
  private loading = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.initializeDictionary();
  }

  private async initializeDictionary() {
    if (this.initialized || this.loading) return this.loadPromise;
    
    this.loading = true;
    this.loadPromise = this.loadDictionaries();
    return this.loadPromise;
  }

  private async loadDictionaries() {
    try {
      // Load ENABLE dictionary from public assets
      await this.loadEnableDictionary();
      
      // Add slang words
      this.loadSlangWords();
      
      // Add profanity words
      this.loadProfanityWords();
      
      this.initialized = true;
      this.loading = false;
      console.log(`✅ Dictionary loaded: ${this.enableWords.size} words available`);
    } catch (error) {
      console.warn('Failed to load full dictionary, falling back to basic word set:', error);
      this.loadFallbackWords();
      this.initialized = true;
      this.loading = false;
    }
  }

  private async loadEnableDictionary() {
    try {
      // Try to load from the packages/engine directory (development)
      let response = await fetch('/packages/engine/enable1.txt');
      
      if (!response.ok) {
        // Try alternative path (production build)
        response = await fetch('/enable1.txt');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const words = text.trim().split('\n');
      
      // Add all words to the ENABLE set
      words.forEach(word => {
        const cleanWord = word.trim().toUpperCase();
        if (cleanWord.length >= 2) { // Only words 2+ characters
          this.enableWords.add(cleanWord);
        }
      });
      
      console.log(`✅ ENABLE dictionary loaded: ${words.length} words`);
    } catch (error) {
      console.warn('Could not load ENABLE dictionary file:', error);
      throw error;
    }
  }

  private loadSlangWords() {
    const slangWords = [
      'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG',
      'VLOG', 'WIFI', 'UBER', 'GOOGLE', 'TWEET', 'UNFRIEND', 'HASHTAG',
      'PHOTOBOMB', 'MANSPLAIN', 'GHOSTING', 'CATFISH', 'TROLL', 'MEME',
      'VIRAL', 'CLICKBAIT', 'SPAM', 'PHISHING', 'MALWARE', 'AVATAR',
      'NOOB', 'PWNED', 'EPIC', 'FAIL', 'WIN', 'OWNED', 'LEET', 'HAXOR',
      'APP', 'APPS', 'TECH', 'CRYPTO', 'BLOCKCHAIN', 'NFT', 'NFTS',
      'ZOOM', 'FACETIME', 'NETFLIX', 'YOUTUBE', 'TIKTOK', 'INSTAGRAM',
      'FACEBOOK', 'TWITTER', 'REDDIT', 'DISCORD', 'TWITCH', 'SPOTIFY'
    ];
    
    slangWords.forEach(word => this.slangWords.add(word.toUpperCase()));
  }

  private loadProfanityWords() {
    const profanityWords = [
      'DAMN', 'HELL', 'CRAP', 'PISS', 'SUCK', 'BITCH', 'BASTARD', 'ASSHOLE',
      'SHIT', 'FUCK', 'PUSSY', 'COCK', 'DICK', 'PENIS', 'VAGINA', 'BOOB',
      'BOOBS', 'TITS', 'ASS', 'BUTT', 'FART', 'POOP', 'SEXY', 'NUDE'
    ];
    
    profanityWords.forEach(word => this.profanityWords.add(word.toUpperCase()));
  }

  private loadFallbackWords() {
    // Minimal fallback word set for when dictionary loading fails
    const fallbackWords = [
      // Essential gameplay words
      'CAT', 'CATS', 'BAT', 'BATS', 'RAT', 'RATS', 'HAT', 'HATS', 'MAT', 'MATS',
      'BOAT', 'BOATS', 'COAT', 'COATS', 'GOAT', 'GOATS', 'MOAT', 'MOATS',
      'HEAT', 'HEATS', 'MEAT', 'MEATS', 'NEAT', 'NEATS', 'PEAT', 'PEATS', 'BEAT', 'BEATS',
      'SHIP', 'SHIPS', 'HIP', 'HIPS', 'LIP', 'LIPS', 'TIP', 'TIPS', 'RIP', 'RIPS',
      'PUSH', 'PULL', 'FULL', 'BULL', 'DUCK', 'DUCKS', 'LUCK', 'LUCKS',
      'LAPS', 'LAP', 'SLIP', 'SLIPS', 'PLAY', 'GAME', 'TURN', 'MOVE', 'WORD',
      
      // Basic words
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
      'OUR', 'HAD', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'LET', 'NEW',
      'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'GOT', 'MAN', 'PUT', 'SAY', 'SHE',
      'TOO', 'USE', 'WHY', 'ASK', 'BAD', 'BAG', 'BED', 'BIG', 'BOX', 'BUS', 'BUY', 'CAR',
      'CUP', 'CUT', 'DOG', 'EAR', 'EAT', 'END', 'EYE', 'FAR', 'FEW', 'FUN', 'GUN', 'HIT',
      'HOT', 'JOB', 'LAW', 'LEG', 'LET', 'LIE', 'LOT', 'LOW', 'MEN', 'MOM', 'OIL', 'PAY',
      'PEN', 'PET', 'POT', 'RUN', 'SIT', 'SIX', 'SUN', 'TAX', 'TEN', 'TOP', 'TRY', 'WAR',
      'WAY', 'WIN', 'YES', 'YET', 'ZOO',
      
      // Four letter words
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
      'WHEN', 'WILL', 'WIND', 'WITH', 'WORD', 'WORK', 'YEAR', 'YOUR'
    ];
    
    fallbackWords.forEach(word => this.enableWords.add(word.toUpperCase()));
    console.log(`⚠️ Using fallback dictionary: ${fallbackWords.length} words`);
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }
    await this.initializeDictionary();
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
    
    // Replace letters with symbols while preserving length and shape
    return word.split('').map((char, index) => {
      if (index === 0) return char; // Keep first letter
      return Math.random() > 0.5 ? '*' : '#';
    }).join('');
  }

  public getWordCount(): number {
    return this.enableWords.size + this.slangWords.size;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getRandomWordByLength(length: number): string | null {
    const words = Array.from(this.enableWords).filter(word => word.length === length);
    if (words.length === 0) return null;
    return words[Math.floor(Math.random() * words.length)];
  }

  public getRandomWordsByLength(length: number, count: number = 1): string[] {
    const words = Array.from(this.enableWords).filter(word => word.length === length);
    if (words.length === 0) return [];
    
    const result: string[] = [];
    for (let i = 0; i < count && i < words.length; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      const word = words[randomIndex];
      if (!result.includes(word)) {
        result.push(word);
      } else {
        i--; // Try again if duplicate
      }
    }
    return result;
  }
}

// Global dictionary instance
const dictionary = new BrowserWordDictionary();

// Main validation function
export async function validateWord(word: string, options: ValidationOptions = {}): Promise<ValidationResult> {
  // Ensure dictionary is loaded
  await dictionary.ensureInitialized();
  
  const {
    isBot = false,
    allowSlang = true,
    allowProfanity = true,
    checkLength = true,
    previousWord = undefined
  } = options;

  // Normalize input
  const normalizedWord = word.trim().toUpperCase();
  
  // Basic validation
  if (!normalizedWord) {
    return {
      isValid: false,
      reason: 'Word cannot be empty',
      word: normalizedWord
    };
  }

  // For bots, skip most validation (they can break rules)
  if (isBot) {
    return {
      isValid: true,
      reason: 'Bot move (validation bypassed)',
      word: normalizedWord
    };
  }

  // Length validation
  if (checkLength && normalizedWord.length < 3) {
    return {
      isValid: false,
      reason: 'Word must be at least 3 letters long',
      word: normalizedWord
    };
  }

  // Character validation (humans only)
  if (!/^[A-Z]+$/.test(normalizedWord)) {
    return {
      isValid: false,
      reason: 'Word must contain only letters',
      word: normalizedWord
    };
  }

  // Length change validation (humans only)
  if (previousWord && checkLength) {
    const lengthDifference = Math.abs(normalizedWord.length - previousWord.length);
    if (lengthDifference > 1) {
      return {
        isValid: false,
        reason: 'Word length can only change by 1 letter at a time',
        word: normalizedWord
      };
    }
  }

  // Dictionary lookup
  const isInEnable = dictionary.isInEnable(normalizedWord);
  const isSlangWord = dictionary.isSlang(normalizedWord);
  const isProfane = dictionary.isProfanity(normalizedWord);

  // Check if word exists in any dictionary
  if (!isInEnable && !isSlangWord) {
    return {
      isValid: false,
      reason: 'Word not found in dictionary',
      word: normalizedWord
    };
  }

  // Handle slang words
  if (isSlangWord && !allowSlang) {
    return {
      isValid: false,
      reason: 'Slang words not allowed in this game mode',
      word: normalizedWord
    };
  }

  // Handle profanity (note: profane words are still valid for gameplay)
  if (isProfane && !allowProfanity) {
    return {
      isValid: false,
      reason: 'Profanity not allowed in this game mode',
      word: normalizedWord,
      censored: dictionary.censorWord(normalizedWord)
    };
  }

  // Word is valid
  return {
    isValid: true,
    word: normalizedWord,
    censored: isProfane ? dictionary.censorWord(normalizedWord) : undefined
  };
}

// Synchronous wrapper for backward compatibility (will use cached results)
export function validateWordSync(word: string, options: ValidationOptions = {}): ValidationResult {
  if (!dictionary.isInitialized()) {
    console.warn('Dictionary not yet loaded, validation may be incomplete');
    // Return basic validation for unloaded dictionary
    const normalizedWord = word.trim().toUpperCase();
    if (!normalizedWord) {
      return { isValid: false, reason: 'Word cannot be empty', word: normalizedWord };
    }
    if (normalizedWord.length < 3) {
      return { isValid: false, reason: 'Word must be at least 3 letters long', word: normalizedWord };
    }
    if (!/^[A-Z]+$/.test(normalizedWord)) {
      return { isValid: false, reason: 'Word must contain only letters', word: normalizedWord };
    }
    // Assume valid if dictionary not loaded
    return { isValid: true, word: normalizedWord };
  }

  // Dictionary is loaded, perform full validation synchronously
  const {
    isBot = false,
    allowSlang = true,
    allowProfanity = true,
    checkLength = true,
    previousWord = undefined
  } = options;

  const normalizedWord = word.trim().toUpperCase();
  
  if (!normalizedWord) {
    return { isValid: false, reason: 'Word cannot be empty', word: normalizedWord };
  }

  if (isBot) {
    return { isValid: true, reason: 'Bot move (validation bypassed)', word: normalizedWord };
  }

  if (checkLength && normalizedWord.length < 3) {
    return { isValid: false, reason: 'Word must be at least 3 letters long', word: normalizedWord };
  }

  if (!/^[A-Z]+$/.test(normalizedWord)) {
    return { isValid: false, reason: 'Word must contain only letters', word: normalizedWord };
  }

  if (previousWord && checkLength) {
    const lengthDifference = Math.abs(normalizedWord.length - previousWord.length);
    if (lengthDifference > 1) {
      return { isValid: false, reason: 'Word length can only change by 1 letter at a time', word: normalizedWord };
    }
  }

  const isInEnable = dictionary.isInEnable(normalizedWord);
  const isSlangWord = dictionary.isSlang(normalizedWord);
  const isProfane = dictionary.isProfanity(normalizedWord);

  if (!isInEnable && !isSlangWord) {
    return { isValid: false, reason: 'Word not found in dictionary', word: normalizedWord };
  }

  if (isSlangWord && !allowSlang) {
    return { isValid: false, reason: 'Slang words not allowed in this game mode', word: normalizedWord };
  }

  if (isProfane && !allowProfanity) {
    return { isValid: false, reason: 'Profanity not allowed in this game mode', word: normalizedWord, censored: dictionary.censorWord(normalizedWord) };
  }

  return {
    isValid: true,
    word: normalizedWord,
    censored: isProfane ? dictionary.censorWord(normalizedWord) : undefined
  };
}

// Legacy compatibility functions
export function isValidDictionaryWord(word: string): boolean {
  return validateWordSync(word).isValid;
}

export function isSlangWord(word: string): boolean {
  return dictionary.isSlang(word);
}

export function containsProfanity(word: string): boolean {
  return dictionary.isProfanity(word);
}

export function getDictionarySize(): number {
  return dictionary.getWordCount();
}

export function getRandomWordByLength(length: number): string | null {
  return dictionary.getRandomWordByLength(length);
}

export function getRandomWordsByLength(length: number, count: number = 1): string[] {
  return dictionary.getRandomWordsByLength(length, count);
}

export async function initializeDictionary(): Promise<void> {
  return dictionary.ensureInitialized();
}

export function isDictionaryLoaded(): boolean {
  return dictionary.isInitialized();
}

export function performanceTest(iterations = 1000): { averageTime: number; totalTime: number } {
  const testWords = ['HELLO', 'WORLD', 'GAME', 'PLAY', 'WORD', 'TEST', 'FAST', 'QUICK'];
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const word = testWords[i % testWords.length];
    validateWordSync(word);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  return {
    averageTime: totalTime / iterations,
    totalTime
  };
}

// Vanity system (for profanity display)
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
  
  // Always show real word when editing
  if (isEditing) return word;
  
  // Only apply vanity filter if toggle is unlocked and filter is on
  if (vanityState.hasUnlockedToggle && vanityState.isVanityFilterOn) {
    if (dictionary.isProfanity(word)) {
      return transformToSymbols(word);
    }
  }
  
  return word;
}

function transformToSymbols(word: string): string {
  const symbols = ['%', '#', '^', '&', '*', '@'];
  return word.split('').map(() => symbols[Math.floor(Math.random() * symbols.length)]).join('');
}

export function shouldUnlockVanityToggle(word: string): boolean {
  return dictionary.isProfanity(word);
}

export function isCurrentWordProfane(word: string): boolean {
  return dictionary.isProfanity(word);
}

export function censorProfanity(word: string): string {
  return dictionary.censorWord(word);
} 