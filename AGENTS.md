# PuppetFlow — Project Conventions

## Overview

Visual Prompt Compiler for AI Video Pipelines. Transforms monolithic prompt files into a drag-and-drop flowchart system for the "Master of Puppets" content series.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript strict
- **Canvas**: @xyflow/react (React Flow v12)
- **Styling**: Tailwind CSS 4 (dark UI, UV-violet/acid-green accents)
- **State**: Zustand
- **Database**: PostgreSQL via Prisma (Supabase-hosted)
- **LLM**: Anthropic API (Codex-sonnet-4-6)
- **Validation**: Zod (all API IO + Codex structured output)
- **Tests**: Vitest (unit/integration) + Playwright (E2E)

## Architecture Invariant

`packages/domain/` is **pure TypeScript, zero React/Next imports**. The compiler, variety engine, linter, and exporter are all testable without a browser, DB, or API key.

## Key Directories

```
app/                    # Next.js pages and API routes
packages/domain/        # Pure domain logic (types, rules, compiler, linter)
lib/                    # Server utilities (anthropic.ts, agent.ts, db.ts)
prisma/                 # Schema and migrations
tests/                  # Mirrors source structure
```

## Testing Strategy

**TDD is mandatory**: tests first, then implementation.

- `packages/domain/` targets ≥90% branch coverage
- API routes: integration tests with mocked Anthropic client
- UI: component tests for snap logic + 4 Playwright smokes
- Each rule (R1–R15) has ≥2 positive and ≥2 negative fixtures

## Commands

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm test             # Run Vitest
pnpm test:e2e         # Run Playwright
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed Master of Puppets data
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check
```

## The 15 Rules (R1-R15)

The compiler and linter encode these rules. Each is a testable assertion:

1. **R1**: Sequential weighting — action first, preservation last
2. **R2**: Explicit camera verb per clip
3. **R3**: Word budget 40-90, strong verbs
4. **R4**: Beat structure with timestamps (max 3)
5. **R5**: Image-to-video division (no scene re-description)
6. **R6**: Negatives in IMAGE only, positives in video
7. **R7**: Boundary Frame Handshake (verbatim continuity)
8. **R8**: Short extends, preservation-heavy
9. **R9**: Retention pacing (change every 1.5-3s)
10. **R10**: Loop Closure (optional)
11. **R11**: Audio direction required
12. **R12**: Drop sync with chant
13. **R13**: Character locks verbatim
14. **R14**: Variety rules (no repeats in batch/history)
15. **R15**: Iteration discipline (advisory)

## Canvas Graph Contract

```typescript
type CanvasGraph = {
  version: 1;
  lanes: ["GLOBAL","IMAGE","VIDEO_START","EXTEND_MIDDLE","EXTEND_END"];
  nodes: Array<{
    id: string;
    blockDefId: string;
    lane: Lane;
    order: number;
    overrides?: { promptFragment?: string };
    pinned?: boolean;
  }>;
  edges: Array<{
    from: Lane; to: Lane;
    handshake: { strictness: "verbatim" | "paraphrase"; trackCrowdMembers: number };
  }>;
  runConfig: { loopMode: boolean; languages: { hi: number; ja: number }; batchSize: number };
};
```

## Design Direction

- Dark UI, near-black background
- UV-violet/acid-green festival accents
- Monospace for prompt text
- Hebrew-safe font stack
- Mobile: read-only run viewer only (canvas is desktop)

## Environment Variables

```env
DATABASE_URL          # Supabase pooled connection
DIRECT_URL            # For migrations
ANTHROPIC_API_KEY     # Server-side only
ANTHROPIC_MODEL       # Default: Codex-sonnet-4-6
APP_USER              # Basic auth username
APP_PASSWORD          # Basic auth password
```

## Development Workflow

1. Use `/company-plan` for features
2. Write tests first (TDD)
3. Implement to pass tests
4. Use `/company-execute` to run the plan
5. Review with spec-section citation

## Company Integration

This project uses the Multi-Agent Company framework:
- `/company-startup` — Initial configuration
- `/company-plan` — Feature planning
- `/company-execute` — Plan execution
- `/company-fast` — Quick tasks
