# ShipHip Project Restart Guide

## Current Situation Analysis

**Date:** 2025-01-03  
**Status:** BROKEN - ajv/ajv-keywords dependency conflicts preventing app startup  
**Root Cause:** Aggressive upgrade to bleeding-edge versions (React 19, Expo SDK 53) without proper compatibility verification

### What Was Working Before Issues
- ✅ 137/137 tests passing across all packages
- ✅ Core game engine (dictionary, scoring, bot AI, game state)
- ✅ UI components with React Native integration
- ✅ Single-player game fully functional
- ✅ CI/CD pipeline with GitHub Actions + EAS
- ✅ Supabase integration and schema
- ✅ TypeScript compilation across monorepo

### What Broke and Why
- ❌ React 19.0.0 ↔ react-test-renderer 19.1.0 version mismatch
- ❌ ajv/ajv-keywords dependency incompatibility in Expo ecosystem
- ❌ Expo SDK 53 bleeding-edge instability
- ❌ Multiple cascade dependency conflicts

## Recovery Strategy: Fresh Start with Stable Stack

### Phase 1: Clean Slate Preparation
1. **Backup Current Codebase**
   ```bash
   # Create backup of current broken state
   cp -r /Users/tyrale.bloomfield/wordplay /Users/tyrale.bloomfield/wordplay-backup-broken
   ```

2. **Preserve Essential Code**
   - Game engine logic (`packages/engine/src/*`)
   - Bot AI algorithms (`packages/engine/src/ai/*`)
   - UI components structure (`wordgame/components/*`)
   - Test suites (`**/__tests__/*`)
   - Documentation (`docs/*`)

### Phase 2: New Project Foundation

#### Target Tech Stack (STABLE VERSIONS)
```json
{
  "expo": "~51.0.0",
  "react": "18.2.0",
  "react-native": "0.74.5",
  "typescript": "^5.3.0",
  "@supabase/supabase-js": "^2.39.0",
  "zustand": "^4.4.0",
  "@testing-library/react-native": "^12.4.0",
  "jest": "^29.7.0"
}
```

#### Project Structure
```
wordplay-fresh/
├── packages/
│   └── engine/              # Game logic (PRESERVE)
│       ├── src/
│       │   ├── dictionary/
│       │   ├── scoring/
│       │   ├── ai/
│       │   └── gameState/
│       └── __tests__/
├── wordgame/               # Main app (REBUILD)
│   ├── app/               # Expo Router
│   ├── components/        # UI (PRESERVE LOGIC)
│   └── lib/
├── docs/                  # Documentation (PRESERVE)
└── README.md
```

### Phase 3: Step-by-Step Rebuild

#### Step 1: Create Fresh Expo Project
```bash
cd /Users/tyrale.bloomfield
npx create-expo-app wordplay-fresh --template blank-typescript
cd wordplay-fresh
```

#### Step 2: Configure Stable Dependencies
```bash
# Install proven stable versions
npm install expo@~51.0.0
npm install react@18.2.0 react-native@0.74.5
npm install @supabase/supabase-js@^2.39.0
npm install zustand@^4.4.0

# Dev dependencies
npm install --save-dev @testing-library/react-native@^12.4.0
npm install --save-dev jest@^29.7.0
npm install --save-dev typescript@^5.3.0
```

#### Step 3: Migrate Proven Code
1. Copy `packages/engine/` exactly as-is (this code was working)
2. Copy UI component logic (not dependency configs)
3. Copy test suites (update import paths only)
4. Copy documentation

#### Step 4: Verification Checkpoints
- [ ] `npm install` completes without dependency conflicts
- [ ] `npm test` runs all engine tests (137+ tests)
- [ ] `expo start` launches without errors
- [ ] Web platform builds successfully
- [ ] Core game functionality works in browser

### Phase 4: Incremental Feature Restoration

#### Priority Order (DO NOT SKIP STEPS)
1. **Engine Package Tests** - Must be 100% green before proceeding
2. **Basic App Shell** - Expo Router + TypeScript compilation
3. **UI Components** - One component at a time with tests
4. **Game Screen** - Single-player functionality
5. **Supabase Integration** - Only after core app works
6. **CI/CD Pipeline** - Only after local testing passes

### Phase 5: Quality Gates

#### Before Each Commit
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] App starts successfully (`expo start`)
- [ ] No console errors in web preview
- [ ] Commit includes 'ShipHip' prefix

#### Before Marking Task Complete
- [ ] Feature demonstrated working end-to-end
- [ ] Performance within acceptable limits
- [ ] Cross-platform compatibility verified
- [ ] Documentation updated with actual state

## Lessons Learned

### DON'T DO AGAIN
- ❌ Use bleeding-edge versions (React 19, Expo SDK 53)
- ❌ Upgrade multiple major versions simultaneously
- ❌ Skip dependency compatibility verification
- ❌ Make assumptions about "stable" releases
- ❌ Proceed without comprehensive testing after changes

### DO INSTEAD
- ✅ Use LTS/stable versions with proven track records
- ✅ Upgrade one dependency at a time with testing
- ✅ Verify all tests pass before any major changes
- ✅ Research compatibility matrices before upgrades
- ✅ Maintain working backup before any risky changes

## Recovery Timeline

**Day 1:** Fresh project creation + engine migration  
**Day 2:** UI components + basic app functionality  
**Day 3:** Game integration + testing  
**Day 4:** Supabase + CI/CD restoration  
**Day 5:** Buffer for unexpected issues

## Success Criteria

- App starts without dependency errors
- All original 137+ tests passing
- Single-player game fully functional
- Development workflow smooth and reliable
- Foundation ready for Phase 3 (Online Multiplayer)

---

**Note:** This restart is necessary because the current dependency conflicts are unfixable without downgrading to stable versions. Better to start clean than spend weeks fighting incompatible bleeding-edge packages. 