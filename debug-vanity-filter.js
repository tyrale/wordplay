/**
 * Debug script for testing vanity filter in browser console
 * 
 * Run this in the browser console at localhost:5173 to test vanity filtering
 */

console.log('🎭 Testing Vanity Filter System');

// Test profanity detection
async function testProfanityDetection() {
  try {
    // Load profanity words
    const response = await fetch('/data/profanity-words.json');
    const data = await response.json();
    
    console.log(`📚 Profanity words loaded: ${data.words.length} words`);
    console.log(`🔍 Checking if "SHIT" is in list:`, data.words.includes('SHIT'));
    console.log(`🔍 Checking if "HELLO" is in list:`, data.words.includes('HELLO'));
    
    // Show first few profane words
    console.log('📝 First 10 profane words:', data.words.slice(0, 10));
    
    return data.words;
  } catch (error) {
    console.error('❌ Error loading profanity words:', error);
  }
}

// Test vanity filter function from dictionary
async function testVanityFilter() {
  try {
    // Import the dictionary module (if available globally)
    if (typeof window !== 'undefined' && window.dictionary) {
      const { getVanityDisplayWord, shouldUnlockVanityToggle } = window.dictionary;
      
      const testWords = ['HELLO', 'SHIT', 'DAMN', 'WORLD'];
      
      testWords.forEach(word => {
        const shouldUnlock = shouldUnlockVanityToggle(word);
        console.log(`🔓 Word "${word}" should unlock vanity:`, shouldUnlock);
        
        const displayWord = getVanityDisplayWord(word, {
          vanityState: { hasUnlockedToggle: false, isVanityFilterOn: true }
        });
        console.log(`👁️  Word "${word}" displays as:`, displayWord);
      });
    } else {
      console.warn('⚠️  Dictionary functions not available globally');
    }
  } catch (error) {
    console.error('❌ Error testing vanity filter:', error);
  }
}

// Test React hook (if available)
function testReactHook() {
  console.log('🪝 To test React hook, type "SHIT" in the game and see if it gets censored');
  console.log('🎮 Expected behavior:');
  console.log('   - New user: "SHIT" should display as "!@#$"');
  console.log('   - After unlock: User can toggle filter on/off');
}

// Run tests
testProfanityDetection().then(() => {
  testVanityFilter();
  testReactHook();
});

console.log('🔧 Manual test: Open browser dev tools and check Network tab for profanity-words.json request');
console.log('🔧 Manual test: Check Console tab for "Profanity words loaded" message');
console.log('🔧 Manual test: Type "SHIT" in challenge mode and observe display'); 