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
- Stack: Next.js App Router, React 19, React Flow 12, Prisma, Zustand
- TDD workflow: Write tests FIRST, then implementation
- Current phase: Phase 5 - Polish & Deploy (Phase 4 Run Experience is DONE)

Resume task: Continue Phase 5 — basic auth middleware (T501), auth Playwright smoke (T408),
dark theme polish (T502), empty states + toasts (T503), then production deploy (T504–T506).

Key files:
- middleware.ts (basic auth)
- lib/env.ts (APP_USER / APP_PASSWORD)
- app/library/page.tsx (generation library)
- app/runs/[id]/page.tsx (run viewer)

Start by checking HANDOFF/STATE.md and running `pnpm test` + `pnpm typecheck`.
```

---

## Context Summary

### What PuppetFlow Does
Visual canvas tool for composing AI video generation prompts. Users drag blocks onto lanes; the system compiles scaffolds, assigns variety, calls an LLM (Anthropic or DeepSeek), lints, and persists runs forever (visible in `/library`).

### Phase status
- Phases 0–4: **DONE**
- Phase 5: **IN PROGRESS** (auth → polish → deploy)

### Key routes
| Route | Purpose |
|-------|---------|
| `/` | Canvas editor |
| `/library` | All generations (DB history) |
| `/runs/[id]` | Single run viewer |

---

## Phase 5 Checklist

1. Basic auth middleware (`APP_USER` / `APP_PASSWORD`)
2. Playwright auth challenge (T408)
3. Dark theme polish
4. Empty states and error toasts
5. Vercel deployment + production migration/seed
6. README runbook + final acceptance
