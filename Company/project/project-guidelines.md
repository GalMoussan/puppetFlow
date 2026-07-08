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

1. **Domain purity**: Never import React/Next/Prisma in `packages/domain/`. This breaks TDD.

2. **Handshake similarity**: The 80% threshold is strict — even small lighting descriptor changes fail.

3. **Single API call for batch**: All 5 scenes generate in one Claude call (cross-scene variety constraints). Reroll is per-scene.

4. **Export = API parity**: The scaffold exported for Claude Code must be byte-identical to what the API uses.

5. **Loop mode is optional**: Only inject closure directives when `runConfig.loopMode === true`.

6. **Pinned blocks bypass rotation**: Don't include them in variety calculations.

7. **Basic auth middleware**: All routes protected — test with credentials or mock the middleware.

8. **Prisma client singleton**: Use `lib/db.ts`, never instantiate directly.

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
