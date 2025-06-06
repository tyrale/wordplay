# ADR-001: Platform-Agnostic Engine with Dependency Injection

## Status
**ACCEPTED** - December 2024

## Context
Initial implementation created browser-specific engine files (`browserEngine.ts`, `engineExports.ts`) that duplicated core game logic, violating single source of truth principles. This led to:

- Code duplication between Node.js and browser implementations
- Maintenance burden with multiple versions of same logic
- Testing complexity with platform-specific code paths
- Risk of behavioral differences between platforms

## Decision
Implement **Dependency Injection** pattern where engine components accept platform-specific dependencies as parameters instead of importing them directly.

### **Core Principles**
1. **Single Source of Truth**: Game logic exists only in `packages/engine/`
2. **Dependency Injection**: Engine functions accept dependencies as parameters
3. **Platform Adapters**: Only adapters are platform-specific
4. **Interface Contracts**: All interactions via typed interfaces

### **Implementation Pattern**
```typescript
// Engine: Platform-agnostic with dependency injection
export function generateBotMove(
  currentWord: string,
  dependencies: BotDependencies,
  options: BotOptions = {}
): BotResult {
  // Uses provided dependencies, imports nothing platform-specific
}

// Adapter: Platform-specific dependency provider
export function createBrowserAdapter(): GameEngine {
  const dependencies = createBrowserDependencies();
  return {
    generateBotMove: (word, options) => 
      generateBotMove(word, dependencies, options)
  };
}
```

## Consequences

### **Positive**
- **Single Source of Truth**: Game logic exists in one place only
- **Easy Testing**: Comprehensive mocking via dependency injection
- **Platform Agnostic**: Same engine runs on Node.js, Browser, React Native, etc.
- **Clear Separation**: Engine focuses on game logic, adapters handle platform concerns
- **Future Proof**: Simple to add new platforms (Web Workers, Deno, etc.)
- **Maintainable**: Changes to game logic only need to be made once

### **Negative**  
- **Slightly More Complex Initialization**: Need to create dependency providers
- **Breaking Change**: Existing consumers need to use adapters
- **Learning Curve**: Developers need to understand dependency injection pattern

### **Neutral**
- **Minimal Performance Impact**: Function parameter passing is negligible
- **More Files**: Adapters add structure but improve organization

## Implementation Plan

### **Phase 1**: Documentation and Interfaces
- Create comprehensive architectural documentation
- Define dependency interfaces (`BotDependencies`, `ScoringDependencies`, etc.)
- Document forbidden patterns and enforcement rules

### **Phase 2**: Remove Browser-Specific Code
- Delete `browserEngine.ts`, `browserDictionary.ts`, `engineExports.ts`
- Remove browser-specific imports from React components

### **Phase 3**: Make Engine Agnostic
- Modify engine functions to accept dependencies
- Remove all platform-specific imports from engine files

### **Phase 4**: Create Platform Adapters
- Node.js adapter with file system dictionary
- Browser adapter with HTTP dictionary  
- Test adapter with mocks

### **Phase 5**: Update Consumers
- Terminal game uses Node.js adapter
- React app uses browser adapter
- Tests use test adapter

### **Phase 6**: Verification and Cleanup
- Cross-platform testing to ensure identical behavior
- Remove deprecated functions
- Update documentation

## Enforcement

### **Code Review Requirements**
- ✅ Engine files have no platform-specific imports
- ✅ Adapters provide all required dependencies
- ✅ Changes include cross-platform tests
- ✅ Interface contracts updated if dependencies change

### **Automated Checks**
- CI verifies no forbidden file patterns (`*browserEngine*`, `*engineAdapter*`)
- TypeScript compilation ensures interface compliance
- Cross-platform test suite runs on all adapters

### **Forbidden Patterns**
- ❌ Direct imports of platform-specific modules in engine
- ❌ Browser-specific engine implementations
- ❌ Code duplication between platform implementations
- ❌ Platform-specific modifications to core game logic

## Alternatives Considered

### **1. Continue Browser-Specific Engine**
- **Pros**: No breaking changes, simple to understand
- **Cons**: Code duplication, maintenance burden, behavioral drift
- **Rejected**: Violates architectural principles

### **2. Conditional Imports**
- **Pros**: Single file with platform detection
- **Cons**: Complex build configuration, runtime platform detection
- **Rejected**: Harder to test and maintain

### **3. Build-Time Code Generation**
- **Pros**: Generates platform-specific versions
- **Cons**: Complex build process, debugging difficulty
- **Rejected**: Over-engineering for current needs

## Success Metrics

### **Technical Metrics**
- ✅ Single implementation of all game logic
- ✅ 100% test coverage via dependency injection
- ✅ Identical behavior across all platforms
- ✅ Zero code duplication in engine components

### **Developer Experience Metrics**
- ✅ Clear documentation and examples
- ✅ Simple adapter creation for new platforms
- ✅ Fast feedback from cross-platform tests
- ✅ Reduced maintenance burden

## References

- [Dependency Injection Pattern](https://en.wikipedia.org/wiki/Dependency_injection)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [WordPlay Architecture Documentation](./ARCHITECTURE.md) 