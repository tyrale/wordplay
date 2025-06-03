#!/bin/bash

# WordPlay Terminal Game Runner
# 
# Simple script to compile and run the terminal game for testing

echo "🎮 Starting WordPlay Terminal Game..."
echo ""

# Change to engine directory
cd packages/engine

# Compile TypeScript with all dependencies
echo "📦 Compiling TypeScript..."
npx tsc terminal-game.ts \
  --target es2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --allowSyntheticDefaultImports \
  --strict \
  --skipLibCheck \
  --outDir compiled \
  2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ TypeScript compilation failed"
  exit 1
fi

echo "✅ Compilation complete!"
echo ""

# Run the compiled game
echo "🚀 Launching game..."
echo ""

node compiled/terminal-game.js

# Cleanup
rm -rf compiled

echo ""
echo "👋 Thanks for playing WordPlay!" 