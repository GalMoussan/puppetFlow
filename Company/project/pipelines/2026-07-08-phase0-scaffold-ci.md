# Pipeline: Phase 0 — Scaffold & CI

**ID**: 2026-07-08-phase0-scaffold-ci
**Status**: Ready
**Module(s)**: Project infrastructure (no application code)
**Created**: 2026-07-08
**Pipeline Type**: Feature (Infrastructure Setup)
**Execution Mode**: Manager Direct Execution

## Design Summary

Initialize the PuppetFlow project with the complete development infrastructure:
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS 4 (dark theme foundation)
- Prisma ORM (schema deferred to Phase 2)
- Vitest + @testing-library/react for unit/integration tests
- Playwright for E2E tests
- GitHub Actions CI pipeline
- Zod-validated environment configuration
- Vercel project setup

This is infrastructure scaffolding with no design ambiguity. Per Company learnings, Manager executes directly without spawning workers.

## Design Decisions

- Q: Package manager? A: pnpm (per blueprint §3.1)
- Q: ESLint config style? A: ESLint 9 flat config (modern standard)
- Q: Formatting? A: Prettier (standard ESLint pairing)
- Q: GitHub repo creation? A: User creates manually; pipeline sets up local git
- Q: Vercel linking? A: User runs `vercel link` manually with their account

## Task Breakdown

### Phase 1: Initialize Next.js Project (Owner: Manager)

- [ ] Run `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack`
- [ ] Verify TypeScript strict mode in `tsconfig.json`
- [ ] Verify `app/` directory structure created
- [ ] Remove boilerplate content from `app/page.tsx` (replace with minimal placeholder)

### Phase 2: Configure Tailwind for Dark Theme (Owner: Manager)

- [ ] Update `tailwind.config.ts` with dark mode foundation
- [ ] Add UV-violet/acid-green festival accent colors to theme extend
- [ ] Configure monospace font for prompt text areas
- [ ] Create `app/globals.css` with dark theme base styles

### Phase 3: Add Prisma (Owner: Manager)

- [ ] Run `pnpm add prisma @prisma/client`
- [ ] Run `pnpm prisma init`
- [ ] Create `lib/db.ts` with Prisma client singleton pattern
- [ ] Update `.gitignore` to include Prisma artifacts
- [ ] Note: Schema definition deferred to Phase 2 pipeline

### Phase 4: Configure Vitest (Owner: Manager)

- [ ] Run `pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom`
- [ ] Create `vitest.config.ts` with React plugin and jsdom environment
- [ ] Create `tests/setup.ts` with @testing-library/jest-dom imports
- [ ] Create placeholder test `tests/example.test.ts` to verify setup
- [ ] Add `pnpm test`, `pnpm test:watch`, `pnpm test:coverage` scripts to `package.json`

### Phase 5: Configure Playwright (Owner: Manager)

- [ ] Run `pnpm add -D @playwright/test`
- [ ] Run `pnpm playwright install`
- [ ] Create `playwright.config.ts` with Chromium-only config (faster CI)
- [ ] Create `tests/e2e/` directory
- [ ] Create placeholder smoke test `tests/e2e/smoke.spec.ts`
- [ ] Add `pnpm test:e2e` script to `package.json`

### Phase 6: Environment Validation (Owner: Manager)

- [ ] Run `pnpm add zod`
- [ ] Create `lib/env.ts` with Zod schema for all env vars (per blueprint §8)
- [ ] DATABASE_URL (required)
- [ ] DIRECT_URL (required)
- [ ] ANTHROPIC_API_KEY (optional — degrades to export-only)
- [ ] ANTHROPIC_MODEL (optional, default claude-sonnet-4-6)
- [ ] APP_USER (required)
- [ ] APP_PASSWORD (required)
- [ ] Create `.env.example` with placeholder values
- [ ] Update `.gitignore` to exclude `.env` and `.env.local`

### Phase 7: GitHub Actions CI (Owner: Manager)

- [ ] Create `.github/workflows/ci.yml`
- [ ] Jobs: typecheck → lint → test:coverage → test:e2e
- [ ] Trigger on push to main and pull requests
- [ ] Use pnpm with caching
- [ ] Matrix: Node.js 20
- [ ] Playwright with browser installation caching

### Phase 8: Additional Configuration (Owner: Manager)

- [ ] Create/update `package.json` scripts:
  - `dev`, `build`, `start` (Next.js defaults)
  - `typecheck` (tsc --noEmit)
  - `lint` (next lint)
  - `test`, `test:watch`, `test:coverage` (Vitest)
  - `test:e2e` (Playwright)
  - `db:migrate` (prisma migrate deploy)
  - `db:seed` (prisma db seed)
  - `db:studio` (prisma studio)
- [ ] Configure ESLint for TypeScript strict + React hooks rules
- [ ] Add Prettier config (`.prettierrc`)
- [ ] Update README.md with actual setup instructions (verify commands work)

### Phase 9: Verification (Owner: Manager)

- [ ] Run `pnpm install` — no errors
- [ ] Run `pnpm typecheck` — exits 0
- [ ] Run `pnpm lint` — exits 0
- [ ] Run `pnpm test` — placeholder test passes
- [ ] Run `pnpm build` — production build succeeds
- [ ] Run `pnpm dev` — dev server starts on localhost:3000

### Phase 10: Git Commit (Owner: Manager)

- [ ] Stage all new files
- [ ] Commit: `[Phase 0] T001-T008: Initialize project scaffold with Next.js, Tailwind, Prisma, Vitest, Playwright, CI`

## Context for Agents

### Key Files to Create
```
app/
  layout.tsx          # Root layout with dark theme
  page.tsx            # Minimal placeholder
  globals.css         # Dark theme foundation
lib/
  db.ts               # Prisma client singleton
  env.ts              # Zod environment validation
prisma/
  schema.prisma       # Minimal init (models in Phase 2)
tests/
  setup.ts            # Testing library setup
  example.test.ts     # Verify Vitest works
  e2e/
    smoke.spec.ts     # Verify Playwright works
.github/
  workflows/
    ci.yml            # GitHub Actions pipeline
tailwind.config.ts    # Dark theme + festival colors
vitest.config.ts      # Vitest configuration
playwright.config.ts  # Playwright configuration
.env.example          # Environment template
.prettierrc           # Prettier config
```

### Patterns to Follow
- Prisma client singleton (prevent connection exhaustion in dev)
- Zod schemas for all external configuration
- ESLint flat config format
- Vitest with React Testing Library

### Known Gotchas
- Next.js 15 uses React 19 — some testing patterns differ
- Prisma needs both DATABASE_URL and DIRECT_URL for Supabase
- Playwright needs browser binaries installed separately in CI

### Learnings Applied
- Manager Direct Execution for simple infrastructure (no workers needed)
- TDD infrastructure setup enables the TDD workflow for future phases

## Guidelines Gaps

None identified. Phase 0 is well-specified in blueprint §6 and project-guidelines.md.

## Execution Log

_To be filled during /company-execute_
