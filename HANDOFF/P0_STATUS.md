# Phase 4 P0 Runtime Bug Status

**Date:** 2026-07-14  
**Verified via:** code audit + automated suite (P4-A green)

| P0 | Symptom | Fix commit / location | Status |
|----|---------|----------------------|--------|
| Inspector infinite loop | Lane click → getSnapshot / max update depth | `useShallow` in `Inspector.tsx` LaneInspector | **FIXED** |
| Generate "Validation failed" | No templateId on POST | Bootstrap loads first template in `app/page.tsx` | **FIXED** |
| Save no-op | saveTemplate requires templateId | Same bootstrap + Save disabled without template | **FIXED** |
| Variety pool size | "Pool 'hook' has 3 items, need 5" | `padPool` in `lib/agent.ts` | **FIXED** |
| Blocks vanish on refresh | `archived=false` coerced to true | `QueryBooleanSchema` in `lib/schemas.ts` | **FIXED** |
| Seed wiped user blocks | `deleteMany` on theme pack | Seed upserts by name only | **FIXED** |
| IMAGE drop fails | Parent lane no dimensions | `createLaneNodes` + `extent: "parent"` | **FIXED** |
| White RF controls | Default light controls | `globals.css` dark styles + hide attribution | **FIXED** |
| Create block not in palette | Button never mounted | `CreateBlockButton` in BlockPalette | **FIXED** |
| Missing Anthropic key | Run fails at generate | Expected until **P4-H** (user has keys ready) | **DEFERRED** |

## Residual (not P0)

- Lint **warnings** only (unused imports) — non-blocking after P4-A  
- Deepseek provider — P4-H  
- Toasts still not global — P4-D  
- Separate run store — P4-C (next)

## Human re-check (optional)

After P4-H keys: full generate → viewer → copy/export/reroll → create block → refresh.
