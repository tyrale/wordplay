#!/usr/bin/env node

/**
 * Terminal Game Runner
 *
 * Simple script to run the WordPlay terminal game for testing.
 * This compiles the TypeScript and runs the game.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🎮 Starting WordPlay Terminal Game...\n');

try {
  // Change to the engine directory
  process.chdir(path.join(__dirname));

  // Compile the TypeScript
  console.log('📦 Compiling TypeScript...');
  execSync(
    'npx tsc terminal-game.ts --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --strict',
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    }
  );

  console.log('✅ Compilation complete!\n');

  // Run the compiled game
  const { startTerminalGame } = require('./terminal-game.js');

  // Start the game
  startTerminalGame().catch((error) => {
    console.error('❌ Game error:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to start game:', error.message);
  process.exit(1);
}
