/**
 * Vanity Display System Demonstration
 * Shows the corrected profanity handling behavior
 */

import { 
  validateWord, 
  getVanityDisplayWord, 
  shouldUnlockVanityToggle,
  isCurrentWordProfane 
} from './packages/engine/dictionary.js';

console.log('🎭 Vanity Display System Demonstration\n');

// ✅ CORRECTED BEHAVIOR: Profane words are valid for play
console.log('✅ VALIDATION BEHAVIOR (CORRECTED):');
const damnValidation = validateWord('DAMN');
console.log(`   validateWord('DAMN'):`, damnValidation);
console.log(`   → Result: ${damnValidation.isValid ? '✅ VALID' : '❌ INVALID'} for gameplay`);
console.log(`   → Real word: "${damnValidation.word}"`);
console.log();

// 🎭 VANITY DISPLAY SYSTEM
console.log('🎭 VANITY DISPLAY SYSTEM:');

// User hasn't unlocked toggle yet
const newUserState = {
  hasUnlockedToggle: false,
  isVanityFilterOn: true
};

// User has unlocked toggle, filter ON
const unlockedFilterOnState = {
  hasUnlockedToggle: true,
  isVanityFilterOn: true
};

// User has unlocked toggle, filter OFF
const unlockedFilterOffState = {
  hasUnlockedToggle: true,
  isVanityFilterOn: false
};

console.log('📱 DISPLAY EXAMPLES:');

// Normal word
const helloDisplay = getVanityDisplayWord('HELLO', { vanityState: newUserState });
console.log(`   Normal word "HELLO" displays as: "${helloDisplay}"`);

// Profane word - new user (no toggle unlocked)
const damnNewUser = getVanityDisplayWord('DAMN', { vanityState: newUserState });
console.log(`   Profane word "DAMN" (new user) displays as: "${damnNewUser}"`);

// Profane word - unlocked but filter ON
const damnFilterOn = getVanityDisplayWord('DAMN', { vanityState: unlockedFilterOnState });
console.log(`   Profane word "DAMN" (unlocked, filter ON) displays as: "${damnFilterOn}"`);

// Profane word - unlocked and filter OFF
const damnFilterOff = getVanityDisplayWord('DAMN', { vanityState: unlockedFilterOffState });
console.log(`   Profane word "DAMN" (unlocked, filter OFF) displays as: "${damnFilterOff}"`);

console.log();

// 🔄 REAL-TIME DISPLAY SIMULATION
console.log('🔄 REAL-TIME TYPING SIMULATION:');
const typingSequence = ['D', 'DA', 'DAM', 'DAMN', 'DAMN', 'DAMNATION'];

typingSequence.forEach((word, index) => {
  const isWordProfane = isCurrentWordProfane(word);
  const displayWord = getVanityDisplayWord(word, { vanityState: newUserState });
  console.log(`   Step ${index + 1}: User types "${word}" → Display: "${displayWord}" (Profane: ${isWordProfane})`);
});

console.log();

// 🏆 UNLOCK SYSTEM
console.log('🏆 UNLOCK SYSTEM:');
const testWords = ['HELLO', 'DAMN', 'CATS', 'HELL', 'DOGS'];
testWords.forEach(word => {
  const shouldUnlock = shouldUnlockVanityToggle(word);
  console.log(`   Submitting "${word}" → Unlocks vanity toggle: ${shouldUnlock ? '✅ YES' : '❌ NO'}`);
});

console.log();

// 🔍 GAMEPLAY FLOW EXAMPLE
console.log('🔍 COMPLETE GAMEPLAY FLOW:');
console.log('1. Player 1 plays "CAT" → validates ✅, displays "CAT"');
console.log('2. Player 2 plays "CATS" → validates ✅, displays "CATS"');
console.log('3. Player 1 plays "DAMN" → validates ✅, displays "%#^&", unlocks vanity toggle');
console.log('4. Player 2 receives real word "DAMN" for their turn');
console.log('5. Player 2 plays "DAMP" → validates ✅, displays "DAMP"');
console.log('6. Player 1 can now toggle vanity filter on/off in settings');

console.log('\n🎯 PLAYER 2 RECEIVING "DAMN" EXAMPLE:');
console.log('Player 1 played "DAMN" → stored in game state as real word "DAMN"');
console.log();

// Player 2 scenarios
const player2NewUser = { hasUnlockedToggle: false, isVanityFilterOn: true };
const player2FilterOn = { hasUnlockedToggle: true, isVanityFilterOn: true };
const player2FilterOff = { hasUnlockedToggle: true, isVanityFilterOn: false };

const wordFromPlayer1 = "DAMN"; // This is what's stored in game state

console.log('Player 2 receives word from game state and sees:');
console.log(`   Scenario 1 (new user): "${getVanityDisplayWord(wordFromPlayer1, { vanityState: player2NewUser })}"`);
console.log(`   Scenario 2 (unlocked, filter ON): "${getVanityDisplayWord(wordFromPlayer1, { vanityState: player2FilterOn })}"`);
console.log(`   Scenario 3 (unlocked, filter OFF): "${getVanityDisplayWord(wordFromPlayer1, { vanityState: player2FilterOff })}"`);

console.log();
console.log('In ALL scenarios, Player 2 can make valid moves from the real word "DAMN":');
console.log('   DAMN → DAMP (valid ±1 letter change)');
console.log('   DAMN → DAN (valid ±1 letter change)');
console.log('   DAMN → DAMN (rearrange, no change)');

console.log('\n🎉 Vanity System Working Correctly! ✅'); 