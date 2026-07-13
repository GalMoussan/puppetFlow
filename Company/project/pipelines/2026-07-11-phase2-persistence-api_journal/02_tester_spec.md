# Tester Journal: Phase 2 Test Specification

**Agent:** Test Writer (quality:test-writer)
**Pipeline:** 2026-07-11-phase2-persistence-api
**Timestamp:** 2026-07-11T14:45:00Z
**Task:** Create test specifications for Phase 2: Persistence & API

---

## Summary

Created comprehensive test specification document at:
`puppetflow-docs/testing/phase2-test-spec.md`

The specification covers 7 major test categories with 80+ individual test scenarios for Phase 2.

---

## Test Categories Created

### 1. Prisma Schema Tests (17 tests)
- Model creation/validation for all 6 models
- Relationship integrity tests (parent-child, cascade)
- Enum value validation (BlockType, RunStatus)
- Constraint testing (unique names, foreign keys)

### 2. CRUD Route Tests (24 tests)
- **Theme Packs:** GET list, GET by ID, POST create, PATCH update, 404/409 handling
- **Blocks:** GET with filters, POST with stageScope validation, PATCH archive
- **Templates:** GET with graph, POST with CanvasGraph validation, version gate

### 3. Anthropic Client Tests (15 tests)
- Structured output parsing (valid/invalid BatchOutput)
- Streaming response handling (chunks, tool_use, mid-stream errors)
- Rate limit retry with exponential backoff (429 handling)
- Token overflow error handling (context_length_exceeded)
- API error propagation (400, 401, 500, network failures)

### 4. Agent Orchestrator Tests (12 tests)
- Happy path: compile -> generate -> lint -> persist
- Lint failure -> repair pass -> persist
- Lint failure -> repair failure -> persist with warnings
- VarietyError handling (pool exhausted, language constraints)
- SSE event emission sequence verification

### 5. Run API Tests (11 tests)
- POST create run with SSE streaming
- Invalid template handling (404, archived)
- SSE event sequence (COMPILING -> GENERATING -> LINTING -> DONE)
- Concurrent run rejection (max 1 active run)
- GET list with pagination and filters

### 6. Reroll Tests (10 tests)
- Reroll full scene (regenerate with sibling exclusions)
- Reroll single stage (maintain handshake continuity)
- Invalid scene index / stage handling
- Run not found / incomplete run handling

### 7. Export Tests (9 tests)
- Export scenes format (matches scheduled task output)
- Export scaffold format (byte-identical for Claude Code)
- Content-Type and Content-Disposition headers
- Run not found / incomplete run handling

---

## Key Design Decisions

### Mocking Strategy
- **Prisma:** Use vitest-mock-extended for deep mocking
- **Anthropic:** Mock fetch responses with fixture data
- **Domain layer:** Import real functions (pure, no mocking needed)

### Test Fixtures
- Created detailed fixture examples in Appendix A
- Includes valid BatchOutput, lint violations, theme pack data
- SSE reader utility for testing streaming endpoints

### Coverage Targets
- lib/anthropic.ts: >= 85% line, >= 80% branch
- lib/agent.ts: >= 85% line, >= 80% branch
- API routes: >= 80% line, >= 75% branch
- Overall Phase 2: >= 80% line coverage

---

## Patterns Applied

1. **Behavior-focused tests:** Test names describe expected behavior, not implementation
2. **Arrange-Act-Assert:** Clear structure in all test cases
3. **Edge case coverage:** Each test includes edge cases (empty, boundary, error states)
4. **Mock isolation:** External dependencies (Anthropic, DB) always mocked
5. **SSE testing:** Custom utilities for reading Server-Sent Events streams

---

## Dependencies on Phase 1

The test spec assumes Phase 1 domain layer is complete and available:
- `packages/domain/types.ts` - Zod schemas for validation
- `packages/domain/compiler.ts` - compile() function
- `packages/domain/variety.ts` - assign() function, VarietyError
- `packages/domain/linter.ts` - lintBatch() function

These will be imported directly in implementation (no mocking).

---

## Files Created

| File | Purpose |
|------|---------|
| `puppetflow-docs/testing/phase2-test-spec.md` | Complete test specification document |

---

## Next Steps

1. **Tester:** Implement tests following spec in `tests/lib/` and `tests/api/`
2. **Implementer:** Use tests as acceptance criteria for implementation
3. **Manager:** Verify all test scenarios covered before marking implementation complete

---

## Notes

- Test spec follows existing fixture conventions from `fixtures-spec.md`
- Integrates with test strategy from `test-strategy.md`
- All test file paths follow project conventions from Phase 1
