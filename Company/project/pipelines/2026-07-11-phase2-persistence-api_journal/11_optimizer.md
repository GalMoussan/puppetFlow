# Optimizer Retrospective: Phase 2 — Persistence & API

**Pipeline ID:** 2026-07-11-phase2-persistence-api
**Date:** 2026-07-12
**Status:** Complete

---

## Pipeline Health: Fair

| Metric | Value |
|--------|-------|
| Phases completed without debug | 2/4 |
| Debug iterations needed | 3 |
| Total roles dispatched | ~8 (Tester x2, Implementer x2, Debugger x3, Optimizer x1) |
| Final test count | 571 passing |
| TypeScript errors fixed | 59 |
| Runtime failures fixed | 21 → 5 → 0 |

---

## Role Performance

| Role | Grade | Notes |
|------|-------|-------|
| Tester (spec) | A | Comprehensive test specification with 80+ scenarios, clear structure |
| Tester (export) | B | Good test coverage but assumed API signatures without documentation |
| Implementer | B | Solid implementation, but created different API signatures than tests expected |
| Debugger (iter 1) | A | Fixed all 59 TypeScript errors systematically, correct scope enforcement |
| Debugger (iter 2) | A | Identified root cause (dual BatchOutputSchema), documented clearly |
| Debugger (iter 3) | A | Fixed final 5 failures by correcting mock targets and error types |

---

## Root Cause Analysis

### Debug Iteration 1: TypeScript Compilation Errors (59 errors)

**Root Cause:** TDD API signature divergence
**Caused By:** Tester + Implementer (shared responsibility)

The Tester wrote 80+ tests assuming specific API signatures:
- `runBatch(templateId, config)` — 2 args
- `generateBatch(scaffold)` — 1 arg
- Exports: `AgentError`, `parseStructuredOutput`, `streamGeneration`

The Implementer created different signatures:
- `runBatch(templateId, config, emitter)` — 3 args (emitter required)
- `generateBatch(scaffold, assignments, options?)` — 2-3 args
- Exports: Different names (`SSEEmitter`, `RunResult`, no `AgentError`)

Neither role documented their assumptions/decisions explicitly enough for the other to align.

**Fix Applied:** Debugger rewrote test imports and function calls to match implementation.

**Prevention:** Added "TDD API Contract Documentation" requirement to `tester.md` and "TDD API Contract Verification" to `implementer.md`.

### Debug Iteration 2: Runtime Failures (21 failures)

**Root Cause:** Duplicate schema definitions + mock fixture misalignment
**Caused By:** Implementation design (dual BatchOutputSchema) + Tester (wrong import)

Two `BatchOutputSchema` definitions:
1. `lib/anthropic.ts` — 8 fields (API response format)
2. `packages/domain/types.ts` — 14+ fields (full domain schema)

Test mocks imported from domain types but tests for `lib/anthropic.ts` needed API format.

**Fix Applied:** Created separate mock helper `createMockGeneratedScene()` for API format.

**Prevention:** Added schema scope documentation requirement to `project-guidelines.md`.

### Debug Iteration 3: Final Test Failures (5 failures)

**Root Cause:** Wrong mock target + wrong error type expectations
**Caused By:** Tester

Tests mocked `prisma.run.findUnique` but route handler delegated to `rerollScene` function. The 404/400 logic was in `rerollScene`, not the route.

Also: Tests expected 400 status but routes threw `ConflictError` (409).

**Fix Applied:** Changed tests to mock `rerollScene` and expect correct error types/status codes.

**Prevention:** Added "Mock at the correct abstraction level" rule to `tester.md`.

---

## Role File Changes Applied

### tester.md

1. **Added:** Rule 9 "Mock at the correct abstraction level" under Integration Test Writing Rules
   - Reason: Tests mocked Prisma instead of service functions, causing 5 test failures

2. **Added:** "TDD API Contract Documentation" subsection under TDD Stub Creation
   - Reason: Tester assumed API signatures without documenting them, causing 59 TypeScript errors when implementation differed

### implementer.md

1. **Added:** "TDD API Contract Verification" subsection under Rules
   - Reason: Implementer created different API signatures without checking test assumptions

---

## Project-Guidelines Changes Applied

1. **Added:** Gotchas 15-18 covering API layer patterns
   - SSE Streaming pattern
   - Anthropic client retry behavior
   - Error type to HTTP status mapping
   - BatchOutputSchema naming conflict warning

---

## Learnings.md Changes Applied

### Generic (Company/learnings.md)

Added changelog entry documenting:
- Root cause 1: TDD API signature divergence
- Root cause 2: Duplicate schema definitions
- Root cause 3: Mock target selection
- Pattern observation about TDD signature documentation

### Project-Specific (Company/project/learnings.md)

Added Phase 2 changelog entry with:
- 6 project-specific patterns discovered
- 4 project-specific gotchas

---

## Manager Autonomy Audit

The Manager flagged 2 guidelines gaps in the blueprint:
1. "SSE streaming patterns not documented in project-guidelines.md"
2. "Anthropic client patterns not documented"

Both gaps have been addressed in the project-guidelines.md update (Gotchas 15-18).

**Questions Asked:** None identified in journal entries. Pipeline proceeded autonomously.

---

## Pipeline Design Issues

### Issue 1: TDD Phase Gap

The pipeline had Tester write tests (Phase 2) then Implementer write code (Phase 3) without an explicit API contract alignment step. This is the standard TDD pattern, but large API divergence caused significant rework.

**Recommendation (not applied — needs user review):** Consider adding a "Contract Review" checkpoint between Tester completion and Implementer start. The Manager would verify that Tester documented API signatures and Implementer reads them before implementing.

### Issue 2: Mock Infrastructure Delay

Test mocks (`tests/mocks/prisma.ts`, `tests/mocks/anthropic-responses.ts`) were marked as "Pre-existing, verified" in the Implementer journal, but one mock helper (`createMockScene`) returned full domain objects when API tests needed partial objects.

**Recommendation:** Mock helpers should be created/updated during the Tester phase, not assumed to exist.

---

## Proposed Changes (PENDING USER REVIEW)

### Significant Change: TDD Contract Checkpoint

**File:** `company-execute/SKILL.md` or `company-plan/SKILL.md`
**Proposed Change:** Add optional "Contract Review" phase between Tester and Implementer for large TDD pipelines (50+ tests). Manager verifies Tester documented signatures before dispatching Implementer.
**Reason:** This pipeline's 3 debug iterations were caused primarily by API divergence. A 5-minute contract review could have prevented hours of test rewrites.
**Status:** Pending

---

## Summary

Phase 2 completed successfully with 571 tests passing, but required 3 debug iterations primarily due to TDD API divergence. The core issue was insufficient communication between Tester and Implementer roles about assumed API signatures.

Changes applied to role files should prevent this class of failure in future pipelines by:
1. Requiring Tester to document assumed API signatures
2. Requiring Implementer to verify those signatures before implementing
3. Adding guidance on mock target selection for route tests

The pipeline validated that the domain layer (Phase 1) remained stable throughout Phase 2 — zero changes to `packages/domain/` were required.
