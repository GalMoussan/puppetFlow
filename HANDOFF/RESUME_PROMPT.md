# Resume Prompt for Next AI Tool

Copy and paste this prompt to resume work on PuppetFlow:

---

## Kickoff Prompt

```
I'm resuming work on PuppetFlow, a video prompt composition tool. Read these handoff documents first:

1. HANDOFF/STATE.md - Current project state
2. HANDOFF/TDD_STATUS.md - Test suite status
3. HANDOFF/ARCHITECTURE.md - Codebase structure
4. HANDOFF/CONVENTIONS.md - Coding standards

Quick context:
- Stack: Next.js 16 (App Router), React 19, React Flow 12, Prisma 7, Zustand 5
- TDD workflow: Write tests FIRST, then implementation
- Current phase: Phase 4 - Run Experience (mostly complete)

The project has 988 tests total. 974 pass, 14 fail (pre-existing SSE timing issues in agent.test.ts - not blocking).

Resume task: Verify the Run button integration works end-to-end, then complete Phase 4 verification.

Key files to read first:
- app/page.tsx (main page with RunButton in TopBar)
- components/canvas/RunButton.tsx
- lib/store/canvas-store.ts (Zustand state)

Start by running `pnpm dev` and visually confirming the Run button appears in the top-right of the canvas page.
```

---

## Context Summary (for AI memory)

### What PuppetFlow Does
PuppetFlow is a visual canvas tool for composing AI video generation prompts. Users drag "blocks" (prompt fragments) onto lanes (video stages), and the system compiles them into structured prompts for Claude to generate video scene descriptions.

### Key Concepts
- **ThemePack**: Creative universe (e.g., "Master of Puppets Festival")
- **BlockDefinition**: Prompt fragment with type (HOOK, CAMERA_MOVE, etc.) and lane scope
- **FlowTemplate**: Saved canvas configuration
- **Run**: Execution that generates 5 scenes with variety across axes
- **Variety Engine**: Ensures no repetition of combo assignments within batch or 30-day history

### Domain Layer Architecture
The `packages/domain/` directory contains pure TypeScript with zero framework dependencies:
- `types.ts` - All domain types + Zod schemas
- `rules.ts` - R1-R15 creative rules as data
- `compiler.ts` - Graph → scaffold (deterministic)
- `variety.ts` - Combo assignment + collision detection
- `linter.ts` - Output validation
- `handshake.ts` - Frame continuity checking
- `exporter.ts` - Markdown export

This architecture means domain logic is fully testable without browser, database, or API.

### State Management
Zustand v5 with `useShallow` for stable selectors. The canvas store holds:
- nodes/edges (React Flow graph)
- templateId, templateName, themePackId
- runStatus, currentRunId, runConfig
- isDirty, saveState

### SSE Progress
Runs stream progress via Server-Sent Events. Client uses EventSource via `useRunProgress` hook.

---

## If You Need to Debug

### Run Tests
```bash
pnpm test                    # All tests
pnpm test tests/packages/domain/  # Domain only
pnpm test --watch            # Watch mode
```

### Check Build
```bash
pnpm build                   # Full build
pnpm dev                     # Dev server
```

### Database
```bash
pnpm db:push                 # Push schema
pnpm db:seed                 # Seed data
pnpm db:studio               # Prisma Studio
```

---

## Phase 5 Tasks (After Phase 4)

When ready for Phase 5 - Polish & Deploy:
1. Basic auth middleware (APP_USER/APP_PASSWORD env)
2. Dark theme polish pass
3. Empty states and error toasts
4. Vercel deployment setup
5. Production migration + seed
6. Final acceptance testing
