#!/usr/bin/env node

/**
 * Universal Key Letter Statistics Analyzer
 * Analyzes key letter frequency data from all platforms (Node.js files + browser localStorage)
 * Usage: node analyze-key-letters.cjs [--export] [--clear]
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = 'key-letter-stats.log';

function readLogFile() {
  const logPath = path.join(process.cwd(), LOG_FILE);
  const allEntries = [];
  
  // Read central log file
  if (fs.existsSync(logPath)) {
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#') && line.includes(','));
      
      const fileEntries = lines.map(line => {
        const [timestamp, letter, gameId, turnNumber, platform] = line.split(',');
        return {
          timestamp,
          letter: letter?.trim(),
          gameId,
          turnNumber: parseInt(turnNumber) || 0,
          platform: platform?.trim() || 'nodejs',
          source: 'file'
        };
      }).filter(entry => entry.letter && entry.letter.length === 1);
      
      allEntries.push(...fileEntries);
      console.log(`📁 Read ${fileEntries.length} entries from central log file`);
    } catch (error) {
      console.error('❌ Error reading log file:', error.message);
    }
  }
  
  // Try to read browser buffer data (if available)
  try {
    // Check if we can access browser localStorage data
    // This would work if running in a browser context or if data was exported
    const browserBufferPath = path.join(process.cwd(), 'browser-buffer-export.json');
    if (fs.existsSync(browserBufferPath)) {
      const browserData = JSON.parse(fs.readFileSync(browserBufferPath, 'utf8'));
      const browserEntries = browserData.map(entry => ({
        ...entry,
        source: 'browser_export'
      }));
      allEntries.push(...browserEntries);
      console.log(`🌐 Read ${browserEntries.length} entries from browser export`);
    }
  } catch (error) {
    // Browser data not available, that's okay
  }
  
  if (allEntries.length === 0) {
    console.log('📁 No data found. Play some games to generate statistics!');
    console.log('💡 Browser games store data locally - check the web app statistics button');
  }
  
  return allEntries;
}

function analyzeData(logs) {
  if (logs.length === 0) {
    return {
      totalLetters: 0,
      totalGames: 0,
      letterFrequency: [],
      platformBreakdown: {},
      recentGames: []
    };
  }

  const letterCounts = {};
  const platformCounts = {};
  const gameStats = {};
  
  logs.forEach(log => {
    // Count letters
    letterCounts[log.letter] = (letterCounts[log.letter] || 0) + 1;
    
    // Count platforms
    platformCounts[log.platform] = (platformCounts[log.platform] || 0) + 1;
    
    // Track games
    if (!gameStats[log.gameId]) {
      gameStats[log.gameId] = {
        letters: [],
        platform: log.platform,
        firstSeen: log.timestamp
      };
    }
    gameStats[log.gameId].letters.push(log.letter);
  });

  // Sort letters by frequency
  const sortedLetters = Object.entries(letterCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([letter, count]) => ({
      letter,
      count,
      percentage: ((count / logs.length) * 100).toFixed(1)
    }));

  return {
    totalLetters: logs.length,
    totalGames: Object.keys(gameStats).length,
    letterFrequency: sortedLetters,
    platformBreakdown: platformCounts,
    recentGames: Object.entries(gameStats)
      .sort(([,a], [,b]) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
      .slice(0, 10)
      .map(([gameId, stats]) => ({
        gameId,
        letters: stats.letters,
        platform: stats.platform,
        timestamp: stats.firstSeen
      }))
  };
}

function displayResults(analysis, logs) {
  console.log('\n🎯 UNIVERSAL KEY LETTER FREQUENCY ANALYSIS');
  console.log('==========================================');
  
  if (analysis.totalLetters === 0) {
    console.log('📊 No data available yet. Play some games to see statistics!');
    console.log('\n💡 Key letters are tracked across ALL platforms:');
    console.log('   • Terminal games (saved to file)');
    console.log('   • Web browser games (saved to localStorage)');
    console.log('   • Mobile apps (when implemented)');
    return;
  }

  console.log(`📊 Total Key Letters Generated: ${analysis.totalLetters}`);
  console.log(`🎮 Total Games Played: ${analysis.totalGames}`);
  
  // Data source breakdown
  const sourceCounts = {};
  logs.forEach(log => {
    sourceCounts[log.source] = (sourceCounts[log.source] || 0) + 1;
  });
  
  console.log('\n📁 DATA SOURCES:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    const percentage = ((count / analysis.totalLetters) * 100).toFixed(1);
    const sourceName = {
      'file': '📄 Central Log File',
      'browser_export': '🌐 Browser Export',
      'browser': '🌐 Browser Buffer'
    }[source] || source;
    
    console.log(`   ${sourceName}: ${count} entries (${percentage}%)`);
  });
  
  // Platform breakdown
  console.log('\n🌐 PLATFORM BREAKDOWN:');
  Object.entries(analysis.platformBreakdown).forEach(([platform, count]) => {
    const percentage = ((count / analysis.totalLetters) * 100).toFixed(1);
    const platformName = {
      'nodejs': '🖥️  Terminal/Node.js',
      'browser': '🌐 Web Browser',
      'mobile_browser': '📱 Mobile Browser',
      'unknown': '❓ Unknown Platform'
    }[platform] || `🔧 ${platform}`;
    
    console.log(`   ${platformName}: ${count} letters (${percentage}%)`);
  });

  console.log('\n📈 LETTER FREQUENCY CHART:');
  console.log('Letter | Count | Percentage | Visual');
  console.log('-------|-------|------------|-------');
  
  const maxCount = Math.max(...analysis.letterFrequency.map(item => item.count));
  
  analysis.letterFrequency.forEach(({ letter, count, percentage }) => {
    const barLength = Math.round((count / maxCount) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    console.log(`   ${letter}   |  ${count.toString().padStart(3)}  |   ${percentage.padStart(5)}%   | ${bar}`);
  });

  // Most and least common
  if (analysis.letterFrequency.length > 0) {
    const mostCommon = analysis.letterFrequency[0];
    const leastCommon = analysis.letterFrequency[analysis.letterFrequency.length - 1];
    
    console.log(`\n🏆 Most Common: ${mostCommon.letter} (${mostCommon.count} times, ${mostCommon.percentage}%)`);
    console.log(`🎯 Least Common: ${leastCommon.letter} (${leastCommon.count} times, ${leastCommon.percentage}%)`);
  }

  // Find unused letters
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedLetters = new Set(analysis.letterFrequency.map(item => item.letter.toUpperCase()));
  const unusedLetters = allLetters.filter(letter => !usedLetters.has(letter));
  
  if (unusedLetters.length > 0) {
    console.log(`\n🚫 Unused Letters: ${unusedLetters.join(', ')} (${unusedLetters.length} letters)`);
  } else {
    console.log('\n✅ All letters have been used as key letters!');
  }

  // Recent games
  if (analysis.recentGames.length > 0) {
    console.log('\n🕒 RECENT GAMES:');
    analysis.recentGames.forEach((game, index) => {
      const date = new Date(game.timestamp).toLocaleString();
      const platformIcon = {
        'nodejs': '🖥️',
        'browser': '🌐',
        'mobile_browser': '📱',
        'unknown': '❓'
      }[game.platform] || '🔧';
      
      console.log(`   ${index + 1}. ${game.gameId} ${platformIcon} - ${game.letters.join(', ')} (${date})`);
    });
  }

  console.log('\n💡 TIP: This analysis combines data from all platforms!');
  console.log('   • Terminal games: Written directly to key-letter-stats.log');
  console.log('   • Browser games: Buffered in localStorage (check web app stats)');
  console.log('   • Use --export to save all data to a JSON file');
  console.log('\n🔄 To include browser data in this analysis:');
  console.log('   1. Open web app and click the 📊 statistics button');
  console.log('   2. Browser data is automatically tracked and will show there');
  console.log('   3. Both terminal and browser data contribute to the complete picture!');
}

function exportData(analysis, logs) {
  const exportData = {
    exportDate: new Date().toISOString(),
    summary: analysis,
    rawData: logs,
    metadata: {
      version: '2.0',
      description: 'Universal WordPlay key letter statistics',
      platforms: Object.keys(analysis.platformBreakdown)
    }
  };

  const filename = `key-letter-export-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log(`\n💾 Data exported to: ${filename}`);
}

function clearData() {
  const logPath = path.join(process.cwd(), LOG_FILE);
  
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
    console.log('🗑️  File data cleared');
  } else {
    console.log('📁 No file data to clear');
  }
  
  console.log('\n💡 To clear browser data, run this in your browser console:');
  console.log('   localStorage.removeItem("wordplay_key_letter_stats")');
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    clearData();
    return;
  }

  console.log('🔍 Reading universal key letter statistics...');
  const logs = readLogFile();
  const analysis = analyzeData(logs);
  
  displayResults(analysis, logs);
  
  if (args.includes('--export')) {
    exportData(analysis, logs);
  }
  
  console.log('\n🚀 Usage:');
  console.log('   node analyze-key-letters.cjs          # Show analysis');
  console.log('   node analyze-key-letters.cjs --export # Export to JSON');
  console.log('   node analyze-key-letters.cjs --clear  # Clear file data');
}

if (require.main === module) {
  main();
} 