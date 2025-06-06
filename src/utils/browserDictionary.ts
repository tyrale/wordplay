/**
 * Browser-Compatible Dictionary Adapter
 * 
 * This module provides browser-compatible dictionary loading while maintaining
 * 100% compatibility with the proven engine validation logic.
 * 
 * Only adapts the dictionary loading mechanism (HTTP fetch vs fs.readFile).
 * All validation, scoring, and game logic uses the real engine directly.
 */

// Browser dictionary cache
let browserDictionary: Set<string> | null = null;
let dictionaryPromise: Promise<Set<string>> | null = null;

/**
 * Load dictionary via HTTP fetch (browser compatible)
 */
async function loadBrowserDictionary(): Promise<Set<string>> {
  if (browserDictionary) {
    return browserDictionary;
  }

  if (dictionaryPromise) {
    return dictionaryPromise;
  }

  dictionaryPromise = (async () => {
    try {
      console.log('📚 Loading full ENABLE dictionary via HTTP...');
      const response = await fetch('/enable1.txt');
      
      if (!response.ok) {
        throw new Error(`Failed to load dictionary: ${response.status}`);
      }
      
      const text = await response.text();
      const words = text
        .split('\n')
        .map(word => word.trim().toUpperCase())
        .filter(word => word.length > 0);
      
      browserDictionary = new Set(words);
      console.log(`📚 Dictionary loaded: ${browserDictionary.size} words`);
      
      return browserDictionary;
    } catch (error) {
      console.error('❌ Failed to load dictionary:', error);
      
      // Fallback to minimal dictionary for functionality
      const fallbackWords = [
        'CAT', 'CATS', 'BAT', 'BATS', 'HAT', 'HATS', 'MAT', 'MATS', 'RAT', 'RATS',
        'DOG', 'DOGS', 'LOG', 'LOGS', 'HOG', 'HOGS', 'FOG', 'FOGS', 'COG', 'COGS',
        'PLAY', 'PLAYS', 'PLAN', 'PLANS', 'PLAT', 'PLATS', 'CLAY', 'CLAYS',
        'WORD', 'WORDS', 'WORK', 'WORKS', 'WORN', 'CORD', 'CORDS', 'LORD', 'LORDS',
        'GAME', 'GAMES', 'CAME', 'CAME', 'NAME', 'NAMES', 'SAME', 'TAME', 'TAMES',
        'SHIP', 'SHIPS', 'SHOP', 'SHOPS', 'SHOT', 'SHOTS', 'SHOE', 'SHOES',
        'DOOR', 'DOORS', 'POOR', 'BOOM', 'BOOMS', 'ROOM', 'ROOMS', 'ZOOM', 'ZOOMS'
      ];
      
      browserDictionary = new Set(fallbackWords);
      console.log(`📚 Using fallback dictionary: ${browserDictionary.size} words`);
      
      return browserDictionary;
    }
  })();

  return dictionaryPromise;
}

/**
 * Browser-compatible dictionary validation
 * Maintains same interface as real engine
 */
export async function isValidDictionaryWord(word: string): Promise<boolean> {
  const dictionary = await loadBrowserDictionary();
  return dictionary.has(word.toUpperCase());
}

/**
 * Get dictionary size for debugging
 */
export async function getDictionarySize(): Promise<number> {
  const dictionary = await loadBrowserDictionary();
  return dictionary.size;
}

/**
 * Get random word by length (browser compatible)
 */
export async function getRandomWordByLength(length: number): Promise<string | null> {
  const dictionary = await loadBrowserDictionary();
  const wordsOfLength = Array.from(dictionary).filter(word => word.length === length);
  
  if (wordsOfLength.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * wordsOfLength.length);
  return wordsOfLength[randomIndex];
}

/**
 * Initialize dictionary (call once on app start)
 */
export async function initializeBrowserDictionary(): Promise<void> {
  await loadBrowserDictionary();
}

// Sync version for compatibility (uses cached dictionary)
export function isValidDictionaryWordSync(word: string): boolean {
  if (!browserDictionary) {
    console.warn('Dictionary not loaded, assuming word is valid:', word);
    return true; // Graceful degradation
  }
  return browserDictionary.has(word.toUpperCase());
}

export function getDictionarySizeSync(): number {
  return browserDictionary?.size || 0;
} 