# Project Guidelines: PuppetFlow

These are project-specific conventions, tools, paths, and patterns for the PuppetFlow project. The Manager includes this file in every agent's prompt alongside their generic role definition.

## Project Overview

PuppetFlow is a **Visual Prompt Compiler for AI Video Pipelines** built with Next.js 15 (App Router) + TypeScript strict. It transforms drag-and-drop flowcharts into validated, production-ready prompts for the "Master of Puppets" content series. The system encodes 15 prompt-engineering rules (R1-R15) as testable assertions and enforces them through automated linting.

**Owner**: Gal Moussan
**Deployment**: GitHub → Vercel (personal, password-gated)

## Stable State

The stable state of this project is:
1. **All tests pass**: `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright)
2. **TypeScript compiles**: `pnpm typecheck` exits 0
3. **Linter clean**: `pnpm lint` exits 0
4. **CI green**: GitHub Actions workflow passes all stages

Any pipeline that introduces failures must fix them before completing. The Debugger's job is to return the project to this stable state.

## Documentation Structure

| Type | Location | Naming |
|------|----------|--------|
| Blueprint/Spec | `puppetflow-blueprint.md` | Single source of truth for all requirements |
| Claude conventions | `.claude/CLAUDE.md` | Project-specific Claude Code instructions |
| Docs repo | `../puppetflow-docs/` | GitBook-style documentation (separate repo) |
| Task specs | `../puppetflow-docs/tasks/phase-X/` | `TXXX-task-name.md` format |

### Documentation Rules
- The blueprint (`puppetflow-blueprint.md`) is the authoritative specification — cite section numbers in PRs
- Domain logic documentation lives as JSDoc in `packages/domain/`
- API contracts are documented via Zod schemas (self-documenting)
- No separate API docs — the schemas ARE the docs

## Error Handling Conventions

- **Zod for all boundaries**: Validate all external data (API requests, API responses, database reads)
- **Typed errors**: Use discriminated unions for error types (e.g., `VarietyError`, `LintViolation`)
- **No silent failures**: Every error path must surface to the user (toast, lint report, etc.)
- **Structured violations**: Linter returns `Violation[]` with `{rule, severity, sceneIndex, stage, evidence}`

### Never Do
- Never swallow errors silently
- Never use `any` type except with explicit justification
- Never let unvalidated data cross system boundaries

## Test Infrastructure

### Test Framework
- **Unit/Integration**: Vitest + @testing-library/react
- **E2E**: Playwright (4 smoke tests only)
- **Location**: `tests/` directory mirrors source structure

### Test Tiers
| Tier | Target | Coverage |
|------|--------|----------|
| Unit | `packages/domain/` | ≥90% branch |
| Integration | API routes | ≥80% line |
| Component | UI components | ≥70% line |
| E2E | Critical flows | 4 smoke tests |

### Running Tests
- **All unit tests**: `pnpm test`
- **Watch mode**: `pnpm test:watch`
- **Coverage**: `pnpm test:coverage`
- **E2E**: `pnpm test:e2e`
- **Specific file**: `pnpm test packages/domain/compiler.test.ts`

### Test Naming
- Test file: `{source-file}.test.ts` or `{source-file}.spec.ts`
- Test suite: `describe('{module name}', () => { ... })`
- Test case: `it('{expected behavior}', () => { ... })`

### Test Fixtures
Each of the 15 rules (R1-R15) requires:
- ≥2 positive fixtures (valid prompts that pass)
- ≥2 negative fixtures (invalid prompts that fail)

Fixtures live in `tests/domain/rules/fixtures/`

### React 19 + pnpm Compatibility
**CRITICAL**: This project uses `node-linker=hoisted` in `.npmrc` to avoid the "Invalid hook call" error caused by multiple React instances in pnpm's strict dependency resolution.

- **Root cause**: React 19 + pnpm's isolated `node_modules` structure + Vitest can load multiple React instances, breaking hooks
- **Fix**: The `.npmrc` file sets `node-linker=hoisted` which flattens dependencies like npm
- **Symptom if broken**: "Cannot read properties of null (reading 'useState')" or "Invalid hook call" errors in component tests
- **If you modify .npmrc**: Run `rm -rf node_modules pnpm-lock.yaml && pnpm install` to reset

Sources: [pnpm/pnpm#12116](https://github.com/pnpm/pnpm/issues/12116), [vitest-dev/vitest#3861](https://github.com/vitest-dev/vitest/issues/3861)

### TDD Workflow (MANDATORY)
1. **Write test first** (should fail — RED)
2. **Write minimal implementation** (should pass — GREEN)
3. **Refactor** (should still pass — REFACTOR)
4. **Verify coverage meets target**

## Compilation & Build

- **Verify TypeScript**: `pnpm typecheck`
- **Lint check**: `pnpm lint`
- **Full build**: `pnpm build`
- **Development server**: `pnpm dev`
- **Database migrate**: `pnpm db:migrate`
- **Database seed**: `pnpm db:seed`
- **Prisma Studio**: `pnpm db:studio`

### External Tools Required
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ (or Supabase account)
- Anthropic API key (optional — degrades to export-only mode)

## Code Patterns

### Architecture Invariant (CRITICAL)
`packages/domain/` is **pure TypeScript with zero external dependencies**:
- No React imports
- No Next.js imports
- No Prisma imports
- No fetch/network calls

This enables fast, deterministic unit tests. Violation of this invariant breaks the TDD workflow.

### Module Structure
```
app/                    # Next.js App Router pages and API routes
packages/domain/        # Pure domain logic (FRAMEWORK-FREE)
  ├── types.ts          # All domain types + Zod schemas
  ├── rules.ts          # R1-R15 as data + predicates
  ├── compiler.ts       # graph → scaffold (deterministic)
  ├── variety.ts        # combo assignment + collision detection
  ├── linter.ts         # output validation, returns Violation[]
  ├── handshake.ts      # boundary-frame extraction & similarity
  └── exporter.ts       # batch → scenes/[date].md format
lib/                    # Server utilities
  ├── anthropic.ts      # API client, structured output, streaming
  ├── agent.ts          # orchestrates compile→generate→lint→repair
  └── db.ts             # Prisma client singleton
prisma/                 # Database schema and migrations
tests/                  # Mirrors source structure
```

### Key Systems

| System | Location | Description |
|--------|----------|-------------|
| Compiler | `packages/domain/compiler.ts` | Transforms graph JSON → scaffold markdown |
| Variety Engine | `packages/domain/variety.ts` | Assigns combos avoiding collisions |
| Linter | `packages/domain/linter.ts` | Validates output against R1-R15 |
| Handshake Validator | `packages/domain/handshake.ts` | Boundary frame extraction + similarity |
| Agent Pipeline | `lib/agent.ts` | Orchestrates compile → generate → lint → repair |

### The 15 Rules (R1-R15)
See `puppetflow-blueprint.md` Section 2 for full specification. Each rule is:
- Defined as data in `packages/domain/rules.ts`
- Enforced by predicates in `packages/domain/linter.ts`
- Tested with positive/negative fixtures

### Validation Pattern
All external data uses Zod:
```typescript
// Define schema
const MySchema = z.object({ ... });

// Validate at boundary
const result = MySchema.safeParse(input);
if (!result.success) {
  // Handle validation error
}
```

### Canvas Graph Contract
See `.claude/CLAUDE.md` for the `CanvasGraph` type definition. Key points:
- Version field for forward compatibility
- Lanes are fixed and ordered
- Nodes reference `blockDefId` (FK to database)
- Edges carry handshake configuration

## Common Gotchas

### Framework Boundary
1. **Domain purity**: Never import React/Next/Prisma in `packages/domain/`. This breaks TDD.

### API Layer Patterns
15. **SSE Streaming**: Use `ReadableStream` with `Content-Type: text/event-stream`. The `lib/agent.ts` `SSEEmitter` callback type is: `(event: SSEEvent) => void`. All consumers must provide this callback.

16. **Anthropic Client Retry**: `lib/anthropic.ts` handles 429 (rate limit) with exponential backoff. Max 3 retries. Other 4xx errors fail immediately.

17. **Error Type to HTTP Status Mapping**:
    - `NotFoundError` → 404
    - `BadRequestError` → 400
    - `ConflictError` → 409
    - `LintError` → 422
    - Generic `Error` → 500

18. **Schema Naming**: `BatchOutputSchema` exists in two places with different shapes:
    - `lib/anthropic.ts` — 8 fields (API response parsing)
    - `packages/domain/types.ts` — 14+ fields (full domain object)
    Import from the module being tested.

### Rule Enforcement
2. **Handshake similarity**: The 80% threshold is strict — even small lighting descriptor changes fail. Boundary tests: 0.79 fails, 0.80 passes.

3. **R15 has no predicate**: R15 (Iteration Discipline) is advisory/UI-level only. Its `predicate` field is undefined. Linter skips it.

### Batch Generation
4. **Single API call for batch**: All 5 scenes generate in one Claude call (cross-scene variety constraints). Reroll is per-scene.

5. **Export = API parity**: The scaffold exported for Claude Code must be byte-identical to what the API uses.

6. **Loop mode is optional**: Only inject closure directives when `runConfig.loopMode === true`.

7. **Pinned blocks bypass rotation**: Don't include them in variety calculations.

### Variety Engine
8. **Camera moves can repeat**: Camera and subgenre axes are NOT tracked for within-batch collision (per R14).

9. **History lookback split**: 30-day lookback for stage+moment (inclusive: `>=`), 10-run lookback for dynamic+payoff.

10. **Language distribution validation**: `generateLanguageDistribution()` validates all specified languages exist in pool before generating.

### Infrastructure
11. **Basic auth middleware**: All routes protected — test with credentials or mock the middleware.

12. **Prisma client singleton**: Use `lib/db.ts`, never instantiate directly.

### Testing
13. **Property-based tests use fixed seeds**: Variety engine tests use seed=42 for deterministic CI.

14. **Boundary condition operators**: Document inclusivity explicitly. Example: "pass: exactly 30 days old, fail: 31 days old".

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase pooled connection string |
| `DIRECT_URL` | Yes | Direct connection for migrations |
| `ANTHROPIC_API_KEY` | No* | Server-side only (*degrades to export-only) |
| `ANTHROPIC_MODEL` | No | Default: `claude-sonnet-4-6` |
| `APP_USER` | Yes | Basic auth username |
| `APP_PASSWORD` | Yes | Basic auth password |

Validation in `env.ts` with Zod — missing required vars fail fast on boot.

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. `pnpm typecheck` — TypeScript compilation
2. `pnpm lint` — ESLint
3. `pnpm test:coverage` — Vitest with coverage
4. `pnpm test:e2e` — Playwright smoke tests

All stages must pass before Vercel promotes the deployment.

## Branch & Commit Conventions

- **Branch naming**: `feat/TXXX-short-description`
- **Commit format**: `[Phase X] TXXX: Brief description`
- **PR requirements**:
  - All CI stages green
  - Spec section cited (e.g., "Implements blueprint §3.4")
  - Reviewer approval

## Phase Structure

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| 0 | Scaffold & CI | Next.js, Prisma, Vitest, Playwright, GitHub Actions |
| 1 | Domain Core | types, rules, compiler, variety, linter, handshake, exporter |
| 2 | Persistence & API | Prisma schema, CRUD routes, Run SSE, Anthropic client |
| 3 | Canvas UI | React Flow, block nodes, palette, inspector, snap validation |
| 4 | Run Experience | Run modal, progress UI, scene cards, copy/reroll/export |
| 5 | Polish & Deploy | Auth, dark theme, error handling, production deployment |

See `../puppetflow-docs/TASK_BOARD.md` for the full 46-task breakdown.

## Org Tree

The project is organized into a hierarchical structure at `Company/project/org/`. Each node has a `manager.md` with its charter, macro doc, and owned docs.

```
CEO (root)
├── Domain       — pure TS logic (compiler, linter, variety, handshake)
├── API          — routes, Prisma, Anthropic client, agent pipeline
├── Canvas       — React Flow editor, lanes, blocks, palette
├── RunExperience — run modal, progress, scene cards, export
└── Infrastructure — CI/CD, deployment, auth, test config
```

### Key Files

| File | Purpose |
|------|---------|
| `Company/project/org/vision.md` | North Star, Pillars, Standing Design Answers |
| `Company/project/org/tree.md` | Generated tree visualization |
| `Company/project/org/CEO/manager.md` | Root node charter |
| `Company/project/org/CEO/{Division}/manager.md` | Division charters + macro docs |

### Usage

- **Route missions**: Find the division whose charter matches the scope
- **Escalate cross-cutting**: If multiple divisions involved, escalate to CEO
- **Audit structure**: Run `/company-org reorg` to check if splits/merges needed
