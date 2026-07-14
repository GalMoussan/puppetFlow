# Phase 4 P0 Runtime Bug Status (CLOSED)

**Date:** 2026-07-14  
**Phase 4:** **DONE**  
**Verified via:** code audit + full Vitest suite + human generate path (DeepSeek)

| P0 | Symptom | Fix | Status |
|----|---------|-----|--------|
| Inspector infinite loop | Lane click max update depth | `useShallow` in Inspector | FIXED |
| Generate validation failed | No templateId | Bootstrap first template | FIXED |
| Save no-op | Missing templateId | Bootstrap + disable Save | FIXED |
| Variety pool size | Pool thinner than batch | `padPool` in agent | FIXED |
| Blocks vanish | `archived=false` coercion | `QueryBooleanSchema` | FIXED |
| Seed wiped blocks | deleteMany | Seed upsert by name | FIXED |
| IMAGE drop fails | Lane dimensions | `createLaneNodes` | FIXED |
| White RF controls | Light defaults | `globals.css` dark | FIXED |
| Create block missing | Not mounted | CreateBlockButton in palette | FIXED |
| Anthropic-only UI | No key for user | DeepSeek provider + `/api/llm/status` | FIXED |
| Language weights error | hi+ja vs scene count | Auto-fit in RunModal | FIXED |
| Structured output fail | Missing boundary frames | `lib/llm-batch-output.ts` | FIXED |

## Residual → Phase 5

- Global toasts → **T503**
- Auth gate → **T501** / **T408**
- Theme polish → **T502**
