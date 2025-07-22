# Platform-Agnostic Profanity Architecture

This document explains how the profanity system works across all platforms (Web, iOS, Android, React Native) using a **single shared JSON file** and platform-specific loading methods.

## Architecture Overview

The profanity system follows the **Dependency Injection** pattern with a **single source of truth**:

1. **Engine**: Contains platform-agnostic utility functions only
2. **Shared Data**: Single JSON file (`public/data/profanity-words.json`) used by all platforms
3. **Platform Adapters**: Load the same data file using platform-specific methods
4. **WordDataDependencies**: Interface contract for providing profanity words

## Single File, Multiple Loading Methods

### The Shared Data File
- **Location**: `public/data/profanity-words.json`
- **Size**: 4.2 KB (278 cleaned profanity words)
- **Format**: Standard JSON with metadata and word array
- **Used By**: All platforms (Web, iOS, Android, React Native, Node.js)

## Platform Implementation Examples

### Web/Browser Platform
```typescript
// Browser Adapter - loads via HTTP
import { cleanProfanityWords } from '../../packages/engine/profanity';

class BrowserWordData implements WordDataDependencies {
  public profanityWords: Set<string> = new Set();
  
  async loadDictionary(): Promise<void> {
    // Load shared file via HTTP
    const response = await fetch('/data/profanity-words.json');
    const data = await response.json();
    this.profanityWords = new Set(data.words);
  }
}
```

### Node.js Platform  
```typescript
// Node.js Adapter - loads via require
import { cleanProfanityWords } from '../../packages/engine/profanity';

class NodeWordData implements WordDataDependencies {
  public profanityWords: Set<string> = new Set();
  
  async loadDictionary(): Promise<void> {
    // Load shared file via require
    const data = require('../../public/data/profanity-words.json');
    this.profanityWords = new Set(data.words);
  }
}
```

### React Native Platform
```typescript
// React Native Adapter - loads from bundled asset
import { cleanProfanityWords } from '../../packages/engine/profanity';
// Copy public/data/profanity-words.json to mobile app assets during build

class ReactNativeWordData implements WordDataDependencies {
  public profanityWords: Set<string> = new Set();
  
  async loadDictionary(): Promise<void> {
    // Load shared file from app bundle
    const data = require('./assets/profanity-words.json');
    this.profanityWords = new Set(data.words);
  }
}
```

### iOS Native Platform
```swift
// iOS Swift code - loads from app bundle
class IOSWordData {
    var profanityWords: Set<String> = []
    
    func loadDictionary() {
        // Load shared file from iOS bundle
        guard let path = Bundle.main.path(forResource: "profanity-words", ofType: "json"),
              let data = Data(contentsOf: URL(fileURLWithPath: path)),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let words = json["words"] as? [String] else { return }
        
        self.profanityWords = Set(words)
    }
}
```

### Android Native Platform
```java
// Android Java code - loads from assets
public class AndroidWordData {
    private Set<String> profanityWords = new HashSet<>();
    
    public void loadDictionary(Context context) {
        try {
            // Load shared file from Android assets
            InputStream is = context.getAssets().open("profanity-words.json");
            String json = convertStreamToString(is);
            JSONObject data = new JSONObject(json);
            JSONArray words = data.getJSONArray("words");
            
            for (int i = 0; i < words.length(); i++) {
                profanityWords.add(words.getString(i));
            }
        } catch (Exception e) {
            Log.e("ProfanityData", "Failed to load profanity words", e);
        }
    }
}
```

## Engine Usage (Platform-Agnostic)

```typescript
// Engine functions receive data through dependencies - same for all platforms
export function validateWordWithDependencies(
  word: string, 
  wordData: WordDataDependencies,
  options?: ValidationOptions
): ValidationResult {
  // Platform-agnostic: Uses provided profanity data (same for all platforms)
  const isProfane = wordData.profanityWords.has(word.toUpperCase());
  
  if (isProfane && !options?.allowProfanity) {
    return {
      isValid: false,
      reason: 'PROFANITY_DETECTED',
      word: word.toUpperCase(),
      userMessage: 'Word contains inappropriate content',
      censored: word.split('').map(() => '*').join('')
    };
  }
  
  // Continue with other validation...
}
```

## Deployment Strategy

### Build Process
```bash
# 1. Generate shared file during build
node scripts/extract-profanity-words.cjs

# 2. Web apps - file already in public/data/
# 3. Mobile apps - copy file to platform assets
cp public/data/profanity-words.json ios/MyApp/Assets/
cp public/data/profanity-words.json android/app/src/main/assets/
```

### Platform-Specific Steps

#### Web Applications
- ✅ **No action needed** - file served from `public/data/`

#### React Native
```bash
# Copy during build process
cp public/data/profanity-words.json mobile/assets/
```

#### iOS Native
```bash
# Add to Xcode project bundle
cp public/data/profanity-words.json ios/Resources/
```

#### Android Native  
```bash
# Copy to assets folder
cp public/data/profanity-words.json android/app/src/main/assets/
```

## Benefits of Single File Approach

### ✅ No Duplication
- **Single Source**: One file, multiple loading methods
- **Same Data**: Identical 278 words across all platforms
- **Consistent Behavior**: Same profanity detection everywhere

### ✅ Maintainable
- **One Update**: Change source, regenerate once, deploy everywhere
- **Version Control**: Single file to track changes
- **File Size**: 4.2 KB shared vs multiple copies

### ✅ Platform Flexible
- **Same Logic**: Engine code unchanged across platforms
- **Different Loading**: Each platform uses best loading method
- **Easy Integration**: Copy one file per platform

### ✅ Development Efficient
- **Single Build**: One extraction script
- **Easy Testing**: Same test data across platforms
- **Clear Deployment**: Copy one file to each platform's assets

This approach eliminates unnecessary file duplication while maintaining platform-agnostic architecture and consistent profanity detection across all platforms. 