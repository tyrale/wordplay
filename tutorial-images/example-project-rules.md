# Word-Game Rules (Cursor)

### Core Directives
1. **Do not truncate files.** Read entire file, apply minimal-diff change, then verify full content.
2. **Follow chronological tasks** in `/docs/TASK_PROGRESS.md`; one task per commit.
3. **Include the keyword `ShipHip`** in every commit title for continuity.
4. **Run all unit & E2E checkpoints** locally before committing.
5. **Update both `TASK_PROGRESS.md` and `CHANGELOG.md`** in the same commit.
6. **Halt and request clarification** when requirements are ambiguous.
7. **After approval, automatically open** `/docs/TASK_PROGRESS.md` for next task review.
8. **MANDATORY VERIFICATION: No claims without explicit proof.** Every "working", "complete", or "fixed" statement must include verification commands and outputs.
9. **TRANSPARENCY REQUIREMENT: Distinguish tested vs. assumed.** Explicitly state what has been verified vs. what is assumed or untested.
10. **ERROR-FIRST METHODOLOGY: Actively look for problems.** Test failure scenarios and edge cases before claiming success.

### Project Context (quick load)
- **Codebase:** Expo React-Native (TypeScript) + Supabase backend.
- **Game:** Turn-based word duel with key/locked letters.
- **Architecture Keyword:** *ShipHip* (used for commit titles).

### Verification Protocol *(MANDATORY)*
**Before any completion claim:**
1. **Unit Testing** - Run specific test commands, show outputs
2. **Integration Testing** - Test package interactions, document results  
3. **Platform Testing** - Verify iOS/Android/Web if applicable
4. **Regression Testing** - Confirm existing features still work
5. **Documentation** - Only mark complete what has been verified

**Forbidden Language Without Verification:**
- ❌ "working perfectly" 
- ❌ "everything is complete"
- ❌ "fully functional"
- ❌ "all tests passing" (without showing ALL test results)

**Required Language for Transparency:**
- ✅ "X specific test passed (showing output)"
- ✅ "Verified on web platform only (iOS/Android untested)"
- ✅ "Implementation complete, requires full testing"
- ✅ "Feature appears functional, needs comprehensive verification"

### Implementation Strategy  *(machine-parseable)*
```json
{"v":2,"ctx":"ShipHip","obj":["rev_strat","upd_doc","trk_prog","explain_concepts","prevent_drift","verify_claims","transparent_testing"],"rules":[
  {"r1":"Begin by reading /docs/dev-plan.md"},
  {"r2":"Mark ✅ tasks in /docs/TASK_PROGRESS.md ONLY when commit is pushed AND verified"},
  {"r3":"Add new tasks if bugs/tech-debt discovered"},
  {"r4":"After each milestone, update phase progress in the dev plan"},
  {"r5":"Explain complex code in plain language inside commit body"},
  {"r6":"Keep /docs/CHANGELOG.md in sync with code"},
  {"r7":"Run linters & tests; fail commit if any fail"},
  {"r8":"Touch only files relevant to that task"},
  {"r9":"If uncertain, open clarification issue before coding"},
  {"r10":"After task approval, open TASK_PROGRESS.md for next task review"},
  {"r11":"The AI must never ask the user to perform technical, migration, or codebase maintenance tasks. The AI is responsible for proposing and executing all such changes unless the user explicitly requests otherwise."},
  {"r12":"Before creating a new file or module, always search the codebase for existing files with similar or related names/functions. If a relevant file exists, update or extend it instead of creating a duplicate. Only create a new file if there is a clear architectural reason, and document that reason in the commit."},
  {"r13":"VERIFICATION MANDATE: Every claim must be backed by explicit command execution and output verification"},
  {"r14":"INCREMENTAL VALIDATION: Test each change individually before building upon it"},
  {"r15":"CROSS-PLATFORM VERIFICATION: If change affects multiple platforms, test on ALL claimed platforms"},
  {"r16":"ASSUMPTION DOCUMENTATION: Clearly state what is assumed vs. what is verified"},
  {"r17":"ERROR REPRODUCTION: Before claiming fix, reproduce original issue and verify resolution"},
  {"r18":"COMPREHENSIVE TESTING: Full test suite execution required before marking tasks complete"},
  {"r19":"DEPENDENCY VERIFICATION: Verify all package compatibility before claiming stability"},
  {"r20":"DOCUMENTATION ACCURACY: Only update docs to reflect actual verified implementation state"}
],"actions":[
  "id_complete_tasks",
  "update_progress",
  "sync_docs",
  "explain_code",
  "prevent_drift",
  "track_dependencies",
  "ensure_completeness",
  "review_next_task",
  "verify_all_claims",
  "test_incrementally",
  "document_assumptions",
  "reproduce_errors",
  "validate_cross_platform"
],"kpi":[
  "task_completion_rate",
  "build_pass_rate",
  "documentation_quality",
  "code_simplicity",
  "bug_reduction",
  "verification_accuracy",
  "claim_reliability",
  "assumption_transparency"
],"mode":"strict_sequential_verified"}
```

### Development Guidelines

1. **Accessibility** – PR/commit messages must be beginner-friendly.
2. **Organization** – Keep modules modular; avoid cross-layer leaks.
3. **Maintenance** – Favor simple, typed functions with tests.
4. **Documentation** – Update relevant MD files with every logic change.
5. **Completeness** – Verify full file writes; no partial JSON/TS output.
6. **Verification** – Every technical claim must include proof of testing.
7. **Transparency** – Distinguish between verified facts and reasonable assumptions.

### File-Operation Protocol

1. Read entire file.
2. Apply minimal diff.
3. Re-render file for verification.
4. **Test the change** - verify it works as intended.
5. **Check for regressions** - ensure existing functionality unaffected.
6. Commit only after successful diff review AND functional verification.

### Verification Standards *(NEW)*

#### For "Working" Claims
1. Execute specific test command
2. Show actual output/result  
3. Test on multiple platforms if applicable
4. Verify related functionality hasn't broken
5. Document exactly what was tested vs. assumed

#### For "Complete" Claims  
1. Demonstrate end-to-end functionality
2. Show all acceptance criteria met
3. Verify integration with dependent systems
4. Test error handling scenarios
5. Confirm documentation matches implementation

#### For "Fixed" Claims
1. Reproduce original issue
2. Show fix implementation  
3. Verify fix doesn't create new issues
4. Test regression scenarios
5. Confirm fix works across environments

#### For Architecture Changes
1. Test on clean environment
2. Verify all platforms still function
3. Confirm no dependency conflicts
4. Validate with comprehensive test suite
5. Document any limitations or assumptions

# Project Rules - Commit Workflow

## Enhanced Pre-Commit Checklist
- [ ] All tests passing locally (show full output)
- [ ] Linting checks passed
- [ ] Documentation updated to reflect actual implementation
- [ ] Commit message includes 'ShipHip' prefix
- [ ] Changes match current task in TASK_PROGRESS.md
- [ ] **Cross-platform verification completed (if applicable)**
- [ ] **No regressions introduced (verified)**
- [ ] **All claims backed by explicit verification**
- [ ] **Assumptions clearly documented and separated from facts**

## Enhanced Commit Process
1. Verify current task in TASK_PROGRESS.md
2. **Run comprehensive test suite (document results)**
3. **Test on all claimed platforms**
4. **Verify no regressions introduced**
5. Update documentation with verified facts only
6. Create commit with 'ShipHip' prefix
7. **Mark task as complete ONLY after all verification steps pass**

## Documentation Updates
- Documentation changes must be part of the same commit as code changes
- Never mark tasks complete before commit is made AND verified
- Always include git state in commit messages
- **Distinguish verified features from implemented-but-untested features**
- **Include verification status in all technical documentation**

## Verification Failure Protocol *(NEW)*
- If verification fails, document the failure
- Do not mark task as complete
- Identify what needs additional work
- Update task status to reflect actual state
- Propose specific steps to achieve verification

# Additional Rules

- **Autonomy**: The AI must never ask the user to perform technical, migration, or codebase maintenance tasks. The AI is responsible for proposing and executing all such changes unless the user explicitly requests otherwise.

- **No Redundant Files**: Before creating a new file or module, always search the codebase for existing files with similar or related names/functions. If a relevant file exists, update or extend it instead of creating a duplicate. Only create a new file if there is a clear architectural reason, and document that reason in the commit.

- **Verification Mandate**: All technical claims, completion statements, and functionality assertions must be backed by explicit command execution and output verification. No exceptions.

- **Assumption Transparency**: Clearly distinguish between what has been verified through testing and what is assumed or requires additional verification.

### End of File – edit only by human.