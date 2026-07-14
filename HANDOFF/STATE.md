# PuppetFlow Project State

**Handoff Date:** 2026-07-14  
**Current Branch:** main

## Project Status: Phase 5 — Deploy handoff ready

**Last update:** 2026-07-14 — T504/T505 tooling landed; Vercel CLI not logged in (needs human)

### Completed Phases 0–4

DONE (see prior notes).

### Phase 5

| Task | Status |
|------|--------|
| T501 Basic auth | DONE |
| T408 Auth e2e | DONE |
| T502 Dark theme | DONE |
| T503 Toasts + empty states | DONE |
| T506 README runbook | DONE (+ docs/DEPLOY.md) |
| T504 Prod migrate + seed | **READY** — baseline migration committed; run against prod DB |
| T505 Vercel deploy | **BLOCKED on human** — `vercel login` + env + `vercel --prod` |

### What was added for T504/T505

- `prisma/migrations/20260714120000_init/` — full schema SQL
- `pnpm db:prod:setup` — migrate deploy + seed
- `pnpm deploy:check` — readiness without printing secrets
- `vercel.json`, build `prisma generate && next build`, `postinstall`
- `docs/DEPLOY.md` full runbook

### Your next commands (human)

```bash
vercel login
vercel link
# set env vars in dashboard or vercel env add …
pnpm deploy:check
# with PRODUCTION DATABASE_URL / DIRECT_URL:
pnpm db:prod:setup
vercel --prod
```

### Test status

- Unit: ~1090 green (verify after this commit)
- Auth e2e: green
- Local Prisma migrate resolve may fail on prisma+postgres local proxy — use real Supabase DIRECT_URL for prod migrate
