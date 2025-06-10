#!/usr/bin/env node

/**
 * Universal Key Letter Statistics Analyzer
 * Analyzes key letter frequency data from all platforms (Node.js files + browser localStorage)
 * Usage: node analyze-key-letters.cjs [--export] [--clear]
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'key-letter-counts.txt';

// Read counts from the simple format file
function readCounts() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return {};
    }
    
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const counts = {};
    
    // Parse the simple format: "A: 5"
    const lines = content.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const match = line.match(/^([A-Z]):\s*(\d+)$/);
      if (match) {
        counts[match[1]] = parseInt(match[2], 10);
      }
    }
    
    return counts;
  } catch (error) {
    console.error('Failed to read counts file:', error);
    return {};
  }
}

// Clear the counts file
function clearCounts() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE);
      console.log(`✅ Cleared counts file: ${LOG_FILE}`);
    } else {
      console.log(`ℹ️  Counts file doesn't exist: ${LOG_FILE}`);
    }
  } catch (error) {
    console.error('Failed to clear counts file:', error);
  }
}

// Export counts to JSON
function exportCounts() {
  try {
    const counts = readCounts();
    const exportData = {
      timestamp: new Date().toISOString(),
      totalLetters: Object.values(counts).reduce((sum, count) => sum + count, 0),
      letterCounts: counts
    };
    
    const exportFile = `key-letter-export-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`📁 Exported counts to: ${exportFile}`);
  } catch (error) {
    console.error('Failed to export counts:', error);
  }
}

// Main analysis function
function analyzeKeyLetters() {
  console.log('🔍 Reading key letter counts...');
  
  const counts = readCounts();
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  if (totalCount === 0) {
    console.log('📊 No key letter data found yet.');
    console.log('🎮 Play some games to generate key letters!');
    return;
  }
  
  console.log(`📁 Read ${Object.keys(counts).length} different letters with ${totalCount} total occurrences\n`);
  
  // Sort letters by count (descending) then alphabetically
  const sortedEntries = Object.entries(counts)
    .sort(([a, countA], [b, countB]) => {
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b);
    });
  
  console.log('🎯 KEY LETTER FREQUENCY ANALYSIS');
  console.log('================================');
  console.log(`📊 Total Key Letters Generated: ${totalCount}`);
  console.log(`🔤 Different Letters Used: ${Object.keys(counts).length}`);
  console.log('');
  
  console.log('📈 LETTER FREQUENCY CHART:');
  console.log('Letter | Count | Percentage | Visual');
  console.log('-------|-------|------------|-------');
  
  sortedEntries.forEach(([letter, count]) => {
    const percentage = ((count / totalCount) * 100).toFixed(1);
    const barLength = Math.round((count / sortedEntries[0][1]) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    console.log(`   ${letter}   |   ${count.toString().padStart(2)}  |   ${percentage.padStart(5)}%   | ${bar}`);
  });
  
  console.log('');
  
  if (sortedEntries.length > 0) {
    const [mostCommon, mostCount] = sortedEntries[0];
    const [leastCommon, leastCount] = sortedEntries[sortedEntries.length - 1];
    console.log(`🏆 Most Common: ${mostCommon} (${mostCount} times, ${((mostCount / totalCount) * 100).toFixed(1)}%)`);
    console.log(`🎯 Least Common: ${leastCommon} (${leastCount} times, ${((leastCount / totalCount) * 100).toFixed(1)}%)`);
  }
  
  // Show unused letters
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedLetters = new Set(Object.keys(counts));
  const unusedLetters = allLetters.filter(letter => !usedLetters.has(letter));
  
  if (unusedLetters.length > 0) {
    console.log(`\n🚫 Unused Letters: ${unusedLetters.join(', ')} (${unusedLetters.length} letters)`);
  } else {
    console.log('\n✅ All letters have been used!');
  }
  
  console.log('\n💡 TIP: This shows the total count of each letter across all games and platforms!');
  console.log(`📁 Data source: ${LOG_FILE}`);
  
  console.log('\n🚀 Usage:');
  console.log('   node analyze-key-letters.cjs          # Show analysis');
  console.log('   node analyze-key-letters.cjs --export # Export to JSON');
  console.log('   node analyze-key-letters.cjs --clear  # Clear all counts');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--clear')) {
  clearCounts();
} else if (args.includes('--export')) {
  exportCounts();
} else {
  analyzeKeyLetters();
} 