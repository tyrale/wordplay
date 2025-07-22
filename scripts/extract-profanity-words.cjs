#!/usr/bin/env node

/**
 * Extract Profanity Words for All Platforms
 * 
 * This script extracts profanity words from the naughty-words NPM package
 * and creates a single shared JSON file that all platforms can use.
 * 
 * Usage: node scripts/extract-profanity-words.cjs
 */

const fs = require('fs');
const path = require('path');

// Function to clean profanity words (same logic as in profanity.ts)
function cleanProfanityWords(words) {
  return words.filter(word => typeof word === 'string' && !/[\s\d]/.test(word));
}

async function extractProfanityWords() {
  try {
    console.log('🔍 Loading profanity words from naughty-words package...');
    
    // Load the naughty-words package
    const naughtyWords = require('naughty-words');
    
    if (!naughtyWords?.en || !Array.isArray(naughtyWords.en)) {
      throw new Error('Invalid naughty-words package format');
    }
    
    console.log(`📊 Found ${naughtyWords.en.length} original words`);
    
    // Clean the words (remove spaces and numbers)
    const cleanedWords = cleanProfanityWords(naughtyWords.en);
    console.log(`🧹 Cleaned to ${cleanedWords.length} words (removed ${naughtyWords.en.length - cleanedWords.length} words with spaces/numbers)`);
    
    // Convert to uppercase for consistency
    const uppercaseWords = cleanedWords.map(word => word.toUpperCase());
    
    // Create output data
    const outputData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: 'naughty-words NPM package',
      totalWords: uppercaseWords.length,
      words: uppercaseWords.sort() // Sort alphabetically for consistency
    };
    
    // Create single shared directory for all platforms
    const outputDir = 'public/data';
    const fullPath = path.join(process.cwd(), outputDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}`);
    }
    
    // Write single shared file
    const filename = 'profanity-words.json';
    const filePath = path.join(fullPath, filename);
    fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2));
    console.log(`✅ Created shared file: ${outputDir}/${filename}`);
    
    // Create a minified version for production
    const minifiedData = {
      words: uppercaseWords
    };
    
    const minFilePath = path.join(fullPath, 'profanity-words.min.json');
    fs.writeFileSync(minFilePath, JSON.stringify(minifiedData));
    console.log(`✅ Created minified file: ${outputDir}/profanity-words.min.json`);
    
    // Generate a summary report
    const report = `# Profanity Words Extraction Report

Generated: ${new Date().toISOString()}
Source: naughty-words NPM package

## Statistics
- Original words: ${naughtyWords.en.length}
- Cleaned words: ${cleanedWords.length}
- Filtered out: ${naughtyWords.en.length - cleanedWords.length} (${Math.round(((naughtyWords.en.length - cleanedWords.length) / naughtyWords.en.length) * 100)}%)

## Single Shared File
- **Location**: \`public/data/profanity-words.json\`
- **Size**: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB
- **Minified**: \`public/data/profanity-words.min.json\` (${(fs.statSync(minFilePath).size / 1024).toFixed(1)} KB)

## Platform Usage

### Web Applications
\`\`\`typescript
const response = await fetch('/data/profanity-words.json');
const data = await response.json();
const profanityWords = new Set(data.words);
\`\`\`

### React Native / Mobile
\`\`\`typescript
// Copy public/data/profanity-words.json to your mobile app assets
const data = require('./assets/profanity-words.json');
const profanityWords = new Set(data.words);
\`\`\`

### Node.js Applications
\`\`\`typescript
const data = require('./public/data/profanity-words.json');
const profanityWords = new Set(data.words);
\`\`\`

## Deployment Instructions

### For Web Apps
- File is already in \`public/data/\` and will be served by web server

### For Mobile Apps (iOS/Android/React Native)
1. Copy \`public/data/profanity-words.json\` to your mobile app's assets folder
2. Load using platform-specific asset loading (same file, different loading method)

### For Node.js Apps
- Reference the file directly from \`public/data/\` folder

## Benefits
- **Single Source**: One file for all platforms
- **No Duplication**: Same data, different loading methods
- **Consistent**: Identical profanity detection across platforms
- **Maintainable**: Update one file, deploy everywhere
`;
    
    fs.writeFileSync('profanity-extraction-report.md', report);
    console.log('📋 Created: profanity-extraction-report.md');
    
    console.log('\n🎉 Profanity words extraction completed successfully!');
    console.log(`   📄 Single shared file: public/data/profanity-words.json`);
    console.log(`   📊 Total words: ${uppercaseWords.length}`);
    console.log(`   💾 File size: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);
    console.log('   🚀 Ready for all platforms (Web, iOS, Android, React Native)!');
    
  } catch (error) {
    console.error('❌ Error extracting profanity words:', error);
    process.exit(1);
  }
}

// Run the extraction
extractProfanityWords(); 