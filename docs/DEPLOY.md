# Production Deploy Runbook (Phase 5 — T504 / T505)

## Prerequisites

- Supabase (or any Postgres 15+) project
- Vercel account linked to `GalMoussan/puppetFlow`
- Env secrets ready (never commit `.env`)

### Required environment variables

| Variable | Where | Notes |
|----------|--------|--------|
| `DATABASE_URL` | Vercel + local | **Pooled** connection for the app (Supabase pooler / `?pgbouncer=true`) |
| `DIRECT_URL` | Vercel + local | **Direct** Postgres URL for migrations (optional if `DATABASE_URL` is already direct) |
| `APP_USER` | Vercel + local | Basic auth username |
| `APP_PASSWORD` | Vercel + local | Basic auth password (strong in prod) |
| `DEEPSEEK_API_KEY` and/or `ANTHROPIC_API_KEY` | Vercel | At least one for generation |
| `LLM_PROVIDER` | Vercel | `auto` \| `deepseek` \| `anthropic` |
| `DEEPSEEK_MODEL` / `ANTHROPIC_MODEL` | Vercel | Optional overrides |
| `DISABLE_BASIC_AUTH` | — | **Must be unset** in production |

Copy from `.env.example`.

---

## T504 — Production database (migrate + seed)

Migrations live under `prisma/migrations/` (baseline: `20260714120000_init`).

### Fresh empty database

```bash
# Point DATABASE_URL (and DIRECT_URL if using Supabase pooler) at production
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."   # recommended on Supabase

pnpm install
pnpm db:generate
pnpm db:migrate          # prisma migrate deploy
pnpm db:seed             # Master of Puppets theme pack + blocks + template
# or one shot:
pnpm db:prod:setup
```

### Existing database already created with `db push` (no migration history)

If tables already exist and match the schema:

```bash
# Mark baseline as applied without re-running SQL
pnpm exec prisma migrate resolve --applied 20260714120000_init
pnpm db:migrate:status
pnpm db:seed             # safe: upserts; does not wipe user blocks
```

### Verify

```bash
pnpm db:migrate:status
pnpm deploy:check
```

---

## T505 — Deploy to Vercel

### One-time project setup

```bash
# Interactive login (browser)
vercel login

# Link this repo (from project root)
vercel link

# Pull project settings (optional)
vercel pull --yes --environment=production
```

### Set production env on Vercel

```bash
# Example: set secrets (prompts for value)
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add APP_USER production
vercel env add APP_PASSWORD production
vercel env add DEEPSEEK_API_KEY production
vercel env add LLM_PROVIDER production
# optional:
vercel env add ANTHROPIC_API_KEY production
```

Or use Vercel Dashboard → Project → Settings → Environment Variables.

### Build settings

`vercel.json` + `package.json` already define:

- **Install:** `pnpm install --frozen-lockfile`
- **Build:** `pnpm build` → `prisma generate && next build`
- **Postinstall:** `prisma generate` (client under `app/generated/prisma`)

### Deploy

```bash
# Preview
vercel

# Production
vercel --prod
```

After first deploy, run **T504 migrate/seed** against the **production** database URL (from your machine or a one-off job). Vercel build does **not** run migrations by default (safer).

### Post-deploy smoke

1. Open the production URL → browser Basic Auth prompt → use `APP_USER` / `APP_PASSWORD`
2. Canvas loads with seeded template
3. `/library` loads
4. Run a 1-scene batch (DeepSeek/Anthropic)
5. Open run viewer → copy / export

### GitHub integration (recommended)

In Vercel: Import GitHub repo `GalMoussan/puppetFlow`, enable production deploys on `main`. CI (`.github/workflows/ci.yml`) still runs typecheck/lint/test on push.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails on Prisma client | Ensure `postinstall` / `build` run `prisma generate`; output path is `app/generated/prisma` |
| `migrate deploy` fails “table already exists” | Baseline with `migrate resolve --applied 20260714120000_init` |
| Auth loops / no login | Check `APP_USER`/`APP_PASSWORD` set; ensure `DISABLE_BASIC_AUTH` is not true |
| Generation fails | Set LLM key + `LLM_PROVIDER`; check `/api/llm/status` when logged in |
| Pooler migration errors | Use `DIRECT_URL` (port 5432) for migrate; keep pooled URL for app |

---

## Checklist

- [ ] Production Postgres provisioned
- [ ] `pnpm db:migrate` against prod
- [ ] `pnpm db:seed` against prod
- [ ] Vercel env vars set
- [ ] `vercel --prod` (or GitHub deploy) succeeds
- [ ] Basic auth works on prod URL
- [ ] Generate 1 scene smoke pass
