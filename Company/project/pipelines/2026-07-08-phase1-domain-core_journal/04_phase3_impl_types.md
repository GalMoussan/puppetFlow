# Phase 3 Implementation: types.ts

**Module**: `packages/domain/types.ts`
**Status**: Complete
**Timestamp**: 2026-07-09

## What Was Implemented

All domain types and Zod schemas as specified by the test file `tests/domain/types.test.ts`:

### Enums
- `LaneSchema`: 5 fixed lanes (GLOBAL, IMAGE, VIDEO_START, EXTEND_MIDDLE, EXTEND_END)
- `BlockTypeSchema`: 16 block types matching Prisma enum
- `RunStatusSchema`: 7 run statuses
- `ViolationSeveritySchema`: hard, warn
- `RuleSeveritySchema`: hard, warn, advisory
- `VarietyErrorTypeSchema`: pool_exhausted, language_constraint, history_collision, invalid_config

### Core Types
- `CanvasNodeSchema`: Node with id, blockDefId, lane, order, optional overrides and pinned flag
- `CanvasEdgeSchema`: Edge with from, to, and handshake config (strictness, trackCrowdMembers)
- `RunConfigSchema`: loopMode, languages weights, batchSize (1-10), optional similarityThreshold and varietyLookback
- `CanvasGraphSchema`: Versioned (v1) graph with fixed lanes tuple, nodes, edges, runConfig

### Output Types
- `ViolationSchema`: rule, severity, optional sceneIndex/stage, evidence
- `ComboAssignmentSchema`: All variety axes including nested camera (start, middle, end)
- `SceneSchema`: Complete scene with all prompts, boundary frames, lintReport, notes
- `BatchOutputSchema`: Array of scenes (min 1)
- `CompiledScaffoldSchema`: markdown, themePack, combos, loopMode

## Key Design Decisions

1. **Version field as literal 1**: Used `z.literal(1)` for strict version gating. Version 2+ graphs will fail validation.

2. **Lanes as tuple**: Used `z.tuple()` with literals for exact lane order enforcement, not just array.

3. **RunConfig constraints**: batchSize constrained to 1-10, language weights require non-negative integers.

4. **Optional fields with defaults**: similarityThreshold defaults to 0.8, varietyLookback to 30 days.

5. **Zero-based scene index**: Matches test expectations for sceneIndex >= 0.

6. **Nullable notes**: Scene notes can be string or null (not undefined).

## Deviations from Test Expectations

None. All schemas match the test contracts exactly.

## Public API Exported

```typescript
// Schemas (for runtime validation)
export const LaneSchema, BlockTypeSchema, RunStatusSchema, ...

// Types (for TypeScript)
export type Lane, BlockType, RunStatus, CanvasNode, CanvasEdge,
  CanvasGraph, Violation, ComboAssignment, Scene, BatchOutput, ...

// Constants
export const LANES: readonly Lane[]
export const schemas: Record<string, ZodSchema>
```
