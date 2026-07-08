# Node: Domain

**Node path**: CEO/Domain
**Parent**: CEO
**Kind**: leaf
**Subordinates**: none
**Last propagation**: none yet

## Charter

**Owns**: Pure TypeScript business logic with zero framework dependencies:
- Type definitions and Zod schemas (`types.ts`)
- The 15 prompt-engineering rules as data + predicates (`rules.ts`)
- Graph-to-scaffold compilation (`compiler.ts`)
- Variety/combo assignment with collision detection (`variety.ts`)
- Output validation against R1-R15 (`linter.ts`)
- Boundary-frame extraction and similarity checking (`handshake.ts`)
- Batch-to-markdown export (`exporter.ts`)

**Boundaries**:
- API routes and HTTP handling → `API`
- Anthropic client and agent orchestration → `API`
- React components and UI state → `Canvas` / `RunExperience`
- CI/CD and deployment → `Infrastructure`

## Macro Doc

The Domain layer is the heart of PuppetFlow — all business logic lives here, isolated from frameworks.

### Core Invariants

1. **Zero Dependencies**: No React, no Next.js, no Prisma, no network calls. Only pure TypeScript + Zod.
2. **Deterministic Compilation**: Given the same graph input, `compiler.ts` always produces identical scaffold output.
3. **Rule Predicates**: Each rule (R1-R15) is a pure function: `(scene) → Violation[]`. Composable, testable, no side effects.
4. **Variety Constraints**: Combo assignment respects both batch uniqueness (no repeat in 5 scenes) and history window (configurable lookback).
5. **Handshake Contract**: Boundary frames extracted from scene N's end must match scene N+1's start at ≥80% similarity.

### Key Algorithms

- **Compiler**: Traverses lanes in order (GLOBAL → IMAGE → VIDEO_START → EXTEND_MIDDLE → EXTEND_END), concatenates block prose, injects overrides, produces scaffold markdown.
- **Variety Engine**: Greedy assignment with backtracking. Collision = same combo in batch OR in history window.
- **Linter**: Runs all 15 rule predicates, collects violations, sorts by severity.
- **Handshake**: Extracts lighting/environment descriptors from boundary frames, computes similarity via normalized token overlap.

### Test Strategy

- ≥90% branch coverage target
- ≥2 positive + ≥2 negative fixtures per rule
- Snapshot tests for compiler output
- Property-based tests for variety collision detection

## Owned Detail Docs

| Doc | Path | Layer |
|-----|------|-------|
| System Overview (domain section) | `puppetflow-docs/architecture/system-overview.md` | Technical |
| Data Flow (domain transformations) | `puppetflow-docs/architecture/data-flow.md` | Technical |
| Test Strategy (domain tests) | `puppetflow-docs/testing/test-strategy.md` | Test |
| Phase 1 Tasks | `puppetflow-docs/tasks/phase-1/` | Task |
