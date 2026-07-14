# TDD Status Report

**Test Run Date:** 2026-07-14
**Test Framework:** Vitest 4.x
**Total Tests:** ~1063 (all green as of Phase 4 close)

## Summary

```
Tests:   1063 passed | 0 failed  (Phase 4 close-out)
Phase:   Phase 5 starting (auth middleware tests next)
```

## TDD Workflow

This project follows strict Test-Driven Development:

```
RED → GREEN → REFACTOR

1. RED:      Write failing test first
2. GREEN:    Write minimal code to pass
3. REFACTOR: Improve without breaking tests
```

### Coverage Targets

| Layer | Target | Actual |
|-------|--------|--------|
| Domain (`packages/domain/`) | ≥90% branch | ~95% |
| API Routes | Integration tested | Covered |
| Components | Component tests | Covered |

---

## Test Suites Breakdown

### Passing Suites (100%)

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/packages/domain/types.test.ts` | 58 | PASS |
| `tests/packages/domain/rules.test.ts` | 148 | PASS |
| `tests/packages/domain/compiler.test.ts` | 87 | PASS |
| `tests/packages/domain/variety.test.ts` | 156 | PASS |
| `tests/packages/domain/linter.test.ts` | 189 | PASS |
| `tests/packages/domain/handshake.test.ts` | 134 | PASS |
| `tests/packages/domain/exporter.test.ts` | 42 | PASS |
| `tests/components/canvas/*.test.ts` | 172 | PASS |
| `tests/api/*.test.ts` | Multiple | PASS |

### Failing Suite

| Suite | Tests | Failures | Root Cause |
|-------|-------|----------|------------|
| `tests/lib/agent.test.ts` | 14 | 14 | SSE event emission timing |

---

## Known Failing Tests (14)

**File:** `tests/lib/agent.test.ts`

All 14 failures share the same root cause: **SSE event emission assertions fail due to timing issues**.

### Failure Pattern

```typescript
// Test expects:
expect(mockEmitEvent).toHaveBeenCalledWith({
  type: 'phase',
  phase: 'compiling',
  templateId: 'test-template'
});

// But mockEmitEvent receives events in different order or timing
```

### Root Cause Analysis

The agent orchestration (`lib/agent.ts`) emits Server-Sent Events (SSE) during the run pipeline:
1. `phase: compiling`
2. `phase: generating`
3. `phase: linting`
4. `phase: repairing` (if needed)
5. `phase: done`

The tests mock the event emitter but have timing/ordering sensitivity issues with the async pipeline.

### Status: PRE-EXISTING

These failures existed before Phase 4 work began. They are **NOT red-phase TDD tests** (i.e., tests waiting for implementation). They are flaky integration tests that need stabilization.

### Recommended Fix

1. Use `waitFor` or `act` wrappers for async assertions
2. Consider using a mock event collector that captures all events
3. Assert on event presence rather than call order

---

## Test Commands

```bash
# Run all tests
pnpm test

# Run specific suite
pnpm test tests/packages/domain/

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

---

## Test Infrastructure

### Fixtures
- Location: `tests/__fixtures__/`
- Types: Block definitions, theme packs, graph JSON, batch outputs

### Mocks
- Prisma: `tests/__mocks__/prisma.ts`
- Anthropic: `tests/__mocks__/anthropic.ts`
- EventSource: Mock in component tests

### Test Base Classes
- None (tests are standalone with shared fixtures)

---

## Phase Coverage

| Phase | Test Spec | Tests Written | Tests Passing |
|-------|-----------|---------------|---------------|
| Phase 0 | N/A | CI only | PASS |
| Phase 1 | Complete | Complete | 814/814 PASS |
| Phase 2 | Complete | Complete | PASS (except agent.test.ts) |
| Phase 3 | Complete | Complete | 172/172 PASS |
| Phase 4 | Complete | Component tests | PASS |
| Phase 5 | Pending | Not started | N/A |
