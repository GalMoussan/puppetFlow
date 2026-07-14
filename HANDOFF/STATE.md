# PuppetFlow Project State

**Handoff Date:** 2026-07-14  
**Current Branch:** main

## Project Status: Phase 5 IN PROGRESS (polish mostly done)

**Last update:** 2026-07-14 — T501/T408/T502/T503 done via subagents; deploy remaining

### Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Scaffold & CI | DONE |
| Phase 1 | Domain Core | DONE |
| Phase 2 | Persistence & API | DONE |
| Phase 3 | Canvas UI | DONE |
| Phase 4 | Run Experience | DONE |

### Phase 5: Polish & Deploy

| Task | Description | Status |
|------|-------------|--------|
| T501 | Basic-auth middleware | **DONE** |
| T408 | Playwright auth challenge smoke | **DONE** (2/2 e2e) |
| T502 | Dark theme polish | **DONE** |
| T503 | Empty states + error toasts | **DONE** |
| T504 | Production migration + seed | PENDING |
| T505 | Deploy to Vercel | PENDING |
| T506 | README runbook | **DONE** (partial runbook in README) |

### Next Steps

1. **T504 / T505** — Production env on Vercel (DB, secrets, migrate, seed, deploy)
2. Final smoke on deployed URL
3. Optional: migrate Next middleware → `proxy` when upgrading

### Test status

- Unit/integration: **1090** passed
- E2E auth + smoke: **PASS**
- Typecheck: green
- Lint: warnings only (no errors)

### Key Phase 5 files

```
middleware.ts
lib/basic-auth.ts
lib/store/toast-store.ts
components/ui/Toaster.tsx
app/globals.css                 # festival dark tokens
tests/e2e/auth.spec.ts
```
