# Node: CEO

**Node path**: CEO
**Parent**: (none — root)
**Kind**: root
**Subordinates**: Domain, API, Canvas, RunExperience, Infrastructure
**Last propagation**: none yet

## Charter

The whole PuppetFlow project — a visual prompt compiler that transforms drag-and-drop flowcharts into validated, production-ready prompts for AI video generation.

## Macro Doc

PuppetFlow is structured as five divisions that cleanly separate concerns:

| Division | Responsibility | Key Invariant |
|----------|---------------|---------------|
| **Domain** | Pure business logic (compiler, linter, variety, handshake) | Zero framework dependencies, ≥90% test coverage |
| **API** | Server routes, database, Anthropic client, agent pipeline | Zod at all boundaries, single batch call for variety |
| **Canvas** | Visual editor with React Flow lanes and block nodes | 5 fixed lanes, snap validation, autosave |
| **RunExperience** | Execution UI: progress, scene cards, copy/reroll/export | Progress transparency, scene independence |
| **Infrastructure** | CI/CD, deployment, auth, test infrastructure | Stable state = all gates green |

### Project Health Signals

- **Green CI** on main branch
- **Tests pass**: `pnpm test` (unit) + `pnpm test:e2e` (smoke)
- **Types check**: `pnpm typecheck`
- **Lint clean**: `pnpm lint`

### Cross-Cutting Concerns (CEO Handles)

- Vision and pillars (see `vision.md`)
- Cross-division architectural decisions
- Escalations that span multiple divisions
- Standing design answers

## Owned Detail Docs

(None — children own the details)
