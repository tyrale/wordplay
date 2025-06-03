#!/bin/bash

# WordPlay Terminal Game Runner
# 
# Simple script to run the terminal game for testing

echo "🎮 Starting WordPlay Terminal Game..."
echo ""

# Change to engine directory
cd packages/engine

# Check if ts-node is available
if ! command -v npx ts-node &> /dev/null; then
  echo "📦 Installing ts-node for TypeScript execution..."
  npm install --no-save ts-node
fi

echo "🚀 Launching game with TypeScript..."
echo ""

# Run TypeScript directly with ts-node
npx ts-node --esm terminal-game.ts

echo ""
echo "👋 Thanks for playing WordPlay!" 