# Pipeline Learnings (Project-Specific)

Project-specific lessons from pipeline executions.
The Optimizer updates this file after each pipeline.

Generic lessons (applicable to any project) go to `Company/learnings.md`.

## Changelog Format

### {date} -- {pipeline-id}: {feature name}

**Context:** ...
**Changes applied:** ...

---

<!-- Project-specific changelog entries below -->

### 2026-07-10 -- 2026-07-08-phase1-domain-core: Phase 1 Domain Core

**Context:** Pure TypeScript domain layer implementation — 7 modules encoding 15 prompt-engineering rules (R1-R15) as testable assertions. 525 tests, 90.85% branch coverage, zero framework dependencies.

**Pipeline Health:** Good — 5/5 phases completed, manual verification recovery after rate-limit stall.

**Project-Specific Patterns Discovered:**

1. **Domain Purity Pattern**: All `packages/domain/` modules export only types, schemas, and pure functions. Zero React/Next.js/Prisma imports. This enables fast unit tests and deterministic behavior. Enforce for all future domain additions.

2. **Zod Schema + Inferred Type Pattern**: Every domain type has both runtime validation (`*Schema`) and static type (`type * = z.infer<typeof *Schema>`). Pattern from `lib/env.ts` applied consistently across all 7 modules.

3. **Discriminated Union for Errors**: `Violation` uses `{rule, severity, sceneIndex, stage, evidence}`. `VarietyError` uses `{type, axis, message}` with types: `pool_exhausted`, `language_constraint`, `history_collision`, `invalid_config`. Enables exhaustive type checking.

4. **Version Field for Forward Compatibility**: `CanvasGraph` includes `version: 1` as `z.literal(1)`. Non-v1 graphs fail validation. Enables future schema migrations.

5. **Handshake 80% Threshold**: `DEFAULT_THRESHOLD = 0.8` with configurable override via `RunConfig.similarityThreshold`. Tests verify boundary: 0.79 fails, 0.80 passes, 0.81 passes.

6. **Single Batch Generation**: All 5 scenes generate together with cross-scene variety tracking in the variety engine. This prevents within-batch collisions naturally.

7. **Pinned Blocks Bypass Rotation**: Blocks with `pinned: true` in CanvasNode are excluded from variety rotation entirely. Preserves character locks and style locks.

8. **R15 Has No Predicate**: R15 (Iteration Discipline) is advisory/UI-level only. The predicate field is undefined. Linter skips it during batch validation.

9. **Property-Based Testing with Fixed Seeds**: Variety engine uses fast-check with fixed seed (42) for 200 random pool configurations. Ensures deterministic CI while proving zero-collision invariant.

**Gotchas Specific to Domain Layer:**

1. **Test-Implementation API Alignment**: Tests written before implementation (TDD) may use different API shapes than implementation. Verification phase caught divergences (e.g., `collision` vs `hasCollision`, flat vs nested camera axes). Pattern: Tester should create minimal stub files with exact signatures in Phase 2.

2. **Boundary Condition Operators**: 30-day lookback uses `>=` (inclusive). Document boundary inclusivity explicitly: "pass: exactly 30 days old, fail: 31 days old".

3. **Camera Move Compound Handling**: "dolly zoom" counts as one camera move, not two. `countCameraMoves()` handles this by matching longest compound first.

4. **Word Counting Excludes Markers**: `countWords()` strips timestamps `[00:04]`, tags `[HOOK]`, `[DROP]`, and frame markers before counting.

5. **Loop Mode Conditional**: Loop directives only inject when `runConfig.loopMode === true`. Default is false. Tests must cover both branches.

6. **Language Distribution Validation**: `generateLanguageDistribution()` validates that all specified languages exist in the pool before generating distribution.

**Testing Infrastructure:**

- Test files: `tests/domain/{module}.test.ts`
- Fixtures: `tests/domain/fixtures/rules/r{NN}/r{NN}-{pos|neg}-{variant}.json`
- Helpers: `tests/domain/helpers.ts`
- Coverage: `npm run test:coverage` — domain must be ≥90% branch

**Module Dependency Order:**
```
types.ts → rules.ts → variety.ts / handshake.ts / exporter.ts → compiler.ts → linter.ts
```

Future phases must respect this order when extending or modifying domain modules.

---

### 2026-07-11 -- 2026-07-11-phase2-persistence-api: Persistence & API Layer

**Context:** Phase 2 implementation — Prisma schema, API routes, Anthropic client, agent orchestrator, SSE streaming, reroll/export endpoints. 571 tests, 3 debug iterations, all passing.

**Pipeline Health:** Fair — 3 debug iterations due to TDD API divergence and mock setup issues.

**Project-Specific Patterns Discovered:**

1. **BatchOutputSchema Scope Difference**: `lib/anthropic.ts` exports a minimal `BatchOutputSchema` (8 fields for API response parsing), while `packages/domain/types.ts` exports a full `BatchOutputSchema` (14+ fields for domain objects). Tests for `lib/anthropic.ts` must use the API format, not the domain format. Import from the module being tested.

2. **Route Handler Delegation Pattern**: API routes delegate to service functions in `lib/agent.ts` (`runBatch`, `rerollScene`, `rerollStage`). Error handling logic (404, 400, 409) lives in the service functions, not the route handlers. Route tests must mock service functions, not Prisma directly.

3. **SSE Streaming Pattern**: `lib/agent.ts` uses `SSEEmitter` callback type for real-time progress updates. All 3 arguments are required for `runBatch(templateId, runConfig, emitter)`. Tests must provide a mock emitter callback.

4. **Error Type Hierarchy**: `lib/errors.ts` exports specific error classes (`NotFoundError`, `BadRequestError`, `ConflictError`) that routes catch and map to HTTP status codes:
   - `NotFoundError` → 404
   - `BadRequestError` → 400
   - `ConflictError` → 409
   - Generic `Error` → 500
   Tests expecting specific status codes must throw the correct error type.

5. **RunConfigInput Required Fields**: `RunConfigInput` type requires: `loopMode`, `languages`, `batchSize`, `historyStrictness`. Tests must provide complete config objects, not partials.

6. **Anthropic Client Function Signatures**:
   - `generateBatch(scaffold, assignments, options?)` — requires combo assignments array
   - `generateScene(scaffold, assignments, sceneIndex, options?)` — for reroll
   - `repair(repairPrompt)` — single arg for lint repair

**Gotchas Specific to API Layer:**

1. **Next.js 16 RequestInit Breaking Change**: `signal: null` is no longer valid in `RequestInit` type. API tests using `createRequest()` helper must cast or use `as any` for signal parameter.

2. **vitest-mock-extended Hoisting**: When mocking modules that import from `@/lib/errors`, the mock factory runs before imports are resolved. Use plain `Error` with `.name` property set, or import errors dynamically inside tests.

3. **Export Endpoint Status Validation**: Only `DONE` runs can be exported. `PENDING`, `COMPILING`, `GENERATING`, `LINTING`, `REPAIRING` all return 400. `FAILED` returns 400 (not 500).

4. **Reroll Concurrent Run Handling**: Attempting to reroll while a run is in progress throws `ConflictError` (409), not `BadRequestError` (400).

---

### 2026-07-08 -- 2026-07-08-phase0-scaffold-ci: Scaffold & CI

**Context:** Initial project scaffold with Next.js 15, Tailwind CSS 4, Prisma 7, Vitest, Playwright, and GitHub Actions CI.

**Changes applied:**
1. **Prisma 7 requires adapter pattern**: The new Prisma 7 client no longer accepts a direct `connectionString` option. Must use `@prisma/adapter-pg` with a `Pool` instance. The client is generated to `app/generated/prisma/` by default, import from `client.ts`.

2. **Next.js 16 removed `next lint`**: The `next lint` CLI command was removed in Next.js 16. Use `eslint .` directly with the flat config format.

3. **Tailwind CSS 4 uses `@theme` directive**: Custom colors are defined in CSS using `@theme inline { ... }` rather than in a separate `tailwind.config.ts`. The config file format has changed significantly.

4. **npm naming restrictions**: Project directories cannot have capital letters when using `pnpm create next-app`. Must use lowercase directory names.

5. **Zod 4 API**: Using Zod 4.x which has slightly different API from Zod 3.x. Schema validation works the same way.

---
