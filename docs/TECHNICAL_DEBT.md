# Technical Debt Cleanup List

This document tracks technical debt and architectural issues that need to be addressed in future development cycles.

## 📋 Adapter Interface Issues

### **Node Adapter Interface Problems** 🔴 **HIGH PRIORITY**

**Location**: `src/adapters/nodeAdapter.ts`  
**Discovered**: During profanity cleanup task (2025-01-22)  
**Impact**: Build errors, TypeScript compilation failures  

#### **Issues to Fix:**

1. **Missing Interface Exports** - Lines 20-21
   ```typescript
   // ❌ CURRENT: Importing non-existent interfaces
   import type { 
     GameDependencies,           // ← DOESN'T EXIST
     WordDataDependencies,       // ← WRONG IMPORT LOCATION
   } from '../../packages/engine/interfaces';
   
   // ✅ FIX: Use correct interface names and locations
   import type { GameStateDependencies } from '../../packages/engine/interfaces';
   import type { WordDataDependencies } from '../../packages/engine/dictionary';
   ```

2. **Missing Function Exports** - Line 30
   ```typescript
   // ❌ CURRENT: Importing non-existent functions
   import { 
     calculateScoreWithDependencies,     // ← DOESN'T EXIST  
     getScoreForMoveWithDependencies     // ← DOESN'T EXIST
   } from '../../packages/engine/scoring';
   
   // ✅ FIX: Find correct function names or create missing exports
   ```

3. **ValidationResult Type Mismatch** - Line 163
   ```typescript
   // ❌ ISSUE: Type conflict between engine/dictionary and engine/interfaces
   // ValidationResult from dictionary: { isValid: boolean; ... }
   // ValidationResult from interfaces: { isValid: true } | { isValid: false; ... }
   
   // ✅ FIX: Align ValidationResult types across modules
   ```

4. **Duplicate Property Declaration** - Lines 45 & 65
   ```typescript
   // ❌ CURRENT: Duplicate 'isLoaded' declarations
   private isLoaded = false;           // Line 45
   public isLoaded(): boolean { ... }  // Line 65
   
   // ✅ FIX: Rename one to avoid conflict (e.g., 'loaded' property + 'isLoaded()' method)
   ```

5. **Array-to-Set Type Error** - Line 127
   ```typescript
   // ❌ CURRENT: Assigning string[] to Set<string>
   this.profanityWords = getComprehensiveProfanityWords();  // Returns string[]
   
   // ✅ FIX: Wrap in Set constructor (PARTIALLY FIXED during profanity cleanup)
   this.profanityWords = new Set(getComprehensiveProfanityWords());
   ```

6. **Unused Parameters** - Lines 184+
   ```typescript
   // ❌ CURRENT: Unused parameters causing linter warnings
   calculateScore: (fromWord: string, toWord: string, options?: any) => {
     // fromWord, toWord never used
   }
   
   // ✅ FIX: Implement proper scoring logic or mark parameters as intentionally unused
   ```

#### **Root Cause Analysis:**
- **Interface Evolution**: Engine interfaces were refactored but adapters weren't updated
- **Import Fragmentation**: Interfaces scattered across multiple files without clear organization
- **Type System Drift**: Different modules defining conflicting versions of same types
- **Incomplete Migration**: Some functions renamed/moved but imports not updated

#### **Proposed Solution Approach:**
1. **Phase 1**: Interface Audit - Catalog all interface definitions and their correct locations
2. **Phase 2**: Type Unification - Consolidate conflicting type definitions 
3. **Phase 3**: Import Cleanup - Update all import statements to use correct locations
4. **Phase 4**: Missing Function Resolution - Implement or locate missing scoring functions
5. **Phase 5**: Property Cleanup - Resolve duplicate/conflicting property declarations
6. **Phase 6**: Verification - Ensure all adapters compile and function correctly

#### **Estimated Effort**: 
- **Time**: 8-12 hours (increased due to scope expansion)
- **Risk**: High (affects ALL adapters - requires coordinated fix)
- **Dependencies**: None (can be done after profanity task completion)

#### **🚨 CRITICAL UPDATE: Universal Adapter Interface Crisis**
During Phase 2 cleanup (slang word centralization), discovered these interface issues affect **ALL ADAPTERS**:

- **`src/adapters/nodeAdapter.ts`** - 10+ linter errors
- **`src/adapters/webAdapter.ts`** - 9+ linter errors  
- **`src/adapters/browserAdapter.ts`** - 9+ linter errors
- **`src/adapters/testAdapter.ts`** - 8+ linter errors

**Root Cause**: Interface definitions scattered across multiple files with inconsistent exports.

**Immediate Impact**: 
- ✅ Runtime functionality works (confirmed by tests)
- ❌ TypeScript compilation fails 
- ❌ Development velocity severely impacted
- ❌ Cannot proceed with further adapter improvements

**Recommended Emergency Fix Strategy**: 
1. **Phase 1**: Create temporary interface compatibility layer
2. **Phase 2**: Audit and consolidate all interface definitions
3. **Phase 3**: Migrate all adapters simultaneously
4. **Phase 4**: Remove compatibility layer

**NOTE**: These are pre-existing issues revealed by touching adapter imports, not caused by current cleanup.

---

## 📋 Other Technical Debt  

---

## 📝 Cleanup Tracking

| Issue | Priority | Status | Assigned | ETA |
|-------|----------|--------|----------|-----|
| Node Adapter Interfaces | 🔴 High | Pending | TBD | TBD |
| Test Adapter Interfaces | 🟡 Medium | Partial | TBD | TBD |
| Browser Adapter Interfaces | 🟡 Medium | Pending | TBD | TBD |

---

## 🎯 Next Actions

1. **Complete profanity centralization task** ✅ (Current priority)
2. **Schedule Node adapter interface cleanup** (Next major task)
3. **Create interface architecture documentation** (Future enhancement)
4. **Implement adapter interface tests** (Quality assurance)

---

*Last Updated: 2025-01-22*  
*Related to: ShipHip profanity centralization cleanup* 