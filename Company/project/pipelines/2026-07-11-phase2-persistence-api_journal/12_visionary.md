# Journal: Visionary - Post-Pipeline Review

## Pipeline: 2026-07-11-phase2-persistence-api
## Date: 2026-07-12

## What Was Reviewed

### Implementation Files
- `/lib/agent.ts` - Agent pipeline orchestrator (628 lines)
- `/lib/anthropic.ts` - Anthropic client with structured output (337 lines)
- `/lib/schemas.ts` - Zod validation schemas (282 lines)
- `/lib/errors.ts` - Custom error hierarchy (147 lines)
- `/prisma/schema.prisma` - 6 models: ThemePack, BlockDefinition, FlowTemplate, Run, Scene, UsageLog
- `/app/api/runs/route.ts` - REST API with SSE streaming (221 lines)
- `/packages/domain/types.ts` - Domain types with Zod schemas (398 lines)

### Architecture Context
- Project follows clean separation: `packages/domain/` for pure logic, `lib/` for infrastructure, `app/api/` for routes
- Prisma schema has proper relationships with `onDelete: Cascade` throughout
- SSE streaming pattern implemented correctly with proper lifecycle management

## Key Observations

### Architectural Strengths

1. **Clean Domain Separation**: The `packages/domain/` layer is framework-free. Types, linter, compiler, variety engine, and exporter have zero Next.js or Prisma imports. Textbook hexagonal architecture.

2. **Shared Zod Schemas**: Domain schemas are imported and extended in lib/schemas.ts. Eliminates validation drift.

3. **SSE Streaming Pattern**: POST /api/runs correctly implements Server-Sent Events with proper lifecycle management.

4. **Error Classification**: Custom error hierarchy with `getErrorStatusCode()` maps error types to appropriate HTTP status codes.

5. **Test Coverage**: 571 tests passing with comprehensive coverage.

### Systemic Issues Identified

1. **Single Active Run Constraint**: Global lock blocks multi-tenancy
2. **Missing Request Timeout**: fetch() to Anthropic has no timeout
3. **Hardcoded Configuration**: Retry counts, model names scattered across files
4. **No Structured Logging**: Using console.error throughout

### Technical Debt Catalog

| Item | Location | Severity |
|------|----------|----------|
| Duplicate active run check | lib/agent.ts, app/api/runs/route.ts | Low |
| Hardcoded retry config | lib/anthropic.ts:92 | Low |
| Missing request timeout | lib/anthropic.ts:139 | Medium |
| Default model hardcoded | lib/anthropic.ts:75 | Low |
| No structured logging | Multiple files | Medium |
| In-memory variety pool | lib/agent.ts:147-163 | Low |

## Recommendations Filed

| Recommendation | Priority | Category |
|---------------|----------|----------|
| Document Agent Orchestrator Pattern | Medium | Architecture |
| Add Request Timeout to Anthropic Client | High | Reliability |
| Externalize Configuration | Low | Tech Debt |
| Plan Multi-Tenancy Architecture | High | Architecture |

## Phase 3-5 Guidance

**Phase 3: Multi-Tenancy & Authentication**
- Add User model with userId FK to relevant models
- Implement NextAuth.js or Clerk for authentication
- Add row-level access control to all endpoints
- Design concurrent run support (per-user queuing)

**Phase 4: Scalability & Production Hardening**
- Add request timeout to Anthropic client (120s)
- Extract configuration to centralized config module
- Add rate limiting using Upstash or similar
- Implement circuit breaker for Anthropic API failures

**Phase 5: Observability & Operations**
- Add Prometheus-compatible metrics
- Create operational runbook
- Implement structured logging
- Add trace IDs to SSE events for debugging
