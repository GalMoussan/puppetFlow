# Org Tree (generated — do not edit; run `/company-org render`)

```
- CEO (root) — whole project
  - Domain (leaf, 4 docs) — pure TypeScript business logic, rules, compiler, linter
  - API (leaf, 3 docs) — server routes, Prisma, Anthropic client, agent pipeline
  - Canvas (leaf, 3 docs) — React Flow editor, lanes, blocks, palette, inspector
  - RunExperience (leaf, 3 docs) — run modal, progress, scene cards, export
  - Infrastructure (leaf, 8 docs) — CI/CD, deployment, auth, test infrastructure
```

## Division Charters (Summary)

| Division | Owns | Boundaries |
|----------|------|------------|
| **Domain** | Pure TS logic: compiler, variety, linter, handshake, exporter, rules, types | API routes → API; UI → Canvas/RunExperience |
| **API** | Routes, Prisma, Anthropic client, agent pipeline, SSE | Domain logic → Domain; Components → Canvas/RunExperience |
| **Canvas** | React Flow, lanes, blocks, palette, inspector, template CRUD | Run UI → RunExperience; API → API |
| **RunExperience** | Run modal, progress, scene cards, copy/reroll/export | Editor → Canvas; API → API |
| **Infrastructure** | CI/CD, Vercel, auth, env, test config, migrations | All implementation → other divisions |

## Coverage

All docs from `puppetflow-docs/SUMMARY.md` are assigned to exactly one leaf node.

Generated: 2026-07-08
