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
- `DictionaryDependencies` interface with validation functions
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
- Theme system with 81 different themes
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

### **ADR-006: Menu System Architecture (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Comprehensive menu system with theme integration and animations

**Context**:
- Need navigation system for game options
- Theme selection should be integrated into menu
- Animations improve user experience
- Mobile-friendly interaction required

**Decision**:
- Full-screen overlay menu with accordion functionality
- Integrated theme selection with live preview
- Animated menu transitions and interactions
- Mobile-optimized touch targets and layout

**Consequences**:
- ✅ **Positive**: Intuitive navigation and theme selection
- ✅ **Positive**: Excellent mobile user experience
- ✅ **Positive**: Smooth animations enhance polish
- ⚠️ **Negative**: Increased complexity in state management

**Implementation**:
- Created `Menu.tsx` with accordion functionality
- Integrated theme system with live preview
- Animated menu button and transitions
- Mobile-responsive design with touch optimization

### **ADR-007: Key Letter Frequency Tracking (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Implement logging system for key letter generation analysis

**Context**:
- Need to analyze randomness of key letter generation
- Track frequency distribution across games
- Identify potential bias in letter selection
- Support game balance analysis

**Decision**:
- Dedicated logging utility with file-based persistence
- Cross-game frequency analysis with statistical reporting
- Real-time logging during gameplay
- Analysis scripts for data visualization

**Consequences**:
- ✅ **Positive**: Data-driven insights into game balance
- ✅ **Positive**: Ability to detect and fix randomness issues
- ✅ **Positive**: Historical tracking for long-term analysis
- ⚠️ **Negative**: Additional file I/O overhead

**Implementation**:
- Created `KeyLetterLogger` utility class
- File-based logging with CSV format
- Analysis script with frequency charts
- Cross-platform logging support

### **ADR-008: Mobile Touch Optimization (Phase 2)**

**Date**: Phase 2 Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Implement comprehensive mobile touch support

**Context**:
- HTML5 drag-and-drop unreliable on mobile devices
- Need consistent interaction across desktop and mobile
- Touch targets must meet accessibility standards
- Performance critical for smooth mobile experience

**Decision**:
- Mouse/touch event system for reliable cross-platform interaction
- 44px minimum touch targets for accessibility
- Gesture detection to distinguish clicks from drags
- Optimized event handling for performance

**Consequences**:
- ✅ **Positive**: Reliable interaction on all devices
- ✅ **Positive**: Excellent mobile user experience
- ✅ **Positive**: Accessibility compliance achieved
- ⚠️ **Negative**: More complex event handling logic

**Implementation**:
- Replaced HTML5 drag-and-drop with mouse/touch events
- Gesture detection with movement threshold
- Touch target optimization across all components
- Cross-platform event handling

### **ADR-009: Build and Deployment Architecture (Phase 0-2)**

**Date**: Throughout Development  
**Status**: ✅ **IMPLEMENTED**  
**Decision**: Modern build toolchain with comprehensive CI/CD

**Context**:
- Need fast development iteration
- Comprehensive testing and quality checks
- Automated deployment to production
- Performance optimization for production builds

**Decision**:
- Vite for fast development and optimized builds
- Vitest for comprehensive testing
- GitHub Actions for CI/CD pipeline
- Vercel for production deployment

**Consequences**:
- ✅ **Positive**: Fast development iteration with HMR
- ✅ **Positive**: Comprehensive automated testing
- ✅ **Positive**: Reliable deployment pipeline
- ✅ **Positive**: Excellent production performance

**Implementation**:
- Vite configuration with TypeScript and React
- Comprehensive test suite with 252+ tests
- GitHub Actions pipeline with quality gates
- Vercel deployment with environment configuration

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

**Future Considerations**:
1. **React Native Support**: Architecture ready for mobile app development
2. **Multiplayer Architecture**: Dependency injection supports server-side game logic
3. **Advanced AI**: Bot interface can support more sophisticated algorithms
4. **Accessibility Enhancements**: Foundation in place for further improvements

---

*This architecture has been battle-tested through comprehensive development and provides a solid foundation for future enhancements.* 