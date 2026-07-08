# Node: Infrastructure

**Node path**: CEO/Infrastructure
**Parent**: CEO
**Kind**: leaf
**Subordinates**: none
**Last propagation**: none yet

## Charter

**Owns**: Everything that keeps the project buildable, testable, and deployable:
- CI/CD pipeline (GitHub Actions)
- Vercel deployment configuration
- Basic auth middleware
- Environment variable management
- Test infrastructure (Vitest, Playwright configs)
- Build tooling (Next.js, TypeScript, ESLint, Prettier)
- Database migrations and seeding
- Developer setup and onboarding

**Boundaries**:
- Business logic and rules → `Domain`
- API implementation → `API`
- UI components → `Canvas` / `RunExperience`

## Macro Doc

Infrastructure ensures the project is always buildable, testable, and deployable. The stable state is: tests pass, types check, lint clean, CI green.

### Core Invariants

1. **Stable State**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must all pass.
2. **CI Gates**: No merge to main without all CI jobs green (typecheck, lint, test, e2e).
3. **Environment Safety**: No secrets in code. All sensitive values via environment variables with Zod validation.
4. **Auth Required**: All routes protected by basic auth middleware. No anonymous access.
5. **Migration Safety**: Database changes via Prisma migrations. No direct schema edits in production.

### CI Pipeline

```yaml
Jobs (parallel where possible):
├── typecheck (tsc --noEmit)
├── lint (eslint .)
├── test (vitest with coverage)
└── e2e (playwright, depends on build)
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| DATABASE_URL | Yes | Supabase pooled connection |
| DIRECT_URL | Yes | Direct connection for migrations |
| ANTHROPIC_API_KEY | No | Enables generation (export-only without) |
| ANTHROPIC_MODEL | No | Default: claude-sonnet-4-6 |
| APP_USER | Yes | Basic auth username |
| APP_PASSWORD | Yes | Basic auth password |

### Test Tiers

| Tier | Tool | Coverage Target |
|------|------|-----------------|
| Unit | Vitest | ≥90% (domain), ≥80% (API), ≥70% (UI) |
| Integration | Vitest | API routes with test DB |
| E2E | Playwright | 4 smoke tests |

### Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI pipeline definition |
| `vitest.config.ts` | Unit/integration test config |
| `playwright.config.ts` | E2E test config |
| `lib/env.ts` | Zod environment validation |
| `prisma/schema.prisma` | Database schema |
| `.env.example` | Environment template |

### Developer Onboarding

```bash
pnpm install          # Dependencies
cp .env.example .env  # Environment
pnpm db:generate      # Prisma client
pnpm db:migrate       # Apply migrations
pnpm db:seed          # Seed data
pnpm dev              # Start dev server
```

## Owned Detail Docs

| Doc | Path | Layer |
|-----|------|-------|
| Setup Guide | `puppetflow-docs/developer/setup-guide.md` | Developer |
| Coding Standards | `puppetflow-docs/developer/coding-standards.md` | Developer |
| Tech Stack | `puppetflow-docs/resources/tech-stack.md` | Technical |
| Test Strategy | `puppetflow-docs/testing/test-strategy.md` | Test |
| Known Issues | `puppetflow-docs/resources/known-issues.md` | Technical |
| Changelog | `puppetflow-docs/resources/changelog.md` | Technical |
| Phase 0 Tasks | `puppetflow-docs/tasks/phase-0/` | Task |
| Phase 5 Tasks | `puppetflow-docs/tasks/phase-5/` | Task |
