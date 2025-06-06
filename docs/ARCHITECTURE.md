# WordPlay Game Architecture

## **Engine Design Philosophy**

The WordPlay engine follows **Platform-Agnostic Design** with **Dependency Injection**.

### **Core Principle**
> **The engine knows HOW to play the game, not WHERE it's running.**

## **Component Architecture**

```
packages/engine/           # Pure game logic (platform-agnostic)
├── bot.ts                # Bot AI (accepts dependencies)
├── scoring.ts            # Scoring logic (accepts dependencies)  
├── validation.ts         # Word validation (accepts dependencies)
├── dictionary.ts         # Dictionary interface contracts
└── interfaces.ts         # All engine dependency contracts

packages/adapters/         # Platform-specific implementations
├── node/                 # Node.js file system, performance.now()
├── browser/              # HTTP fetch, window.performance.now()
└── test/                 # Mocks, deterministic random
```

### **Data Flow**

```
Platform Code → Adapter → Dependencies → Engine → Results → Platform Code
     ↑                                                           ↓
   (HTTP fetch)                                            (UI updates)
```

## **Dependency Injection Pattern**

### **Engine Functions Accept Dependencies**

```typescript
// ✅ CORRECT: Engine function with dependency injection
export function generateBotMove(
  currentWord: string,
  dependencies: BotDependencies,
  options: BotOptions = {}
): BotResult {
  // Uses provided dependencies, imports nothing platform-specific
  const validation = dependencies.validateWord(candidate.word);
  const isValid = dependencies.isValidDictionaryWord(candidate.word);
  // ... game logic using dependencies
}
```

### **Platform Adapters Provide Dependencies**

```typescript
// ✅ CORRECT: Browser adapter provides dependencies
export function createBrowserAdapter(): GameEngine {
  const dependencies: BotDependencies = {
    validateWord: browserValidateWord,
    isValidDictionaryWord: browserIsValidWord,
    getTimestamp: () => performance.now(),
    random: Math.random
  };
  
  return {
    generateBotMove: (word, options) => 
      generateBotMove(word, dependencies, options)
  };
}
```

## **Integration Examples**

### **✅ CORRECT: Platform uses adapter**
```typescript
// Browser code
import { createBrowserAdapter } from '@wordplay/adapters/browser';

const gameEngine = createBrowserAdapter();
const result = gameEngine.generateBotMove('CAT', options);
```

### **✅ CORRECT: Node.js uses adapter**
```typescript
// Terminal game code
import { createNodeAdapter } from '@wordplay/adapters/node';

const gameEngine = createNodeAdapter();
const result = gameEngine.generateBotMove('CAT', options);
```

### **✅ CORRECT: Tests use adapter**
```typescript
// Test code
import { createTestAdapter } from '@wordplay/adapters/test';

const gameEngine = createTestAdapter({
  isValidDictionaryWord: (word) => ['CAT', 'CATS'].includes(word)
});
const result = gameEngine.generateBotMove('CAT', options);
```

### **❌ WRONG: Direct engine import**
```typescript
// Browser code  
import { generateBotMove } from '@wordplay/engine/bot'; // ❌ Will fail in browser
```

### **❌ WRONG: Browser-specific engine**
```typescript
// ❌ FORBIDDEN: browserEngine.ts
export function generateBrowserBotMove(word: string) {
  // Reimplementing engine logic for browsers
}
```

## **Adding New Platforms**

1. Create new adapter in `packages/adapters/[platform]/`
2. Implement all required dependency interfaces
3. Export factory function: `createPlatformAdapter()`
4. Platform code imports adapter, never engine directly

### **Example: Adding React Native Support**

```typescript
// packages/adapters/react-native/index.ts
import { AsyncStorage } from '@react-native-async-storage/async-storage';

export function createReactNativeAdapter(): GameEngine {
  const dependencies: BotDependencies = {
    validateWord: reactNativeValidateWord,
    isValidDictionaryWord: reactNativeIsValidWord,
    getTimestamp: () => Date.now(), // React Native timing
    random: Math.random
  };
  
  return {
    generateBotMove: (word, options) => 
      generateBotMove(word, dependencies, options)
  };
}
```

## **Testing Strategy**

- **Unit tests**: Use test adapter with mocks for deterministic results
- **Integration tests**: Test adapters provide real dependencies  
- **Cross-platform tests**: Same test suite + different adapters
- **Regression tests**: Verify all platforms produce identical results

### **Example: Cross-Platform Test**

```typescript
describe('Bot Move Generation', () => {
  const platforms = [
    createNodeAdapter(),
    createBrowserAdapter(), 
    createTestAdapter()
  ];
  
  platforms.forEach((adapter, index) => {
    it(`generates valid moves on platform ${index}`, () => {
      const result = adapter.generateBotMove('CAT');
      expect(result.move).toBeDefined();
      expect(result.move.word).toMatch(/^[A-Z]+$/);
    });
  });
});
```

## **Performance Considerations**

### **Dictionary Pre-loading**
- Adapters handle async initialization once at startup
- Engine operations remain synchronous for performance
- Graceful fallback if dictionary fails to load

### **Dependency Injection Overhead**
- Minimal performance impact (function parameter passing)
- Benefits outweigh costs (testability, maintainability)
- Modern JavaScript engines optimize dependency passing

## **Error Handling Strategy**

### **Dependency Missing**
```typescript
if (!dependencies.validateWord) {
  throw new Error('BotDependencies.validateWord is required');
}
```

### **Dictionary Load Failure**
```typescript
// Adapter falls back to minimal word list
const fallbackWords = ['CAT', 'CATS', 'DOG', 'DOGS'];
```

### **Validation Failure**
```typescript
// Engine returns error state instead of throwing
return { isValid: false, reason: 'system_error' };
```

## **Migration Guide**

### **From Direct Imports to Dependency Injection**

**Before:**
```typescript
import { validateWord } from './dictionary';

export function generateBotMove(word: string) {
  const validation = validateWord(candidate.word);
}
```

**After:**
```typescript
export function generateBotMove(
  word: string, 
  dependencies: BotDependencies
) {
  const validation = dependencies.validateWord(candidate.word);
}
```

### **Consumer Migration**

**Before:**
```typescript
import { generateBotMove } from '@wordplay/engine/bot';

const result = generateBotMove('CAT');
```

**After:**
```typescript
import { createBrowserAdapter } from '@wordplay/adapters/browser';

const gameEngine = createBrowserAdapter();
const result = gameEngine.generateBotMove('CAT');
```

## **Compliance Checklist**

Before accepting any engine changes:
- ✅ Verify engine files have no platform-specific imports
- ✅ Confirm adapters provide all required dependencies  
- ✅ Test same functionality works across Node.js, Browser, and Test environments
- ✅ Update interface contracts if dependencies change
- ✅ Add cross-platform tests for new functionality
- ✅ Document any new dependency requirements 