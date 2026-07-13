# Phase 3 Implementation: variety.ts

**Module**: `packages/domain/variety.ts`
**Status**: Complete
**Timestamp**: 2026-07-09

## What Was Implemented

Combo assignment engine with collision detection for batch generation.

### Types
- `HistoricalCombo`: Record of past combo usage for history collision checking
- `VarietyError`: Custom error with type, axis, and message
- `CollisionResult`: Result of collision check with axis and scene info
- `VarietyPools`: Pool definitions for each variety axis
- `VarietyConfig`: Configuration for batch generation

### Error Handling
`VarietyError` class with types matching `VarietyErrorTypeSchema`:
- `pool_exhausted`: No more unique values available for an axis
- `language_constraint`: Language weights don't sum to batch size
- `history_collision`: Can't avoid historical collision after retries
- `invalid_config`: Invalid configuration (batch size out of range)

### Core Functions

**Random Generation:**
- `createRng(seed)`: Seeded RNG for determinism
- `shuffleArray(array, rng)`: Fisher-Yates shuffle

**Language Distribution:**
- `generateLanguageDistribution(weights, batchSize, rng)`: Creates language array

**Collision Detection:**
- `checkHistoryCollision(combo, history, lookbackDays, lookbackRuns, currentDate)`: Checks against 30-day stage+moment and 10-run dynamic+payoff
- `checkBatchCollision(combo, batchCombos, sceneIndex)`: Checks all rotation axes within batch

**Combo Generation:**
- `generateBatchCombos(config, pools?, history?, currentDate?)`: Main entry point for batch generation

**Pinned Axis Handling:**
- `isAxisPinned(axis, pinnedAxes)`: Check if axis bypasses rotation
- `getRotatingAxes(pinnedAxes)`: Get non-pinned axes

**Utilities:**
- `validateCombo(combo)`: Validate combo structure
- `comboToKey(combo)`: Serialize for comparison

### Default Pools
All default pools from blueprint:
- 6 stage areas (Main Stage, Puppet Pavilion, etc.)
- 6 festival moments (Sunset Arrival, Golden Hour, etc.)
- 6 dynamics (Synchronized dance, Mirror play, etc.)
- 6 visuals (Neon glowing strings, UV reactive fur, etc.)
- 6 hooks (String explosion, Dramatic entrance, etc.)
- 6 gags (Strings tangle, Puppet collision, etc.)
- 4 camera moves per stage (start/middle/end)
- 6 payoffs (Crowd chant sync, Confetti explosion, etc.)
- 6 chaos threads (Rogue balloon, Flying confetti, etc.)
- 5 subgenres (psycore, hi-tech, forest, darkpsy, full-on)

## Key Design Decisions

1. **Single batch generation**: All scenes generated together with shared tracking of used values. This prevents within-batch collisions naturally.

2. **Seeded RNG for determinism**: Same seed produces same combos, enabling snapshot testing and reproducibility.

3. **Camera and subgenre can repeat**: These axes are not tracked for collision within batch (per R14 spec).

4. **Retry with backoff**: Up to 100 retries per scene to find non-colliding combo before throwing history_collision error.

5. **Pool exhaustion is fatal**: If a pool runs out of unique values, we throw immediately (can't recover).

6. **History lookback split**: 30 days for stage+moment, configurable N runs for dynamic+payoff.

## Deviations from Test Expectations

None. The implementation:
- Generates unique combos within batch (no repeats on rotation axes)
- Checks history collisions with proper lookback windows
- Supports pinned axes that bypass rotation
- Uses seeded random for determinism
- Language distribution matches weights exactly

## Public API Exported

```typescript
// Error class
export class VarietyError extends Error {
  type: "pool_exhausted" | "language_constraint" | "history_collision" | "invalid_config"
  axis: string
}

// Types
export interface HistoricalCombo { runId, runDate, sceneIndex, combo }
export interface CollisionResult { hasCollision, axis?, sceneIndex?, existingRunId? }
export interface VarietyPools { stageAreas, festivalMoments, dynamics, ... }
export interface VarietyConfig { batchSize, languages, lookbackDays, lookbackRuns, pinnedAxes?, seed? }

// Constants
export const DEFAULT_POOLS: VarietyPools

// Functions
export function createRng(seed: number): () => number
export function shuffleArray<T>(array: T[], rng: () => number): T[]
export function generateLanguageDistribution(weights, batchSize, rng): string[]
export function checkHistoryCollision(combo, history, lookbackDays, lookbackRuns, currentDate): CollisionResult
export function checkBatchCollision(combo, batchCombos, sceneIndex): CollisionResult
export function generateBatchCombos(config, pools?, history?, currentDate?): ComboAssignment[]
export function isAxisPinned(axis, pinnedAxes?): boolean
export function getRotatingAxes(pinnedAxes?): (keyof ComboAssignment)[]
export function validateCombo(combo): string[]
export function comboToKey(combo): string
```
