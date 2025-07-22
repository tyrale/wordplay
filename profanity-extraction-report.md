# Profanity Words Extraction Report

Generated: 2025-07-22T03:44:18.010Z
Source: naughty-words NPM package

## Statistics
- Original words: 403
- Cleaned words: 278
- Filtered out: 125 (31%)

## Single Shared File
- **Location**: `public/data/profanity-words.json`
- **Size**: 4.2 KB
- **Minified**: `public/data/profanity-words.min.json` (2.7 KB)

## Platform Usage

### Web Applications
```typescript
const response = await fetch('/data/profanity-words.json');
const data = await response.json();
const profanityWords = new Set(data.words);
```

### React Native / Mobile
```typescript
// Copy public/data/profanity-words.json to your mobile app assets
const data = require('./assets/profanity-words.json');
const profanityWords = new Set(data.words);
```

### Node.js Applications
```typescript
const data = require('./public/data/profanity-words.json');
const profanityWords = new Set(data.words);
```

## Deployment Instructions

### For Web Apps
- File is already in `public/data/` and will be served by web server

### For Mobile Apps (iOS/Android/React Native)
1. Copy `public/data/profanity-words.json` to your mobile app's assets folder
2. Load using platform-specific asset loading (same file, different loading method)

### For Node.js Apps
- Reference the file directly from `public/data/` folder

## Benefits
- **Single Source**: One file for all platforms
- **No Duplication**: Same data, different loading methods
- **Consistent**: Identical profanity detection across platforms
- **Maintainable**: Update one file, deploy everywhere
