#!/usr/bin/env node

/**
 * WordPlay Terminal Game Runner
 * 
 * This script dynamically loads and runs the terminal game
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🎮 Starting WordPlay Terminal Game...\n');

async function runGame() {
  try {
    console.log('📦 Compiling TypeScript for terminal game...');
    
    // Compile just the necessary files with proper ES module output
    const compileCmd = `npx tsc ` +
      `packages/engine/terminal-game.ts ` +
      `packages/engine/gamestate.ts ` +
      `packages/engine/bot.ts ` +
      `packages/engine/scoring.ts ` +
      `packages/engine/dictionary.ts ` +
      `--target es2020 ` +
      `--module es2020 ` +
      `--moduleResolution node ` +
      `--esModuleInterop ` +
      `--allowSyntheticDefaultImports ` +
      `--strict ` +
      `--skipLibCheck ` +
      `--outDir temp-build`;
    
    await execAsync(compileCmd);
    console.log('✅ Compilation complete!\n');
    
    console.log('🚀 Launching game...\n');
    
    // Import and run the compiled game
    const { startTerminalGame } = await import('./temp-build/terminal-game.js');
    await startTerminalGame();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await execAsync('rm -rf temp-build');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

runGame().then(() => {
  console.log('\n👋 Thanks for playing WordPlay!');
}).catch(error => {
  console.error('❌ Game failed:', error.message);
  process.exit(1);
}); 