# Journal: Visionary -- Post-Pipeline Review

**Date:** 2026-07-10
**Pipeline:** 2026-07-08-phase1-domain-core
**Phase:** Strategic Review (Post-Completion)

## What I Reviewed

### Journal Entries (11 files)
- `01_phase1a_design_docs.md` - Documenter's task spec creation, task ID renumbering
- `02_phase1b_test_specs.md` - Documenter's test scenario documentation (127 scenarios across R1-R15)
- `03_phase2_test_code.md` - Tester's test file creation (284 new test cases, 57 fixtures)
- `04_phase3_impl_*.md` (7 files) - Implementer's module-by-module implementation journals
- `09_phase4_verification_manual.md` - Manual recovery after Debug Loop stall (191 TS errors in variety.ts)
- `10_documenter_phase_sync.md` - Final documentation update

### Implementation Artifacts
- `packages/domain/*.ts` - All 7 domain modules + barrel export (~2,470 lines total)
- `tests/domain/*.ts` - Test files and helpers
- Test fixtures in `tests/domain/fixtures/rules/`

### Project Context
- `Company/learnings.md` - Generic pipeline learnings
- `Company/project/learnings.md` - Project-specific learnings (Phase 0 scaffold)
- `Company/project/project-guidelines.md` - Architecture invariants and conventions

## Key Observations

### 1. The Fundamental Issue: Test-Implementation Contract Gap

The pipeline's most significant challenge was not the implementation itself, but the **API contract mismatch between Tester and Implementer**. This manifested as:

- 191 TypeScript errors in variety.ts requiring a "major rewrite"
- Mismatched type names (`HistoricalCombo` vs `HistoryEntry`)
- Structural disagreements (nested vs. flat camera moves)
- Field name conflicts (`hasCollision` vs `collision`)

**Root Cause Analysis**: The Tester phase wrote tests against an implied API that was interpreted differently by the Implementer. The test specs (rule-scenarios.md, fixtures-spec.md) documented behavior, not signatures. There was no explicit contract validation step.

**This is a systemic issue**, not a one-time bug. The TDD workflow assumes tests define the contract, but when tests import non-existent modules, the contract is inferred from test code rather than declared explicitly.

### 2. Architecture That Worked Well

The domain layer's fundamental design is sound:

- **Pure TypeScript with zero dependencies** - All modules import only from `zod` (types.ts) or sibling domain modules. No React, Next.js, or Prisma. This enabled fast, deterministic tests.

- **Zod schemas as types** - Single source of truth for validation and TypeScript types. The `schemas` export from types.ts allows runtime validation reuse.

- **Modular rule structure** - Each rule has a checker function, controlled vocabulary, and severity level. The 15 rules are well-defined and independently testable.

- **Collision detection algorithm** - The variety engine's two-tier collision checking (30-day time-based for stage-moment, 10-run position-based for dynamic-payoff) is clean and matches the spec.

### 3. Technical Debt Already Accumulating

The phase introduced patterns that will cause friction in later phases:

- **Rule logic split** - Rules.ts has utility functions; linter.ts has checkers. This split means adding a rule requires editing two files.

- **Threshold literals scattered** - Values like `0.8` (similarity), `40`/`90` (word budget), `2` (max generic verbs) appear as inline literals in linter.ts rather than named constants.

- **Test helper gaps** - The helpers.ts has good foundations but lacks factories for HistoryEntry, parameterized Scene creation, and shared fixture loading for cross-module tests.

### 4. Integration Points Needing Attention Before Phase 2

The domain layer was tested in isolation. Phase 2 will integrate it with:

1. **Agent orchestrator (lib/agent.ts)** - Consumes compile, lint, variety, exporter
2. **API routes** - Need to serialize/deserialize domain types
3. **Prisma layer** - Scene persistence, history queries for variety engine

No integration tests exist yet. The agent.ts task (T207) was moved to Phase 2, but it's the primary consumer of the entire domain layer.

### 5. What the Debug Difficulties Reveal

The manual recovery phase (09_phase4_verification_manual.md) shows:

- **Debug loop rate-limited** - The automated Debugger stalled due to API rate limits
- **Manager direct intervention** - Manual TypeScript error fixes across 3+ files
- **107 test failures remained** after TypeScript errors resolved (74% pass rate)

This suggests the verification phase needs:
- Better parallelization strategy for large test suites
- Contract validation earlier in the pipeline
- Clearer escalation path when automated fixing stalls

## Recommendations Filed

Added 8 recommendations to `Company/project/recommendations.md`:

| Priority | Category | Summary |
|----------|----------|---------|
| High | Process | Test-Implementation Contract Validation Checkpoint |
| High | Tooling | Expand test helpers library |
| High | Architecture | Phase 2 integration test scaffold before agent.ts |
| Medium | Architecture | Linter-Handshake integration facade |
| Medium | Tech Debt | Rule predicate consolidation |
| Medium | Architecture | Variety engine factory pattern |
| Low | Conventions | Threshold constants centralization |
| Low | Process | Domain API stability plan |

## Notes for Optimizer

### Pipeline Structure Worked Well
- TDD phases (Design -> Test Specs -> Test Code -> Implementation -> Verification) produced high coverage (90.85%)
- The 525+ test count is substantial for a domain layer
- Module-by-module implementation journals provided good traceability

### Pipeline Structure Needs Refinement
1. **Missing: Contract Stub Phase** - Between Tester (Phase 2) and Implementer (Phase 3), there should be a lightweight validation that test imports match an explicit contract
2. **Debug Loop Scalability** - The automated debugger stalled on a large test suite. Consider chunking strategies or earlier type-checking passes
3. **Fixture Calibration** - The Tester's R7 fixtures assumed a similarity algorithm that hadn't been implemented yet. Fixtures for threshold-dependent behavior should be marked as "needs calibration after implementation"

### What Would Have Prevented the Major Issues
1. A TypeScript-only "contract compile" step after tests are written but before implementation starts
2. Implementer reading test file imports and flagging structural disagreements before writing code
3. Smaller implementation batches with verification between each module

### Phase 2 Preparation Checklist
- [ ] Create integration test scaffold for agent pipeline
- [ ] Define Prisma-to-domain type mappings
- [ ] Document API route request/response contracts using Zod schemas
- [ ] Add HistoryEntry fixtures for variety collision tests
- [ ] Expand test helpers with parameterized factories

