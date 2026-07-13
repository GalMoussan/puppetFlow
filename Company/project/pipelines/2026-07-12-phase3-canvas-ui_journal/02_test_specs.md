# Journal: Documenter - Phase 1b Test Specifications

## Pipeline: 2026-07-12-phase3-canvas-ui
## Date: 2026-07-12
## Phase: 1b - Test Specifications

## What Was Done

Created comprehensive test specification for Phase 3 Canvas UI at `puppetflow-docs/testing/phase3-test-spec.md`.

### Test Scenarios Created (80+ scenarios)

| Category | Count | Key Focus |
|----------|-------|-----------|
| React Flow Lane Rendering | 9 | Order, positioning, visual states |
| Custom Block Nodes | 15 | Type colors, fragment preview, pin toggle, validity |
| Block Palette | 14 | Grouping, search, drag-to-canvas |
| Inspector Panel | 14 | Block editing, lane order, keyboard shortcuts |
| Snap Validation | 16 | Valid/invalid drops, server revalidation |
| Template Save/Load | 23 | Autosave, round-trip, dirty state |
| E2E Workflows | 9 | Compose flow, validation, persistence |

### Priority Distribution

- **P0 (Critical)**: 25 scenarios - Lane rendering, snap validation, template round-trip
- **P1 (High)**: 30 scenarios - Block interactions, palette features
- **P2 (Medium)**: 25 scenarios - Edge cases, keyboard shortcuts

## Key Decisions

1. **Followed Phase 2 test spec format** - Used consistent table structure with ID, Scenario, Given, When, Then, Priority columns

2. **Derived numeric thresholds from technical doc** - Lane positions (0, 220, 440, 660, 880) and widths (200px) come from LANE_CONFIG constant

3. **data-testid naming convention** - Hierarchical pattern: `{component}-{identifier}` (e.g., `lane-VIDEO_START`, `block-{id}`)

4. **Coverage targets** - 80% line / 75% branch minimum; 85-90% for snap-validation.ts

## Files Created

- `puppetflow-docs/testing/phase3-test-spec.md` (~550 lines)

## Ready for Phase 2

The Tester can now implement test code based on these specifications:
- `tests/components/canvas/Canvas.test.tsx`
- `tests/components/canvas/BlockNode.test.tsx`
- `tests/components/canvas/BlockPalette.test.tsx`
- `tests/components/canvas/Inspector.test.tsx`
- `tests/lib/snap-validation.test.ts`
- `tests/lib/store/canvas-store.test.ts`
