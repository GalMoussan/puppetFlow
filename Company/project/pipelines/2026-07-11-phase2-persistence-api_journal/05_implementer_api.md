# Phase 2 Implementation Journal - API and Persistence Layer

**Date**: 2026-07-11
**Role**: Database Developer TypeScript Agent
**Task**: Implement Phase 2 production code to make tests pass

## Implementation Plan

### 1. Files to Create (in order)

1. **Prisma Schema** (`prisma/schema.prisma`)
   - 6 models: ThemePack, BlockDefinition, FlowTemplate, Run, Scene, UsageLog
   - Enums: BlockType, RunStatus
   - Foreign keys with cascading deletes
   - Composite indexes for performance

2. **Database Client** (`lib/db.ts`)
   - Prisma client singleton with adapter pattern

3. **Custom Errors** (`lib/errors.ts`)
   - VarietyError, AnthropicError, NotFoundError, ConflictError, BadRequestError

4. **Anthropic Client** (`lib/anthropic.ts`)
   - Structured output via Zod schemas
   - Retry logic for rate limits
   - Error types

5. **Agent Orchestrator** (`lib/agent.ts`)
   - runBatch() function with SSE event emission
   - rerollScene() function with sibling exclusion
   - AgentEventEmitter class for SSE events

6. **API Schemas** (`lib/schemas.ts`)
   - Zod schemas for API validation

7. **API Routes**:
   - Theme packs CRUD
   - Blocks CRUD
   - Templates CRUD
   - Runs with SSE
   - Reroll endpoint
   - Export endpoint

## Implementation Notes

### Prisma Schema Design
- Using JSON fields for graph, canon, combo, lintReport
- Cascading deletes on foreign keys
- Indexes on frequently queried fields

### Test Compatibility
- Tests import from `@/lib/db`, `@/lib/agent`, `@/lib/anthropic`
- Mock patterns already established in tests
- Route handlers use Next.js App Router conventions

## Progress

- [x] Analyzed requirements from test files
- [x] Read API routes technical spec
- [ ] Create Prisma schema
- [ ] Create lib/db.ts
- [ ] Create lib/errors.ts
- [ ] Create lib/anthropic.ts
- [ ] Create lib/agent.ts
- [ ] Create lib/schemas.ts
- [ ] Create API routes
