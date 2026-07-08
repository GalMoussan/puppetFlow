# Node: API

**Node path**: CEO/API
**Parent**: CEO
**Kind**: leaf
**Subordinates**: none
**Last propagation**: none yet

## Charter

**Owns**: Server-side infrastructure connecting the domain layer to the outside world:
- API routes (blocks, templates, theme-packs, runs, export)
- Prisma schema and database operations
- Anthropic client with structured output
- Agent pipeline orchestration (compile → generate → lint → repair)
- SSE streaming for run progress
- Request/response validation

**Boundaries**:
- Pure business logic and rules → `Domain`
- React components and client-side state → `Canvas` / `RunExperience`
- CI/CD, deployment, auth middleware → `Infrastructure`

## Macro Doc

The API layer bridges the pure Domain logic with external systems (database, Claude API, HTTP clients).

### Core Invariants

1. **Zod at Boundaries**: All API requests and responses validated via Zod schemas. No unvalidated data crosses the boundary.
2. **Domain Delegation**: API routes are thin — they validate input, call Domain functions, persist results. No business logic in routes.
3. **Single Batch Call**: `POST /api/runs` generates all 5 scenes in one Claude API call. Cross-scene variety requires full context.
4. **SSE Progress**: Run execution streams progress events. Client receives: `compiling`, `generating`, `linting`, `repairing`, `complete`.
5. **Rate Guard**: Maximum 1 concurrent run per session. Prevents runaway API costs.

### Key Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/blocks` | CRUD | BlockDefinition management |
| `/api/theme-packs` | CRUD | ThemePack management |
| `/api/templates` | CRUD | FlowTemplate (canvas graphs) |
| `/api/runs` | POST | Execute batch generation |
| `/api/runs/[id]` | GET | Fetch run with scenes |
| `/api/runs/[id]/reroll` | POST | Regenerate single scene |
| `/api/export` | POST | Download scaffold as .md |

### Agent Pipeline

```
runBatch(templateId, config):
  1. Load graph from template
  2. Validate graph structure
  3. Compile to scaffold (Domain)
  4. Assign variety combos (Domain)
  5. Call Claude API (structured output)
  6. Parse response into scenes
  7. Lint each scene (Domain)
  8. If violations: repair loop (max 2 iterations)
  9. Persist Run + Scenes to database
  10. Return batch ID
```

### Prisma Models

- `BlockDefinition`: Reusable prompt components
- `ThemePack`: Grouped blocks for a visual theme
- `FlowTemplate`: Saved canvas graphs
- `Run`: Execution record with config
- `Scene`: Individual scene output (5 per run)

## Owned Detail Docs

| Doc | Path | Layer |
|-----|------|-------|
| System Overview (API section) | `puppetflow-docs/architecture/system-overview.md` | Technical |
| Data Flow (API transformations) | `puppetflow-docs/architecture/data-flow.md` | Technical |
| Phase 2 Tasks | `puppetflow-docs/tasks/phase-2/` | Task |
