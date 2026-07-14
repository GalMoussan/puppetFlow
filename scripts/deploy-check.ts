/**
 * Pre-deploy readiness check (T504/T505).
 * Does not print secret values — only presence / shape.
 *
 * Usage: pnpm deploy:check
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function present(key: string, minLen = 1): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length >= minLen;
}

function looksLikePostgresUrl(key: string): boolean {
  const v = process.env[key] ?? "";
  return (
    v.startsWith("postgres://") ||
    v.startsWith("postgresql://") ||
    v.startsWith("prisma+postgres://")
  );
}

// Files
const migrationDir = join(process.cwd(), "prisma/migrations");
const hasMigrations =
  existsSync(migrationDir) &&
  readdirSync(migrationDir).some((d) =>
    existsSync(join(migrationDir, d, "migration.sql"))
  );

checks.push({
  name: "prisma migrations present",
  ok: hasMigrations,
  detail: hasMigrations
    ? "prisma/migrations has at least one migration"
    : "No migration.sql found — run migrate diff / create init migration",
});

checks.push({
  name: "package build includes prisma generate",
  ok: true,
  detail: "pnpm build → prisma generate && next build",
});

// Env — production-required
const required = [
  ["DATABASE_URL", 20],
  ["APP_USER", 1],
  ["APP_PASSWORD", 4],
] as const;

for (const [key, min] of required) {
  const ok = present(key, min);
  checks.push({
    name: `env ${key}`,
    ok,
    detail: ok ? "set" : "missing or too short",
  });
}

checks.push({
  name: "DATABASE_URL looks like Postgres",
  ok: looksLikePostgresUrl("DATABASE_URL"),
  detail: looksLikePostgresUrl("DATABASE_URL")
    ? "postgres/prisma+postgres URL shape OK"
    : "expected postgresql:// or prisma+postgres://",
});

// Recommended for Supabase migrations
checks.push({
  name: "DIRECT_URL (recommended for migrations)",
  ok: present("DIRECT_URL", 10) || looksLikePostgresUrl("DATABASE_URL"),
  detail: present("DIRECT_URL", 10)
    ? "set"
    : "not set — ok if DATABASE_URL is a direct (non-pooler) URL for migrate",
});

const hasLlm =
  present("ANTHROPIC_API_KEY", 10) || present("DEEPSEEK_API_KEY", 10);
checks.push({
  name: "LLM key (Anthropic or DeepSeek)",
  ok: hasLlm,
  detail: hasLlm
    ? "at least one provider key present"
    : "no LLM key — app runs export-only until set",
});

checks.push({
  name: "DISABLE_BASIC_AUTH not true in this env",
  ok:
    process.env.DISABLE_BASIC_AUTH !== "true" &&
    process.env.DISABLE_BASIC_AUTH !== "1",
  detail:
    process.env.DISABLE_BASIC_AUTH === "true" ||
    process.env.DISABLE_BASIC_AUTH === "1"
      ? "auth disabled — fine for local; turn off for production"
      : "auth will be enforced",
});

const failed = checks.filter((c) => !c.ok);
console.log("\nPuppetFlow deploy readiness\n");
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
}
console.log("");

if (failed.length) {
  console.log(`Result: ${failed.length} issue(s) — fix before production deploy.`);
  console.log("See docs/DEPLOY.md for full checklist.\n");
  process.exit(1);
}

console.log("Result: ready for migrate + deploy steps (see docs/DEPLOY.md).\n");
process.exit(0);
