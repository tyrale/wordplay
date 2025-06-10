#!/usr/bin/env node

/**
 * Key Letter Frequency Analyzer
 * Reads key-letter-stats.log and provides frequency analysis across all games
 */

const fs = require('fs');
const path = require('path');

function analyzeKeyLetterStats() {
  const logPath = path.join(process.cwd(), 'key-letter-stats.log');
  
  console.log('📊 Key Letter Frequency Analysis');
  console.log('=================================\n');
  
  try {
    if (!fs.existsSync(logPath)) {
      console.log('❌ No log file found. Play some games to generate statistics!');
      console.log(`Expected file: ${logPath}`);
      return;
    }
    
    const logContent = fs.readFileSync(logPath, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim() && !line.startsWith('#') && line.includes(','));
    
    if (lines.length === 0) {
      console.log('📝 Log file exists but contains no data yet.');
      return;
    }
    
    // Parse log entries
    const letterCounts = {};
    const gameStats = {};
    let totalLetters = 0;
    
    lines.forEach(line => {
      const [timestamp, letter, gameId, turnNumber] = line.split(',');
      
      if (letter && letter.trim()) {
        const cleanLetter = letter.trim();
        letterCounts[cleanLetter] = (letterCounts[cleanLetter] || 0) + 1;
        totalLetters++;
        
        // Track per-game stats
        if (!gameStats[gameId]) {
          gameStats[gameId] = { letters: [], firstSeen: timestamp };
        }
        gameStats[gameId].letters.push({ letter: cleanLetter, turn: parseInt(turnNumber), timestamp });
      }
    });
    
    // Sort letters by frequency (descending)
    const sortedLetters = Object.entries(letterCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([letter, count]) => ({
        letter,
        count,
        percentage: ((count / totalLetters) * 100).toFixed(1)
      }));
    
    // Display results
    console.log(`📈 Total Key Letters Generated: ${totalLetters}`);
    console.log(`🎮 Games Analyzed: ${Object.keys(gameStats).length}`);
    console.log(`📅 Date Range: ${getDateRange(lines)}\n`);
    
    console.log('🔤 Letter Frequency (Most to Least Common):');
    console.log('Letter | Count | Percentage | Bar Chart');
    console.log('-------|-------|------------|----------');
    
    sortedLetters.forEach(({ letter, count, percentage }) => {
      const barLength = Math.round((count / sortedLetters[0].count) * 20);
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      console.log(`   ${letter}   |  ${count.toString().padStart(3)}  |   ${percentage.padStart(4)}%   | ${bar}`);
    });
    
    // Show least and most common
    console.log('\n🏆 Most Common Letters:');
    sortedLetters.slice(0, 5).forEach(({ letter, count, percentage }, index) => {
      console.log(`${index + 1}. ${letter}: ${count} times (${percentage}%)`);
    });
    
    if (sortedLetters.length > 5) {
      console.log('\n🔻 Least Common Letters:');
      sortedLetters.slice(-5).reverse().forEach(({ letter, count, percentage }, index) => {
        console.log(`${index + 1}. ${letter}: ${count} times (${percentage}%)`);
      });
    }
    
    // Show unused letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const usedLetters = new Set(Object.keys(letterCounts));
    const unusedLetters = alphabet.filter(letter => !usedLetters.has(letter));
    
    if (unusedLetters.length > 0) {
      console.log(`\n❌ Never Used Letters: ${unusedLetters.join(', ')}`);
    } else {
      console.log('\n✅ All letters have been used as key letters!');
    }
    
    // Game-by-game breakdown
    console.log('\n🎮 Recent Games:');
    const recentGames = Object.entries(gameStats)
      .sort(([,a], [,b]) => new Date(b.firstSeen) - new Date(a.firstSeen))
      .slice(0, 5);
    
    recentGames.forEach(([gameId, stats]) => {
      const gameLetters = stats.letters.map(l => l.letter).join(', ');
      const gameDate = new Date(stats.firstSeen).toLocaleString();
      console.log(`${gameId}: ${gameLetters} (${gameDate})`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing log file:', error.message);
  }
}

function getDateRange(lines) {
  if (lines.length === 0) return 'No data';
  
  const timestamps = lines.map(line => new Date(line.split(',')[0]));
  const earliest = new Date(Math.min(...timestamps));
  const latest = new Date(Math.max(...timestamps));
  
  if (earliest.toDateString() === latest.toDateString()) {
    return earliest.toLocaleDateString();
  }
  
  return `${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()}`;
}

// Run the analysis
analyzeKeyLetterStats(); 