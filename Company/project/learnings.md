# Pipeline Learnings (Project-Specific)

Project-specific lessons from pipeline executions.
The Optimizer updates this file after each pipeline.

Generic lessons (applicable to any project) go to `Company/learnings.md`.

## Changelog Format

### {date} -- {pipeline-id}: {feature name}

**Context:** ...
**Changes applied:** ...

---

<!-- Project-specific changelog entries below -->

### 2026-07-08 -- 2026-07-08-phase0-scaffold-ci: Scaffold & CI

**Context:** Initial project scaffold with Next.js 15, Tailwind CSS 4, Prisma 7, Vitest, Playwright, and GitHub Actions CI.

**Changes applied:**
1. **Prisma 7 requires adapter pattern**: The new Prisma 7 client no longer accepts a direct `connectionString` option. Must use `@prisma/adapter-pg` with a `Pool` instance. The client is generated to `app/generated/prisma/` by default, import from `client.ts`.

2. **Next.js 16 removed `next lint`**: The `next lint` CLI command was removed in Next.js 16. Use `eslint .` directly with the flat config format.

3. **Tailwind CSS 4 uses `@theme` directive**: Custom colors are defined in CSS using `@theme inline { ... }` rather than in a separate `tailwind.config.ts`. The config file format has changed significantly.

4. **npm naming restrictions**: Project directories cannot have capital letters when using `pnpm create next-app`. Must use lowercase directory names.

5. **Zod 4 API**: Using Zod 4.x which has slightly different API from Zod 3.x. Schema validation works the same way.

---
