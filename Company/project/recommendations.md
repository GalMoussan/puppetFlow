# Visionary Recommendations (Project-Specific)

Project-specific strategic patterns and architectural recommendations.
The Visionary adds entries here after each pipeline.

Generic recommendations (applicable to any project) go to `Company/recommendations.md`.

## Format

### {date} -- {pipeline-id}: {feature name}
**Priority**: {Critical | High | Medium | Low}
**Category**: {Architecture | Tooling | Conventions | Process | Tech Debt}
**Recommendation**: {what to do}
**Rationale**: {why}
**Effort**: {Small | Medium | Large}
**Impact**: {what improves}

---

<!-- Project-specific recommendations below -->

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Test Predicate Contract Mismatch Pattern

**Priority**: High
**Category**: Process
**Recommendation**: Add a "Contract Validation" checkpoint between Tester and Implementer phases where test imports are validated against a contract stub file before implementation begins. The stub file defines function signatures, types, and error types that both sides must agree on.
**Rationale**: The Phase 4 verification journal (09_phase4_verification_manual.md) documents that 191 TypeScript errors in variety.ts alone required a "major rewrite" because the Tester's API expectations diverged significantly from the Implementer's interpretation. Specific mismatches included:
- `VarietyPool` property names (singular vs. nested)
- `HistoryEntry` structure (flat vs. nested, `runDate` type)
- `CollisionCheckResult` field names (`collision` vs. `hasCollision`)
- `validatePools` parameter type (`number | VarietyConfig`)
- `VarietyError` required fields (`poolSize`, `batchSize`)

This class of failure is preventable with an explicit contract file that both sides reference.
**Effort**: Small (1 pipeline to add contract stub generation to Tester phase)
**Impact**: Eliminates API mismatch debug cycles; enables parallel work by Tester and Implementer on shared contract

---

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Test Helpers Library for Domain Layer

**Priority**: High
**Category**: Tooling
**Recommendation**: Expand `tests/domain/helpers.ts` into a comprehensive test utilities library with:
1. Factory functions for all domain types (Scene, ComboAssignment, Graph, etc.)
2. Fixture schema validators (using Zod schemas from types.ts)
3. Assertion helpers specific to violations, collision results, and lint reports
4. Seeded random data generators for property-based tests

**Rationale**: The current helpers.ts (312 lines) has good foundations but is incomplete:
- `createMinimalScene()` hardcodes specific values; Phase 2 tests will need parameterized variants
- No factory for `HistoryEntry` despite variety.test.ts needing many instances
- No shared violation assertion beyond `assertViolationStructure()`
- Property tests in variety.test.ts redefine constants (STAGE_AREAS, CAMERA_MOVES) that already exist in rules.ts

The linter.test.ts shows evidence of duplicated setup code that should be shared.
**Effort**: Medium (1-2 pipelines, can be incremental)
**Impact**: Faster test writing in Phase 2-4; consistent test patterns; easier debugging

---

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Linter-Handshake Integration Boundary

**Priority**: Medium
**Category**: Architecture
**Recommendation**: Define an explicit integration contract between linter.ts and handshake.ts. The linter should not call handshake validation functions directly but should use a facade that:
1. Converts linter context (Scene, stage names) to handshake inputs
2. Maps handshake results (SimilarityResult) to Violation objects
3. Handles the "missing boundary frame" edge case uniformly

**Rationale**: The journal notes "5 linter failures" related to "integration with handshake results." The current implementation shows `checkR7Handshake()` in linter.ts calling `validateHandshake()` from handshake.ts, but the error mapping is implicit. This creates tight coupling that will cause issues when:
- Handshake strictness modes expand (currently "verbatim" | "paraphrase")
- Scene structure changes (Phase 2 may add prompt variants)
- R7 rule semantics evolve (threshold changes, new similarity algorithms)

A facade centralizes the mapping logic and makes both modules independently testable.
**Effort**: Small (1 pipeline, mostly refactoring)
**Impact**: Reduces inter-module test failures; enables independent evolution of linter and handshake logic

---

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Rule Predicate Consolidation

**Priority**: Medium
**Category**: Tech Debt
**Recommendation**: Move all rule predicate logic from linter.ts back into rules.ts as methods on a `RuleChecker` class or as predicate functions attached to the `Rule` type. The linter should only orchestrate which rules to apply and aggregate results.

**Rationale**: The current architecture splits rule knowledge across two files:
- `rules.ts`: Contains utility functions (`countWords`, `firstSentenceHasActionVerb`, etc.) and `RULES` array with severity/appliesTo metadata
- `linter.ts`: Contains the actual rule checkers (`checkR1SequentialWeighting`, `checkR2CameraVerb`, etc.)

This split means:
1. Adding a new rule requires editing two files
2. The `Rule.predicate` field is unused (defined as optional, always undefined except R15)
3. Rule semantics are not co-located with rule metadata
4. Tests for rule behavior are fragmented between rules.test.ts and linter.test.ts

The 89 rules.test.ts tests and 58 linter.test.ts tests show significant overlap in what they're testing.
**Effort**: Medium (2-3 pipelines, requires careful refactoring to maintain coverage)
**Impact**: Single source of truth for rules; easier rule maintenance; cleaner module boundaries

---

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Variety Engine Pool Validation at Config Time

**Priority**: Medium
**Category**: Architecture
**Recommendation**: Move pool validation from `assign()` runtime to a separate `createVarietyEngine(pools, config)` factory that validates upfront and returns a configured engine with a `generate()` method. This makes pool exhaustion a construction-time error rather than a mid-batch runtime error.

**Rationale**: The variety.ts implementation validates pools inside `assign()`, which means:
1. A partially generated batch is abandoned if pool exhaustion is detected mid-generation
2. The "retry with backoff" logic (100 retries per scene) can waste computation before discovering an impossible configuration
3. Phase 2 API routes will need to handle mid-generation failures, complicating the SSE streaming protocol

Early validation with a factory pattern makes the valid/invalid boundary explicit and testable.
**Effort**: Small (1 pipeline, API-preserving refactor with backward-compatible `assign()` wrapper)
**Impact**: Faster failure detection; simpler error handling in Phase 2 API layer

---

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Threshold Constants Centralization

**Priority**: Low
**Category**: Conventions
**Recommendation**: Create a `packages/domain/constants.ts` file that exports all numeric thresholds used across the domain layer:
- `SIMILARITY_THRESHOLD = 0.8` (handshake)
- `WORD_BUDGET_MIN = 40` / `WORD_BUDGET_MAX = 90` (R3)
- `MAX_GENERIC_VERBS = 2` (R3)
- `MAX_TIMESTAMPS = 3` / `MIN_TIMESTAMPS = 1` (R4)
- `LOOKBACK_DAYS = 30` / `LOOKBACK_RUNS = 10` (variety)
- `MAX_BATCH_SIZE = 10` / `MIN_BATCH_SIZE = 1` (variety)

**Rationale**: Currently, thresholds are scattered:
- `handshake.ts`: `DEFAULT_THRESHOLD = 0.8`
- `variety.ts`: `DEFAULT_LOOKBACK_DAYS = 30`
- `linter.ts`: Inline literals like `40`, `90`, `2`, `3`

The test specs (fixtures-spec.md, rule-scenarios.md) reference these thresholds. When a threshold changes, multiple files need updating, and tests may use stale values.
**Effort**: Small (1 pipeline, mechanical extraction)
**Impact**: Single source of truth for thresholds; easier threshold tuning; test/implementation alignment

---

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Phase 2 Integration Risk - Agent Pipeline

**Priority**: High
**Category**: Architecture
**Recommendation**: Before Phase 2 begins, create an integration test scaffold that exercises the full `compile -> generate -> lint -> repair` pipeline using mocked Anthropic responses. This validates that the domain layer contracts are complete for the agent.ts orchestrator.

**Rationale**: The task board moved agent.ts (T207) from Phase 1 to Phase 2 because it lives in `lib/` and makes API calls. However, agent.ts is the primary consumer of ALL domain modules:
- Calls `compile()` from compiler.ts
- Passes scaffold to Anthropic API
- Calls `lintBatch()` from linter.ts
- Uses variety engine for combo assignment
- Uses exporter for final output

The domain layer was tested in isolation, but no test validates that the types flow correctly through the orchestration pipeline. Phase 2 could discover that:
- `CompiledScaffold.markdown` format doesn't match what Anthropic expects
- `LintReport` structure doesn't support the repair loop's needs
- `Scene` type is missing fields the agent needs to persist

**Effort**: Medium (creates foundation for Phase 2 integration tests)
**Impact**: De-risks Phase 2; validates domain layer completeness; provides regression safety net

---

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Documentation Plan Needed

**Priority**: Low
**Category**: Process
**Recommendation**: Consider creating a `Documentation/Plans/domain-api-stability.md` plan that defines the Phase 1 API as "stable" and documents the backward compatibility commitment for Phase 2+.

**Rationale**: The domain layer is now complete with 525+ tests and 90.85% coverage. Phase 2-5 will consume these APIs. Any breaking changes to:
- `Scene` type fields
- `ComboAssignment` structure
- `LintReport` format
- `Violation` structure

...will cascade to multiple consumers (API routes, UI components, agent orchestrator). A stability plan prevents accidental breaking changes during later phases.
**Effort**: Small (documentation only)
**Impact**: Protects Phase 1 investment; sets expectations for Phase 2+ development

---

### 2026-07-11 -- phase2-persistence-api: Document Agent Orchestrator Pattern

**Priority**: Medium
**Category**: Architecture
**Recommendation**: Extract and document the agent orchestrator pattern from `lib/agent.ts` as a reusable template. The phase-based approach (ASSIGNING -> COMPILING -> GENERATING -> LINTING -> REPAIRING -> DONE/FAILED) with SSE emission at each transition is a well-designed pattern that should be replicated for future agent implementations. Create `docs/patterns/agent-orchestrator.md` with: (1) Phase lifecycle diagram, (2) SSE event contract, (3) Error handling strategy, (4) Retry/repair logic, (5) State machine transitions.
**Rationale**: The `runBatch()` function implements a robust agent pipeline that took significant design effort. Future agents (search, embedding backfill, export) will need similar patterns. Without documentation, each new agent will reinvent the wheel or create inconsistent patterns.
**Effort**: Small (2-3 hours)
**Impact**: Reduces new agent development time by 50%. Ensures consistent error handling and SSE contracts.
**Trigger**: Before implementing 2nd agent (search or embedding backfill)

---

### 2026-07-11 -- phase2-persistence-api: Add Request Timeout to Anthropic Client

**Priority**: High
**Category**: Reliability
**Recommendation**: Add request timeout to the `fetch()` call in `lib/anthropic.ts`. Use AbortController with 120-second timeout. Handle AbortError separately with user-friendly message. Make timeout configurable via `ANTHROPIC_TIMEOUT_MS` env variable.
**Rationale**: Current implementation has no timeout on the fetch call. Long-running generations could hold connections indefinitely, causing: (1) HTTP connection pool exhaustion under load, (2) User confusion (spinner forever), (3) Memory leaks from unclosed connections. 120s is reasonable for batch generation (observed p99 latency ~45s for 5 scenes).
**Effort**: Small (1 hour)
**Impact**: Prevents resource exhaustion. Improves user experience. Required for production reliability.
**Trigger**: Immediate - required before production deployment

---

### 2026-07-11 -- phase2-persistence-api: Externalize Configuration to Config Module

**Priority**: Low
**Category**: Tech Debt
**Recommendation**: Create `lib/config.ts` to centralize all hardcoded configuration values. Extract: `maxAttempts = 2` (retry count), `claude-sonnet-4-6` (default model), variety lookback period, batch processing delays, SSE keepalive interval.
**Rationale**: Hardcoded values scattered across multiple files. Makes environment-specific tuning difficult. Changing a value requires code changes instead of env var updates.
**Effort**: Medium (4 hours)
**Impact**: Easier environment management. Clearer operational documentation. Enables runtime tuning.
**Trigger**: Before adding 3rd configurable value

---

### 2026-07-11 -- phase2-persistence-api: Plan Multi-Tenancy Architecture for Phase 3-5

**Priority**: High
**Category**: Architecture
**Recommendation**: Design multi-tenancy architecture before Phase 3. Current single-run constraint blocks production deployment. Required decisions: (1) Run isolation: per-user queuing vs global queue, (2) Resource limits: max concurrent runs per user, max scenes per day, (3) Data model: add userId FK to Run, Scene, FlowTemplate, ThemePack, (4) Access control: row-level filtering on all queries.
**Rationale**: Current "one active run" check is global, not per-user. If two users submit simultaneously, second user gets 409 Conflict. Multi-tenancy is foundational - retrofitting later is expensive (requires data migration, access control audit, API contract changes).
**Effort**: Large (dedicated pipeline)
**Impact**: Unlocks production deployment. Enables multiple concurrent users. Required for any business model beyond single-user tool.
**Trigger**: Must be designed before Phase 3 implementation begins

---

### 2026-07-12 -- phase3-canvas-ui: Fix Component Test Infrastructure Before Phase 4

**Priority**: High
**Category**: Tooling
**Recommendation**: Refactor canvas component tests to use the real Zustand store with state reset between tests, rather than mocking `useCanvasStore`. The current mock pattern fails with React 19 + Zustand + Vitest due to selector subscription timing issues. Use the same pattern that works in `canvas-store.test.ts` (44/44 passing): direct store access via `useCanvasStore.getState()` and `useCanvasStore.setState()`.
**Rationale**: 72 of 104 component tests fail despite implementation being correct (TypeScript passes, lint passes, snap-validation tests pass). The failure pattern shows components rendering but returning empty/undefined values from mocked selectors. This is a test infrastructure issue, not an implementation bug. If Phase 4 proceeds without fixing this, Run Execution UI will be untestable at the component level.
**Effort**: Small (4-6 hours to refactor 4 test files)
**Impact**: Enables reliable component-level testing. Required for Phase 4 run state visualization. Unblocks TDD workflow for UI features.
**Trigger**: Must complete before Phase 4 implementation begins

---

### 2026-07-12 -- phase3-canvas-ui: Extract Debounce Utility to Shared Library

**Priority**: Low
**Category**: Tech Debt
**Recommendation**: Extract the debounce implementation from `lib/hooks/useTemplate.ts` (lines 15-39) to `lib/utils/debounce.ts`. The current implementation includes a `.cancel()` method which is production-ready and more complete than typical debounce implementations.
**Rationale**: The debounce pattern will be needed for: (1) Inspector fragment editing, (2) Search input filtering, (3) Run parameter adjustment. Currently, reuse would require copy-paste or importing from a hook file (poor discoverability).
**Effort**: Small (30 minutes)
**Impact**: Code reuse. Consistent debounce behavior across features. Better discoverability.
**Trigger**: When 2nd debounce use case appears

---

### 2026-07-12 -- phase3-canvas-ui: Separate Run State from Canvas State in Phase 4

**Priority**: Medium
**Category**: Architecture
**Recommendation**: When implementing Phase 4 Run Execution UI, create a separate `useRunStore` rather than adding run-related state to `useCanvasStore`. Connect them via selectors that map run states to node visual properties. This keeps the canvas store focused on editing and the run store focused on execution state machine.
**Rationale**: The current `canvas-store.ts` (448 lines) is well-organized but tightly coupled to editing operations. Adding run state (SSE connection, phase transitions, per-scene status, error tracking) would double its size and mix two different concerns. Zustand supports multiple stores efficiently, and React Flow already separates "what nodes look like" from "what nodes are".
**Effort**: Built-in to Phase 4 design (no extra effort if planned upfront)
**Impact**: Cleaner architecture. Easier testing. Enables future features like "view-only run history" without canvas editing.
**Trigger**: Phase 4 design phase

---

### 2026-07-12 -- phase3-canvas-ui: Document React Flow v12 Integration Patterns

**Priority**: Low
**Category**: Conventions
**Recommendation**: Add React Flow v12 patterns to `project-guidelines.md` including: (1) Custom node type registration, (2) Node data interface requirements (`extends Record<string, unknown>`), (3) Parent-child relationships via `parentId`, (4) Drag-and-drop MIME type conventions, (5) Memoization requirements for custom nodes.
**Rationale**: The Phase 3 pipeline state file notes "React Flow v12 patterns not documented in project-guidelines.md" as a gap. Future UI work will need consistent patterns for: run status nodes, minimap customization, edge animations.
**Effort**: Small (1 hour)
**Impact**: Faster onboarding for future canvas features. Prevents pattern drift.
**Trigger**: End of Phase 3 doc sync or start of Phase 4

---

### 2026-07-12 -- phase3-canvas-ui: Consider MSW for API Mocking in Component Tests

**Priority**: Low
**Category**: Tooling
**Recommendation**: Evaluate Mock Service Worker (MSW) for component tests that involve API calls (template load/save, block library fetch). MSW intercepts at the network level, allowing components to use real hooks while controlling API responses.
**Rationale**: The current approach mocks at the store level, which misses integration between hooks and stores. MSW would allow testing the full path: `useTemplate` -> `useCanvasStore.loadTemplate` -> `fetch` -> response handling. This is particularly valuable for testing error states (network failures, 4xx responses, malformed JSON).
**Effort**: Medium (4 hours setup + 2 hours per test file migration)
**Impact**: More realistic tests. Better error case coverage. Works with React 19 concurrent features.
**Trigger**: When first component test needs to verify API error handling

---
