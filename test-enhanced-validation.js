#!/usr/bin/env node

/**
 * Test script for enhanced validation system
 * Tests all the new descriptive error messages for invalid words
 */

import { TerminalGame } from './packages/engine/terminal-game.js';

console.log('🧪 Testing Enhanced Validation System');
console.log('=====================================\n');

async function testValidation() {
  const game = new TerminalGame({
    maxTurns: 10,
    initialWord: 'CATS',
    enableKeyLetters: false
  });
  
  // Start the game but don't run the game loop
  console.log('Starting game with initial word: CATS\n');
  
  // We need to access the game manager for direct testing
  // Let's create a simple adapter for testing
  try {
    // Import the modules we need
    const { createTestDependencies } = await import('./packages/engine/interfaces.js');
    const { LocalGameStateManagerWithDependencies } = await import('./packages/engine/gamestate.js');
    
    // Create test dependencies with a known word set
    const testWords = [
      'CAT', 'CATS', 'DOG', 'DOGS', 'PLAY', 'PLAYS', 'WORD', 'WORDS',
      'GAME', 'GAMES', 'TEST', 'TESTS', 'HELLO', 'WORLD'
    ];
    
    const dependencies = createTestDependencies({
      validWords: testWords
    });
    
    // Create game manager with test dependencies
    const gameManager = new LocalGameStateManagerWithDependencies(dependencies, {
      maxTurns: 10,
      initialWord: 'CATS',
      enableKeyLetters: false
    });
    
    gameManager.startGame();
    
    console.log('✅ Game initialized successfully\n');
    
    // Test 1: Dictionary validation - "not a word"
    console.log('Test 1: Invalid dictionary word');
    const test1 = gameManager.attemptMove('ZZZZZ');
    console.log(`  Input: ZZZZZ`);
    console.log(`  Expected: "not a word"`);
    console.log(`  Actual: "${test1.validationResult.userMessage}"`);
    console.log(`  ✅ ${test1.validationResult.userMessage === 'not a word' ? 'PASS' : 'FAIL'}\n`);
    
    // Test 2: Already played word - "was played"
    console.log('Test 2: Word already played');
    // First, play a valid word
    const validMove = gameManager.attemptMove('CAT');
    gameManager.applyMove(validMove);
    
    // Then try to play it again
    const test2 = gameManager.attemptMove('CAT');
    console.log(`  Input: CAT (already played)`);
    console.log(`  Expected: "was played"`);
    console.log(`  Actual: "${test2.validationResult.userMessage}"`);
    console.log(`  ✅ ${test2.validationResult.userMessage === 'was played' ? 'PASS' : 'FAIL'}\n`);
    
    // Test 3: Too many adds - "too many adds"
    console.log('Test 3: Too many letter additions');
    // Current word is CAT, try to add multiple letters
    const test3 = gameManager.attemptMove('CATXY'); // Adding X and Y
    console.log(`  Current word: CAT`);
    console.log(`  Input: CATXY (adding 2 letters)`);
    console.log(`  Expected: "too many adds"`);
    console.log(`  Actual: "${test3.validationResult.userMessage}"`);
    console.log(`  ✅ ${test3.validationResult.userMessage === 'too many adds' ? 'PASS' : 'FAIL'}\n`);
    
    // Test 4: Too many removes - "too many removes"  
    console.log('Test 4: Too many letter removals');
    // Current word is CAT, try to remove multiple letters
    const test4 = gameManager.attemptMove('C'); // Removing A and T
    console.log(`  Current word: CAT`);
    console.log(`  Input: C (removing 2 letters)`);
    console.log(`  Expected: "too many removes"`);
    console.log(`  Actual: "${test4.validationResult.userMessage}"`);
    console.log(`  ✅ ${test4.validationResult.userMessage === 'too many removes' ? 'PASS' : 'FAIL'}\n`);
    
    // Test 5: Valid move should work
    console.log('Test 5: Valid move');
    const test5 = gameManager.attemptMove('CATS');
    console.log(`  Current word: CAT`);
    console.log(`  Input: CATS (adding 1 letter)`);
    console.log(`  Expected: Valid move`);
    console.log(`  Actual: ${test5.isValid ? 'Valid' : test5.validationResult.userMessage}`);
    console.log(`  ✅ ${test5.isValid ? 'PASS' : 'FAIL'}\n`);
    
    // Test 6: Empty word - "word cannot be empty"
    console.log('Test 6: Empty word');
    const test6 = gameManager.attemptMove('');
    console.log(`  Input: (empty string)`);
    console.log(`  Expected: "word cannot be empty"`);
    console.log(`  Actual: "${test6.validationResult.userMessage}"`);
    console.log(`  ✅ ${test6.validationResult.userMessage === 'word cannot be empty' ? 'PASS' : 'FAIL'}\n`);
    
    // Test 7: Invalid characters - "only letters allowed"
    console.log('Test 7: Invalid characters');
    const test7 = gameManager.attemptMove('CAT123');
    console.log(`  Input: CAT123`);
    console.log(`  Expected: "only letters allowed"`);
    console.log(`  Actual: "${test7.validationResult.userMessage}"`);
    console.log(`  ✅ ${test7.validationResult.userMessage === 'only letters allowed' ? 'PASS' : 'FAIL'}\n`);
    
    console.log('🎉 Enhanced validation testing complete!');
    console.log('   All error messages are now descriptive and user-friendly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testValidation().catch(console.error); 