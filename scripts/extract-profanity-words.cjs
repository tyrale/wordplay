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

function cleanProfanityWords(words) {
  return words.filter(word => {
    // Remove words with spaces or numbers
    return !word.includes(' ') && !/\d/.test(word);
  });
}

function getSlangWords() {
  // Comprehensive slang word list for modern gameplay
  // These are acceptable casual/informal words that enhance gameplay
  return [
    // Internet/Social Media slang
    'BRUH', 'YEAH', 'NOPE', 'YEET', 'FOMO', 'SELFIE', 'EMOJI', 'BLOG',
    'VLOG', 'WIFI', 'UBER', 'GOOGLE', 'TWEET', 'UNFRIEND', 'HASHTAG',
    'PHOTOBOMB', 'MANSPLAIN', 'GHOSTING', 'CATFISH', 'TROLL', 'MEME',
    'VIRAL', 'CLICKBAIT', 'SPAM', 'PHISHING', 'MALWARE', 'AVATAR',
    
    // Gaming/Tech slang
    'NOOB', 'PWNED', 'EPIC', 'FAIL', 'WIN', 'OWNED', 'LEET', 'HAXOR',
    'MOD', 'ADMIN', 'PING', 'LAG', 'BUFF', 'NERF', 'GANK', 'AFK',
    'RAGEQUIT', 'SPEEDRUN', 'RESPAWN', 'KILLSTREAK', 'HEADSHOT',
    
    // General modern slang
    'CHILL', 'COOL', 'SICK', 'DOPE', 'LIT', 'FIRE', 'SALTY', 'TOXIC',
    'SHADE', 'CLOUT', 'FLEX', 'STAN', 'SIMP', 'KAREN', 'BOOMER',
    'ZOOMER', 'MILLENNIAL', 'PERIODT', 'SLAY', 'QUEEN', 'KING',
    
    // Abbreviated forms that are now words
    'APP', 'APPS', 'TECH', 'STARTUP', 'CRYPTO', 'BITCOIN', 'NFTS',
    'AI', 'VR', 'AR', 'FOMO', 'YOLO', 'SWAG', 'HYPE', 'VIBE',
    'VIBES', 'MOOD', 'ENERGY', 'CHAOS', 'RANDOM', 'WEIRD', 'CRINGE'
  ];
}

async function extractProfanityWords() {
  try {
    console.log('🔍 Loading profanity words from naughty-words package...');
    
    // Load the naughty-words package
    const naughtyWords = require('naughty-words');
    
    if (!naughtyWords?.en || !Array.isArray(naughtyWords.en)) {
      throw new Error('Invalid naughty-words package format');
    }
    
    console.log(`📊 Found ${naughtyWords.en.length} original profanity words`);
    
    // Clean the words (remove spaces and numbers)
    const cleanedWords = cleanProfanityWords(naughtyWords.en);
    console.log(`🧹 Cleaned to ${cleanedWords.length} profanity words (removed ${naughtyWords.en.length - cleanedWords.length} words with spaces/numbers)`);
    
    // Convert to uppercase for consistency
    const uppercaseProfanityWords = cleanedWords.map(word => word.toUpperCase());
    
    // Get slang words
    const slangWords = getSlangWords();
    console.log(`📝 Generated ${slangWords.length} slang words`);
    
    // Create single shared directory for all platforms
    const outputDir = 'public/data';
    const fullPath = path.join(process.cwd(), outputDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}`);
    }
    
    // Create profanity words file
    const profanityData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: 'naughty-words NPM package',
      totalWords: uppercaseProfanityWords.length,
      words: uppercaseProfanityWords.sort() // Sort alphabetically for consistency
    };
    
    const profanityFilePath = path.join(fullPath, 'profanity-words.json');
    fs.writeFileSync(profanityFilePath, JSON.stringify(profanityData, null, 2));
    console.log(`✅ Created shared profanity file: ${outputDir}/profanity-words.json`);
    
    // Create slang words file
    const slangData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: 'curated slang word list',
      description: 'Modern slang and informal words acceptable in casual gameplay',
      totalWords: slangWords.length,
      words: slangWords.sort() // Sort alphabetically for consistency
    };
    
    const slangFilePath = path.join(fullPath, 'slang-words.json');
    fs.writeFileSync(slangFilePath, JSON.stringify(slangData, null, 2));
    console.log(`✅ Created shared slang file: ${outputDir}/slang-words.json`);
    
    // Create minified versions for production
    const minifiedProfanityData = {
      words: uppercaseProfanityWords
    };
    
    const minifiedSlangData = {
      words: slangWords
    };
    
    const minProfanityFilePath = path.join(fullPath, 'profanity-words.min.json');
    fs.writeFileSync(minProfanityFilePath, JSON.stringify(minifiedProfanityData));
    console.log(`✅ Created minified profanity file: ${outputDir}/profanity-words.min.json`);
    
    const minSlangFilePath = path.join(fullPath, 'slang-words.min.json');
    fs.writeFileSync(minSlangFilePath, JSON.stringify(minifiedSlangData));
    console.log(`✅ Created minified slang file: ${outputDir}/slang-words.min.json`);
    
    // Generate extraction report
    const report = [
      '# Word Data Extraction Report',
      '',
      `**Generated:** ${new Date().toISOString()}`,
      '',
      '## Profanity Words',
      `- **Source:** naughty-words NPM package`,
      `- **Original words:** ${naughtyWords.en.length}`,
      `- **After cleaning:** ${cleanedWords.length}`,
      `- **Removed:** ${naughtyWords.en.length - cleanedWords.length} (words with spaces/numbers)`,
      '',
      '## Slang Words', 
      `- **Source:** Curated list of modern slang`,
      `- **Total words:** ${slangWords.length}`,
      `- **Categories:** Internet/Social Media, Gaming/Tech, General modern slang, Abbreviated forms`,
      '',
      '## Output Files',
      `- \`public/data/profanity-words.json\` (${uppercaseProfanityWords.length} words)`,
      `- \`public/data/profanity-words.min.json\` (minified)`,
      `- \`public/data/slang-words.json\` (${slangWords.length} words)`,
      `- \`public/data/slang-words.min.json\` (minified)`,
      '',
      '## Platform Integration',
      'All platforms (Web, iOS, Android, React Native, Node.js) will load these shared files',
      'using platform-specific loading methods (HTTP, require, bundle, etc.)',
      '',
      '---',
      '*This report was automatically generated by scripts/extract-profanity-words.cjs*'
    ].join('\n');
    
    fs.writeFileSync('word-data-extraction-report.md', report);
    console.log('📄 Generated word-data-extraction-report.md');
    
    console.log('\n✅ Word data extraction completed successfully!');
    console.log(`📊 Total: ${uppercaseProfanityWords.length} profanity words + ${slangWords.length} slang words`);
    
  } catch (error) {
    console.error('❌ Error extracting word data:', error);
    process.exit(1);
  }
}

extractProfanityWords(); 