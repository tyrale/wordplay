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
├── dictionary.ts         # Word validation (accepts dependencies)
├── gamestate.ts          # Game state management (accepts dependencies)
├── challenge.ts          # Challenge mode logic
├── profanity.ts          # Profanity filtering system
├── unlocks.ts            # Achievement/unlock system
└── interfaces.ts         # All engine dependency contracts

src/adapters/             # Platform-specific implementations (main adapters)
├── browserAdapter.ts     # Unified web adapter (HTTP fetch, performance.now)
├── webAdapter.ts         # Thin alias to browserAdapter for compatibility
├── nodeAdapter.ts        # Node.js file system, performance.now()
└── testAdapter.ts        # Mocks, deterministic random

src/contexts/             # React context providers for shared state
├── VanityFilterContext.tsx  # Vanity filter state management
└── [Future filters follow same pattern]

src/hooks/                # React hooks for component state
├── useVanityFilter.ts    # Vanity filter hook (consumes context)
└── [Future filter hooks follow same pattern]

packages/adapters/        # Specialized feature adapters
├── browser/              # Browser-specific challenge/unlock implementations
├── node/                 # Node.js-specific unlock implementations
└── test/                 # Test-specific unlock implementations
```

### **Web Adapter System (Unified Implementation)**

Historically the codebase used **two different web adapters** for different components:

- **`browserAdapter.ts`**: Used by challenge mode (`ChallengeGame`) and hooks (`useGameState`)
- **`webAdapter.ts`**: Used by interactive game mode (`InteractiveGame`)

Both provided the same `GameStateDependencies` interface but with separate implementations, which created duplication and confusion.

The architecture has now been **simplified** so that:

- `browserAdapter.ts` contains the **single, canonical web implementation**.
- `webAdapter.ts` is a **thin alias** that re-exports the browser adapter under the `WebAdapter` / `createWebAdapter` names for compatibility with existing code and documentation.

New web code should import from `browserAdapter.ts` directly; `webAdapter.ts` exists only as a compatibility layer.

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
export function generateBotMoveWithDependencies(
  currentWord: string,
  dependencies: BotDependencies,
  options: BotOptions = {}
): Promise<BotResult> {
  // Uses provided dependencies, imports nothing platform-specific
  const validation = dependencies.validateWord(candidate.word);
  const isValid = dependencies.isValidDictionaryWord(candidate.word);
  // ... game logic using dependencies
}
```

### **Platform Adapters Provide Dependencies**

```typescript
// ✅ CORRECT: Browser adapter provides dependencies
export class BrowserAdapter {
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.wordData.waitForLoad();
    this.initialized = true;
  }

  getGameDependencies(): GameStateDependencies {
    return {
      validateWord: (word: string, options?: any): ValidationResult => {
        return validateWordWithDependencies(word, this.wordData, options);
      },
      calculateScore: (fromWord: string, toWord: string, options?: any): ScoringResult => {
        return calculateScore(fromWord, toWord, options);
      },
      generateBotMove: async (word: string, options?: any): Promise<BotResult> => {
        return generateBotMoveWithDependencies(word, this.getBotDependencies(), options);
      }
    };
  }
}
```

## **Current Interface Contracts**

### **Core Engine Interfaces**

```typescript
// From packages/engine/interfaces.ts
export interface GameStateDependencies extends 
  GameStateDictionaryDependencies, 
  GameStateScoringDependencies, 
  GameStateBotDependencies {}

export interface GameStateDictionaryDependencies {
  validateWord: (word: string, options?: any) => ValidationResult;
  getRandomWordByLength: (length: number) => string | null;
}

export interface GameStateScoringDependencies {
  calculateScore: (fromWord: string, toWord: string, options?: any) => ScoringResult;
  getScoreForMove: (fromWord: string, toWord: string, keyLetters?: string[]) => number;
  isValidMove: (fromWord: string, toWord: string) => boolean;
}

export interface GameStateBotDependencies {
  generateBotMove: (word: string, options?: any) => Promise<BotResult>;
}

export interface WordDataDependencies {
  enableWords: Set<string>;
  slangWords: Set<string>;
  profanityWords: Set<string>;
  wordCount: number;
  hasWord: (word: string) => boolean;
  isLoaded: () => boolean;
  waitForLoad: () => Promise<void>;
  getRandomWordByLength: (length: number) => string | null;
}
```

## **Integration Examples**

### **✅ CORRECT: Challenge mode uses browser adapter**
```typescript
// ChallengeGame.tsx
import { createBrowserAdapter } from '../../adapters/browserAdapter';

useEffect(() => {
  const initializeGameDependencies = async () => {
    const adapter = await createBrowserAdapter();
    const dependencies = adapter.getGameDependencies();
    setGameDependencies(dependencies);
  };
  initializeGameDependencies();
}, []);
```

### **✅ CORRECT: Interactive game uses web adapter**
```typescript
// InteractiveGame.tsx
import { createWebAdapter } from '../../adapters/webAdapter';

useEffect(() => {
  const initializeGameDependencies = async () => {
    const adapter = await createWebAdapter();
    const dependencies = adapter.getGameDependencies();
    // Use dependencies as needed
  };
  initializeGameDependencies();
}, []);
```

### **✅ CORRECT: Hooks use browser adapter**
```typescript
// useGameState.ts
import { BrowserAdapter } from '../adapters/browserAdapter';

useEffect(() => {
  async function initializeGameManager() {
    const browserAdapter = BrowserAdapter.getInstance();
    await browserAdapter.initialize();
    const dependencies = browserAdapter.getGameDependencies();
    gameManagerRef.current = createGameStateManagerWithDependencies(dependencies, config);
  }
  initializeGameManager();
}, [config]);
```

### **✅ CORRECT: Tests use test adapter**
```typescript
// App.test.tsx
import { createTestAdapter } from './adapters/testAdapter';

// Mock the BrowserAdapter to use TestAdapter instead
vi.mock('./adapters/browserAdapter', () => {
  return {
    BrowserAdapter: {
      getInstance: () => {
        const testAdapter = createTestAdapter();
        return {
          initialize: async () => {},
          getGameDependencies: () => testAdapter.getGameDependencies()
        };
      }
    }
  };
});
```

### **❌ WRONG: Direct engine import**
```typescript
// Browser code  
import { generateBotMoveWithDependencies } from '../../packages/engine/bot'; // ❌ Missing dependencies
```

### **❌ WRONG: Browser-specific engine**
```typescript
// ❌ FORBIDDEN: browserEngine.ts - This violates single source of truth
export function generateBrowserBotMove(word: string) {
  // Reimplementing engine logic for browsers
}
```

## **Adding New Platforms**

1. Create new adapter in `src/adapters/[platform]Adapter.ts`
2. Implement all required dependency interfaces (`GameStateDependencies`)
3. Export factory function: `createPlatformAdapter()`
4. Platform code imports adapter, never engine directly

### **Example: Adding React Native Support**

```typescript
// src/adapters/reactNativeAdapter.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameStateDependencies } from '../../packages/engine/interfaces';

export class ReactNativeAdapter {
  private static instance: ReactNativeAdapter | null = null;
  
  static getInstance(): ReactNativeAdapter {
    if (!ReactNativeAdapter.instance) {
      ReactNativeAdapter.instance = new ReactNativeAdapter();
    }
    return ReactNativeAdapter.instance;
  }

  getGameDependencies(): GameStateDependencies {
    return {
      validateWord: reactNativeValidateWord,
      calculateScore: (fromWord, toWord, options) => calculateScore(fromWord, toWord, options),
      generateBotMove: async (word, options) => 
        generateBotMoveWithDependencies(word, this.getBotDependencies(), options)
    };
  }
}

export async function createReactNativeAdapter(): Promise<ReactNativeAdapter> {
  const adapter = ReactNativeAdapter.getInstance();
  await adapter.initialize();
  return adapter;
}
```

## **Testing Strategy**

- **Unit tests**: Use test adapter with mocks for deterministic results
- **Integration tests**: Test adapters provide real dependencies  
- **Cross-platform tests**: Same test suite + different adapters
- **Regression tests**: Verify all platforms produce identical results

### **Current Test Results (Verified 2025-01-22)**
- **Total Tests**: 307 tests
- **Passing**: 264 tests (86%)
- **Failing**: 43 tests (14%) - mainly scoring interface mismatches
- **Test Files**: 17 passed, 7 failed

### **Example: Cross-Platform Test Pattern**

```typescript
describe('Bot Move Generation', () => {
  const adapters = [
    createTestAdapter(),    // Deterministic for unit tests
    createBrowserAdapter(), // Real HTTP dictionary loading  
    createWebAdapter()      // Alternative web implementation
  ];
  
  adapters.forEach((adapter, index) => {
    it(`generates valid moves on platform ${index}`, async () => {
      const deps = adapter.getGameDependencies();
      const result = await deps.generateBotMove('CAT');
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

```typescript
// Browser adapter waits for dictionary before marking as initialized
async initialize(): Promise<void> {
  if (this.initialized) return;
  await this.wordData.waitForLoad();
  this.initialized = true;
}
```

### **Dependency Injection Overhead**
- Minimal performance impact (function parameter passing)
- Benefits outweigh costs (testability, maintainability)
- Modern JavaScript engines optimize dependency passing

## **Error Handling Strategy**

### **Dependency Missing**
```typescript
if (!dependencies.validateWord) {
  throw new Error('GameStateDependencies.validateWord is required');
}
```

### **Dictionary Load Failure**
```typescript
// Adapter falls back to minimal word list
private initializeFallback(): void {
  console.warn('Dictionary load failed, using fallback word list');
  const fallbackWords = ['CAT', 'CATS', 'DOG', 'DOGS', 'BIRD', 'BIRDS'];
  this.enableWords = new Set(fallbackWords);
  this.wordCount = this.enableWords.size;
  this.loaded = true;
}
```

### **Validation Failure**
```typescript
// Engine returns error state instead of throwing
return { 
  isValid: false, 
  reason: 'system_error',
  userMessage: 'Unable to validate word. Please try again.'
};
```

## **Migration Guide**

### **From Direct Imports to Dependency Injection**

**Before:**
```typescript
import { validateWordWithDependencies } from './dictionary';

export function generateBotMove(word: string) {
  const validation = validateWordWithDependencies(candidate.word);
}
```

**After:**
```typescript
export function generateBotMoveWithDependencies(
  word: string, 
  dependencies: BotDependencies
) {
  const validation = dependencies.validateWord(candidate.word);
}
```

### **Consumer Migration**

**Before:**
```typescript
import { generateBotMove } from '../../packages/engine/bot';

const result = generateBotMove('CAT');
```

**After:**
```typescript
import { createBrowserAdapter } from '../adapters/browserAdapter';

const adapter = await createBrowserAdapter();
const deps = adapter.getGameDependencies();
const result = await deps.generateBotMove('CAT');
```

## **Current Architecture Issues**

### **Interface Mismatches** 
- Tests expect `result.breakdown.addLetterPoints` but get different structure
- Scoring module interfaces need alignment between engine and consumers
- 43 failing tests indicate API inconsistencies

### **Next Steps for Cleanup**
1. Consolidate `browserAdapter` and `webAdapter` into single implementation
2. Fix scoring interface mismatches causing test failures
3. Update all consumers to use consistent adapter pattern
4. Remove debug logging statements throughout codebase

## **Compliance Checklist**

Before accepting any engine changes:
- ✅ Verify engine files have no platform-specific imports
- ✅ Confirm adapters provide all required dependencies  
- ✅ Test same functionality works across all adapter implementations
- ✅ Update interface contracts if dependencies change
- ✅ Add cross-platform tests for new functionality
- ✅ Document any new dependency requirements
- ✅ Verify test suite passes (currently 264/307 passing)

---

## **Architecture Decision History**

This section documents major architectural decisions made during the WordPlay project development, providing context for current design choices and lessons learned.

### **ADR-001: Dependency Injection Architecture (Phase 1)**

**Date**: Phase 1 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Adopt dependency injection pattern for game engine

**Context**: 
- Need to support multiple platforms (web, terminal, future mobile)
- Avoid code duplication between platforms
- Enable comprehensive testing with mocks
- Maintain single source of truth for game logic

**Decision**: 
- Core game engine accepts dependencies as parameters
- Platform adapters provide platform-specific implementations
- No direct imports between engine modules
- Interface contracts define all dependencies

**Consequences**:
- ✅ **Positive**: Zero code duplication across platforms
- ✅ **Positive**: Comprehensive test coverage with controlled dependencies
- ✅ **Positive**: Easy to add new platforms
- ⚠️ **Negative**: Slightly more complex initial setup
- ⚠️ **Negative**: Requires discipline to maintain separation

**Implementation**: 
- Created `packages/engine/interfaces.ts` with dependency contracts
- Refactored all engine modules to accept dependencies
- Created platform adapters in `src/adapters/`
- Updated all consumers to use adapters

### **ADR-002: Platform-Agnostic Dictionary Loading (Phase 1)**

**Date**: Phase 1 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Abstract dictionary loading behind dependency interface

**Context**:
- Browser needs HTTP fetch for dictionary
- Node.js needs file system access
- Tests need controlled word sets
- All platforms need same validation logic

**Decision**:
- Dictionary loading is platform-specific (adapter responsibility)
- Word validation logic is platform-agnostic (engine responsibility)
- Graceful fallback for dictionary loading failures
- Interface provides validation functions, not raw dictionary data

**Consequences**:
- ✅ **Positive**: Same validation logic across all platforms
- ✅ **Positive**: Flexible dictionary sources (HTTP, file system, memory)
- ✅ **Positive**: Robust error handling with fallbacks
- ⚠️ **Negative**: Async initialization required for some platforms

**Implementation**:
- `WordDataDependencies` interface with validation functions
- Browser adapter uses HTTP fetch with fallback word list
- Node.js adapter uses file system with multiple path fallbacks
- Test adapter uses controlled word sets

### **ADR-003: Enhanced Validation System (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Extend validation to return user-friendly error messages

**Context**:
- Players need clear feedback on why moves are invalid
- Different error types require different user messages
- Terminal and web interfaces need consistent messaging
- Debugging requires technical error codes

**Decision**:
- `ValidationResult` includes both technical `reason` and user-friendly `userMessage`
- Comprehensive error types for all validation scenarios
- Consistent messaging across platforms
- Backward compatibility with existing validation

**Consequences**:
- ✅ **Positive**: Clear user feedback improves game experience
- ✅ **Positive**: Consistent error messages across platforms
- ✅ **Positive**: Better debugging with detailed error codes
- ⚠️ **Negative**: Increased complexity in validation logic

**Implementation**:
- Extended `ValidationResult` interface with `userMessage` field
- Updated all validation functions to provide user messages
- Comprehensive error message mapping
- Cross-platform consistency testing

### **ADR-004: React Component Architecture (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Component-based UI with theme system and responsive design

**Context**:
- Need reusable UI components for consistency
- Support multiple themes and responsive design
- Maintain accessibility standards
- Enable component development with Storybook

**Decision**:
- React component library with TypeScript
- CSS custom properties for theming
- Mobile-first responsive design
- Comprehensive accessibility support
- Storybook for component development

**Consequences**:
- ✅ **Positive**: Consistent UI across all screens
- ✅ **Positive**: Easy theme switching and customization
- ✅ **Positive**: Excellent mobile and desktop experience
- ✅ **Positive**: Strong accessibility compliance
- ⚠️ **Negative**: Initial setup complexity for theme system

**Implementation**:
- Created component library in `src/components/`
- Theme system with multiple theme options
- Responsive CSS with mobile-first approach
- WCAG AA accessibility compliance
- Storybook integration for development

### **ADR-005: Scoring Algorithm Refinement (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Fix scoring algorithm to prevent false rearrangement detection

**Context**:
- Original algorithm incorrectly scored natural position shifts as rearrangements
- Players confused by unexpected scoring behavior
- Need accurate scoring for fair gameplay
- Maintain performance requirements

**Decision**:
- Implement subsequence analysis for stayed letters
- Only true letter reordering counts as rearrangement
- Conservative approach to avoid false positives
- Maintain independent scoring for different action types

**Consequences**:
- ✅ **Positive**: Accurate scoring matches player expectations
- ✅ **Positive**: Fair gameplay with correct point allocation
- ✅ **Positive**: Maintained performance targets
- ⚠️ **Negative**: Required extensive testing to verify correctness

**Implementation**:
- Refined rearrangement detection algorithm
- Added subsequence analysis for stayed letters
- Comprehensive test coverage for edge cases
- Performance optimization maintained

### **ADR-006: Dual Adapter System (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **CONSOLIDATED (VIA SINGLE IMPLEMENTATION)**  
**Decision**: Implement both browserAdapter and webAdapter for different use cases

**Context**:
- Different components had different adapter requirements
- Challenge mode needed specific browser optimizations
- Interactive game used alternative web implementation
- Both provided same interface but different internals

**Decision**:
- Maintain `browserAdapter.ts` for challenge mode and hooks
- Keep `webAdapter.ts` for interactive game mode
- Both implement `GameStateDependencies` interface
- Allow specialized implementations for different contexts

**Consequences**:
- ✅ **Positive**: Specialized optimizations for different use cases
- ✅ **Positive**: Maintains interface consistency
- ⚠️ **Negative**: Code duplication and maintenance overhead
- ⚠️ **Negative**: Confusion about which adapter to use

**Current Status**: Implemented via a single browser adapter implementation; `webAdapter.ts` now re-exports the browser adapter as a compatibility layer.

### **ADR-007: Profanity Management System (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Implement JSON-based profanity filtering with unlock system

**Context**:
- Need consistent profanity filtering across platforms
- Support for user preference and unlock system
- Maintainable word lists separate from code
- Performance requirements for real-time filtering

**Decision**:
- JSON-based profanity word lists in `public/data/`
- Centralized profanity management in `packages/engine/profanity.ts`
- Platform-agnostic filtering with adapter-provided word lists
- Unlock system integration for mature content

**Consequences**:
- ✅ **Positive**: Maintainable word lists separate from code
- ✅ **Positive**: Consistent filtering across all platforms
- ✅ **Positive**: User control through unlock system
- ✅ **Positive**: Platform-agnostic implementation

**Implementation**:
- JSON files: `profanity-words.json`, `slang-words.json`
- Centralized profanity management utility
- Adapter integration for word list loading
- Unlock system integration

### **Lessons Learned**

**Successful Patterns**:
1. **Dependency Injection**: Enabled true platform-agnostic design
2. **Interface-First Design**: Clear contracts prevented coupling issues
3. **Comprehensive Testing**: Caught issues early and enabled confident refactoring
4. **Mobile-First Design**: Resulted in excellent experience across all devices
5. **Component Architecture**: Enabled rapid UI development and consistency

**Challenges Overcome**:
1. **Platform Differences**: Solved with adapter pattern and careful abstraction
2. **Mobile Touch Events**: Required custom event handling but achieved reliability
3. **Scoring Algorithm Complexity**: Iterative refinement led to accurate implementation
4. **Performance Requirements**: Met through careful optimization and measurement

**Current Technical Debt**:
1. **Test Interface Mismatches**: 43 failing tests due to scoring interface changes
2. **Debug Log Cleanup**: Remove development debugging statements
3. **Documentation Alignment**: Update docs to match current implementation

## **Filter System Architecture**

### **Vanity Filter System (Reference Implementation)**

The vanity filter system demonstrates the **reference architecture** for all filter implementations:

#### **Core Components**
- **Context Provider**: `VanityFilterProvider` centralizes state management
- **Hook**: `useVanityFilter` consumes context and provides component API
- **App Integration**: Wrapped in `App.tsx` for global access
- **Engine Integration**: Uses dependency injection for word data

#### **Key Features**
- **Live Updates**: Toggle changes apply immediately without page refresh
- **Shared State**: All components use same context for consistency
- **Persistence**: Settings saved to localStorage and restored
- **Unlock System**: Triggered through gameplay with toast notifications
- **Menu Integration**: Toggle appears in mechanics section when unlocked

#### **Architecture Pattern**
```
VanityFilterProvider (Context)
    ↓
useVanityFilter (Hook)
    ↓
Components (CurrentWord, WordTrail, Menu, etc.)
    ↓
Engine Functions (getVanityDisplayWordWithDependencies)
```

#### **Template for Future Filters**
All future filters should follow this exact pattern:
1. Create context provider with shared state
2. Implement hook that consumes context
3. Wrap app with provider
4. Update components to use shared hook
5. Add unlock triggers and menu integration
6. Include comprehensive tests

**Reference**: See `docs/VANITY_FILTER_SYSTEM.md` for complete implementation guide.

**Future Considerations**:
1. **React Native Support**: Architecture ready for mobile app development
2. **Multiplayer Architecture**: Dependency injection supports server-side game logic
3. **Advanced AI**: Bot interface can support more sophisticated algorithms
4. **Accessibility Enhancements**: Foundation in place for further improvements

---

*This architecture has been battle-tested through comprehensive development and provides a solid foundation for future enhancements, with some consolidation needed to reduce maintenance overhead.* 