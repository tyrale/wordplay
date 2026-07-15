# Testing Reports

> **Purpose**: Historical/reference testing methodology (test matrix, manual QA checklists, accessibility/performance checklists) — largely still useful as *process* documentation. However, the specific numbers and per-file breakdowns below are a frozen snapshot from 2025-01-22 and are now stale in several verified ways (see inline notes). **For current, live test status, always check [PROJECT_STATUS_AUDIT.md](PROJECT_STATUS_AUDIT.md) instead of trusting the numbers in this file.**

This document consolidates all testing information for the WordPlay project, including unit tests, integration tests, responsive design tests, and performance testing.

## Test Environment

- **Node.js Version**: v23.4.0+
- **Platform**: darwin (macOS)
- **Architecture**: arm64
- **Test Framework**: Vitest
- **Browser Testing**: Playwright (Storybook components)
- **Test Command**: `npm test --run`

## Test Status Snapshot (2025-01-22 — STALE, see banner above)

### Overall Test Results 

**RESULTS AS OF 2025-01-22 (do not treat as current — many of the specific failures below have since been fixed, and new ones found; see `PROJECT_STATUS_AUDIT.md`)**:
- **Total Tests**: 307 tests
- **Passing**: 264 tests (86%)
- **Failing**: 43 tests (14%)
- **Test Files**: 17 passed, 7 failed

### Detailed Test Breakdown ✅ **MOSTLY PASSING**

**Engine Tests** (packages/engine/):
- ✅ **Bot Tests**: 35/35 passing
- ✅ **Challenge Tests**: 22/22 passing
- ⚠️ **Dictionary Tests**: 42/48 passing (6 failing - profanity system issues)
- ✅ **GameState Tests**: 9/9 passing
- ⚠️ **Scoring Tests**: 25/60 passing (35 failing - interface mismatches)
- ✅ **Terminal Game Tests**: 17/17 passing
- ✅ **Unlocks Integration**: 7/7 passing

**Web Application Tests** (src/):
- ✅ **App Tests**: 5/5 passing
- ✅ **Tutorial Component Tests**: 9/9 passing
- ✅ **Game End Overlays Tests**: 6/6 passing
- ✅ **Main Screen Tests**: 5/5 passing
- ✅ **Toast Tests**: 4/4 passing
- ✅ **Theme Filtering Tests**: 5/5 passing
- ✅ **Unlock Integration Tests**: 3/3 passing
- ✅ **Bot Registry Tests**: 9/9 passing

**Storybook Tests** (Browser Components) — STALE: `Button.stories`, `Header.stories`, and `Page.stories` no longer exist (Storybook boilerplate deleted, see `PROJECT_STATUS_AUDIT.md` step 4), and the indexedDB setup issue affecting the remaining story files has since been fixed (see `PROJECT_STATUS_AUDIT.md` step 8a):
- ~~Button Stories~~ / ~~Header Stories~~ / ~~Page Stories~~: files deleted, no longer applicable
- **WordBuilder Stories**, **GridCell Stories**, **ThemeShowcase Stories**: fixed — passing as of step 8a

### Primary Test Failures Analysis

**1. Scoring Module Interface Mismatches (35 failures)**:
- **Issue**: Tests expect `result.breakdown.addLetterPoints` but receive different structure
- **Root Cause**: Scoring module returns `ScoringResult` but tests expect old `ScoreResult` format
- **Impact**: All scoring breakdown tests failing
- **Status**: Requires interface alignment

**2. Dictionary Profanity System — FIXED** (was 6 failures, see `PROJECT_STATUS_AUDIT.md` step 8):
- Real root cause was narrower than originally diagnosed here: `'SHIT'` was present in the test adapter's `profanityWords` set but never added to `enableWords`, unlike its sibling test words (`DAMN`, `HELL`, `CRAP`, `PISS`). Fixed by adding `'SHIT'` to the test adapter's word list.

**3. Storybook Component Tests — FIXED** (see `PROJECT_STATUS_AUDIT.md` step 8a):
- Root cause: `vitest.workspace.ts`'s `storybook` project extends the base Vite config, and Vitest concatenates rather than replaces `setupFiles`, so the Node/jsdom-only `fake-indexeddb` polyfill in `src/setupTests.ts` ran inside the real Playwright/Chromium browser, where `window.indexedDB` is already a native read-only getter. Fixed by guarding the polyfills behind an `isRealBrowser` check.

### Performance Test Results ✅ **TARGETS MET**

**Dictionary Service**:
- ✅ **Word Validation**: Average <1ms per validation
- ✅ **Dictionary Loading**: ~2-3 seconds (browser), <100ms (Node.js)
- ✅ **Full Dictionary**: 172,819 words loaded successfully

**Scoring Module**:
- ✅ **Score Calculation**: Average <2ms per scoring operation
- ✅ **Complex Scoring**: Multi-action scoring <5ms

**Bot AI**:
- ✅ **Move Generation**: Average latency <100ms
- ✅ **Complex Scenarios**: Handles difficult positions

**Game State Manager**:
- ✅ **State Operations**: <5ms per move
- ✅ **Subscription Updates**: Efficient React state propagation

## Responsive Design Testing

### Screen Size Test Matrix

| Device | Width | Height | Type | Status |
|--------|-------|--------|------|--------|
| iPhone SE | 375px | 667px | mobile | ✅ Verified |
| iPhone 12 | 390px | 844px | mobile | ✅ Verified |
| iPhone 12 Pro Max | 428px | 926px | mobile | ✅ Verified |
| iPad Mini | 768px | 1024px | tablet | ✅ Verified |
| iPad Pro | 1024px | 1366px | tablet | ✅ Verified |
| Desktop Small | 1280px | 720px | desktop | ✅ Verified |
| Desktop Large | 1920px | 1080px | desktop | ✅ Verified |
| Ultrawide | 2560px | 1440px | desktop | ✅ Verified |

### Browser Compatibility Matrix

| Browser | Desktop | Tablet | Mobile | Notes |
|---------|---------|--------|--------|-------|
| Chrome | ✅ Verified | ✅ Verified | ✅ Verified | Full functionality |
| Firefox | ✅ Verified | ✅ Verified | ✅ Verified | Full functionality |
| Safari | ✅ Verified | ✅ Verified | ✅ Verified | Full functionality |
| Edge | ✅ Verified | ✅ Verified | ✅ Verified | Full functionality |

### Responsive Design Checklist ✅ **ALL VERIFIED**

**Layout Tests**:
- ✅ **Game board centers properly** (All screen sizes)
- ✅ **No horizontal scrolling** (Verified across all breakpoints)
- ✅ **All elements visible without scrolling** (Proper viewport usage)
- ✅ **Touch targets meet 44px minimum** (Mobile accessibility compliance)
- ✅ **Text remains readable at all sizes** (Responsive typography)

**Interaction Tests**:
- ✅ **Grid cells respond to touch/click** (Cross-platform compatibility)
- ✅ **Theme selector works** (All devices and browsers)
- ✅ **Submit button responds correctly** (Touch and mouse events)
- ✅ **Drag and drop works on touch devices** (Mobile gesture support)

**Visual Tests**:
- ✅ **Theme colors apply correctly** (Multiple themes tested)
- ✅ **Typography scales appropriately** (Responsive font sizing)
- ✅ **Inter Black font loads and displays** (Font loading verification)
- ✅ **High contrast mode supported** (Accessibility compliance)
- ✅ **Reduced motion preferences respected** (User preference support)

**Performance Tests**:
- ✅ **Page loads in under 3 seconds** (Performance target met)
- ✅ **Smooth animations and transitions** (60fps target)
- ✅ **No layout shifts during load** (CLS optimization)
- ✅ **Responsive to orientation changes** (Mobile device rotation)

## Build and Bundle Testing

### Build Status ❌ **CURRENTLY FAILING** (STALE — see `PROJECT_STATUS_AUDIT.md`)

**Current Bundle Analysis**:
- ❌ **TypeScript Compilation**: `npx tsc -b` fails with real errors in `packages/engine/scoring.ts`/`terminal-game.ts` (the `ScoringResult.breakdown` shape inconsistency, audit step 7a) — verified failing, not passing
- ❌ **Vite Build**: Cannot complete since `npm run build` is `tsc -b && vite build`, and `tsc -b` fails first
- ✅ **Asset Optimization**: Images and fonts properly bundled (unaffected — this claim is about Vite's bundler behavior itself, not the current blocked build)
- N/A **Bundle Performance**: Cannot measure until the build succeeds

**Build Performance**:
- ❌ **ESLint**: STALE claim — `PROJECT_STATUS_AUDIT.md` found 152 errors / 16 warnings at its most recent full audit; current count not re-verified here, run `npx eslint .`
- ✅ **Prettier**: All files formatted correctly
- ❌ **Build Time claim is misleading**: `npm run build` (`tsc -b && vite build`) currently **fails** at the `tsc -b` step (verified) — see `PROJECT_STATUS_AUDIT.md` step 7a

### Development Server Testing ✅ **VERIFIED**

**Local Development**:
- ✅ **Server URL**: http://localhost:5173/
- ✅ **Hot Module Replacement**: Working correctly
- ✅ **Live Reload**: Functional
- ✅ **Error Overlay**: Displays TypeScript and runtime errors
- ✅ **Network Access**: Server accessible via local network

## Cross-Platform Architecture Testing

### Platform Adapter Testing ✅ **VERIFIED**

**Browser Adapter** (`src/adapters/browserAdapter.ts`):
- ✅ **HTTP Dictionary Loading**: Full ENABLE dictionary loaded via fetch
- ✅ **Profanity System**: JSON-based word lists loaded correctly
- ✅ **Fallback System**: Graceful degradation to minimal word set
- ✅ **Dependency Injection**: All GameStateDependencies implemented
- ✅ **Async Initialization**: Proper await patterns for dictionary loading

**Node Adapter** (`src/adapters/nodeAdapter.ts`):
- ✅ **File System Dictionary Loading**: Used by the terminal/CLI game (`packages/engine/terminal-game.ts`)
- ✅ **Dependency Injection**: All GameStateDependencies implemented

**Note**: `src/adapters/webAdapter.ts` does not exist — there is no separate "Web Adapter." `browserAdapter.ts` above is used by every web component including `InteractiveGame.tsx`.

**Test Adapter** (`src/adapters/testAdapter.ts`):
- ✅ **Controlled Test Environment**: Deterministic word sets
- ✅ **Dynamic Word Management**: Add/remove words for testing
- ✅ **Fast Initialization**: Synchronous setup
- ✅ **Predictable Results**: Consistent test outcomes
- ✅ **Mock Integration**: Works with vitest mocking

### Integration Testing ⚠️ **MIXED RESULTS**

**Successful Integration Tests**:
- ✅ **Adapter Interface Compliance**: All adapters implement GameStateDependencies
- ✅ **Engine Function Integration**: Bot, scoring, dictionary functions work with adapters
- ✅ **React Component Integration**: Hooks properly consume adapter dependencies
- ✅ **Cross-Platform Consistency**: Same game logic across all adapters

**Integration Issues**:
- ⚠️ **Test Environment Limitations**: HTTP fetch and file system access limited in test sandbox
- ⚠️ **Mock Complexity**: Some integration tests require extensive mocking
- ⚠️ **Timing Dependencies**: Async initialization can cause test timing issues

## Manual Testing Procedures

### Desktop Testing Checklist

**Chrome, Firefox, Safari, Edge**:
1. ✅ Open http://localhost:5173 in each browser
2. ✅ Test game functionality (word building, scoring, bot moves)
3. ✅ Verify challenge mode works correctly
4. ✅ Test theme switching (multiple themes verified)
5. ✅ Verify responsive behavior on window resize
6. ✅ Test error handling (invalid words, network issues)

### Mobile Testing Checklist

**Chrome Mobile, Safari Mobile, Firefox Mobile**:
1. ✅ Open http://localhost:5173 on mobile device
2. ✅ Test touch interactions (drag to build words)
3. ✅ Verify in portrait and landscape orientations
4. ✅ Check touch targets are appropriately sized
5. ✅ Test menu and theme selection on mobile

### Tablet Testing Checklist

**iPad Safari, Android Chrome**:
1. ✅ Open http://localhost:5173 on tablet device
2. ✅ Test game functionality in both orientations
3. ✅ Verify layout scales appropriately for tablet size
4. ✅ Test challenge mode on tablet interface

## Accessibility Testing ✅ **WCAG AA COMPLIANT**

### Accessibility Checklist

**Visual Accessibility**:
- ✅ **High contrast mode support** (System preference detection)
- ✅ **Color contrast meets WCAG AA standards** (Theme combinations tested)
- ✅ **Reduced motion preferences respected** (Animation control)
- ✅ **Font scaling support** (Responsive typography)

**Interaction Accessibility**:
- ✅ **Touch target minimum 44px** (Mobile accessibility compliance)
- ✅ **Clear visual feedback** (Hover states, active states)
- ✅ **Error message clarity** (Descriptive validation feedback)
- ✅ **Intuitive interaction patterns** (Drag-and-drop with clear affordances)

**Technical Accessibility**:
- ✅ **ARIA labels implemented** (Screen reader support)
- ✅ **Semantic HTML structure** (Proper heading hierarchy)
- ✅ **Alternative text** (Image and icon descriptions)
- ✅ **Focus management** (Logical interaction flow)

## Performance Monitoring

### Core Web Vitals ✅ **GOOD PERFORMANCE**

**Measured Performance**:
- ✅ **Loading Speed**: Application loads and becomes interactive quickly
- ✅ **Runtime Performance**: Smooth animations and interactions
- ✅ **Memory Usage**: No significant memory leaks detected
- ✅ **Network Efficiency**: Dictionary loading optimized

### Performance Benchmarks

**Game Performance**:
- ✅ **Word Validation**: <1ms per word
- ✅ **Scoring Calculation**: <2ms per move
- ✅ **Bot Move Generation**: <100ms average
- ✅ **Game State Updates**: <5ms per move
- ✅ **UI Updates**: Smooth 60fps animations

## Test Automation

### Continuous Integration Testing

**Development Workflow**:
- ❌ **Lint Check**: STALE — see `PROJECT_STATUS_AUDIT.md` for current ESLint error/warning count
- ✅ **Format Check**: Prettier validation
- ❌ **Type Check**: `npx tsc -b` currently fails (verified) — see `PROJECT_STATUS_AUDIT.md` step 7a
- ⚠️ **Unit Tests**: STALE number — see `PROJECT_STATUS_AUDIT.md` for current pass/fail count
- ❌ **Build Test**: `npm run build` currently fails at the `tsc -b` step (verified)

### Test Commands

```bash
# Run all tests with output
npm test --run

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- dictionary.test.ts

# Run tests with coverage report
npm test -- --coverage

# Run linting
npm run lint

# Run formatting check
npm run format:check

# Build for production
npm run build

# Start development server
npm run dev

# Start development server on network
npm run dev -- --host

# Play terminal game
npm run play
```

## Known Issues and Current Technical Debt

### Test Suite Issues (As of 2025-01-22)

**Critical Issues Requiring Resolution** (STALE — see `PROJECT_STATUS_AUDIT.md` for current, maintained status):

1. **Scoring Interface Mismatch — still open**, tracked as step 7a in `PROJECT_STATUS_AUDIT.md`:
   - **Problem**: `calculateScore()` returns `breakdown: string[]`, but `scoring.test.ts` expects a structured `{addLetterPoints, removeLetterPoints, movePoints, keyLetterUsagePoints}` object
   - **Priority**: High — this is the only remaining failing test file and the reason `npm run build` currently fails

2. **Profanity System Test Failures — FIXED**: root cause was `'SHIT'` missing from the test adapter's `enableWords` list; fixed by adding it (`PROJECT_STATUS_AUDIT.md` step 8)

3. **Storybook Test Configuration — FIXED**: root cause was `setupFiles` array concatenation in `vitest.workspace.ts` running Node-only polyfills inside a real browser; fixed by guarding polyfills behind an `isRealBrowser` check (`PROJECT_STATUS_AUDIT.md` step 8a)

### Architecture Issues

**Web Adapter Maintenance (Unified)**:
- **Issue (Historical)**: Both `browserAdapter` and `webAdapter` provided similar functionality with separate implementations
- **Current**: `webAdapter.ts` has been deleted entirely. `browserAdapter.ts` is the single web adapter used by all web components.
- **Recommendation**: All web code should use `browserAdapter`. There is no compatibility layer — if you find code that still imports `webAdapter`, update it.

**Debug Code in Production**:
- **Issue**: Development logging statements still present throughout codebase
- **Impact**: Console noise and minor performance overhead
- **Recommendation**: Remove debug logs and implement proper logging levels

### Browser Compatibility

**Current Support Status**:
- ✅ **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- ⚠️ **Legacy Browsers**: Limited support for older browsers
- ✅ **Mobile Browsers**: Full support (iOS Safari, Chrome Mobile, Firefox Mobile)

### Future Testing Improvements

**Planned Enhancements**:
- [ ] **Fix Scoring Test Interface Alignment**: Update tests to match current ScoringResult structure (still open, see `PROJECT_STATUS_AUDIT.md` step 7a)
- [x] **Resolve Profanity System Test Issues**: Done, see `PROJECT_STATUS_AUDIT.md` step 8
- [ ] **E2E Testing**: Playwright tests for complete user workflows
- [ ] **Visual Regression Testing**: Screenshot comparison for UI consistency
- [ ] **Performance Regression Testing**: Automated performance monitoring
- [ ] **Cross-Browser Test Automation**: Automated testing across all supported browsers

## Testing Best Practices

### Current Testing Patterns

**Successful Patterns**:
- ✅ **Adapter Mocking**: Effective use of vitest mocks for browser adapter testing
- ✅ **Dependency Injection Testing**: Engine functions tested with controlled dependencies
- ✅ **Component Integration**: React components tested with proper adapter integration
- ✅ **Deterministic Test Data**: Test adapter provides predictable results

**Areas for Improvement**:
- ⚠️ **Interface Version Alignment**: Keep test expectations current with interface changes
- ⚠️ **Test Environment Setup**: Improve test configuration for external dependencies
- ⚠️ **Error Scenario Coverage**: More comprehensive testing of error conditions

---

*Original snapshot: 2025-01-22. Numbers/specific-failure claims in this file are stale as of this review — see [PROJECT_STATUS_AUDIT.md](PROJECT_STATUS_AUDIT.md) for current status. The methodology/checklist sections (responsive design, accessibility, manual QA) remain valid as process documentation.*