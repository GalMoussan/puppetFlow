# Visionary Strategic Review - Phase 3 Canvas UI

**Date**: 2026-07-12
**Pipeline**: 2026-07-12-phase3-canvas-ui
**Reviewer**: Visionary (Software Architect Agent)

## Executive Summary

Phase 3 delivers a solid foundation for the visual canvas UI. The architecture follows established patterns (React Flow v12, Zustand) and integrates cleanly with the domain layer from Phase 1. Core tests pass (snap-validation: 29/29, canvas-store: 44/44). However, the component test infrastructure has a structural issue that needs addressing before Phase 4 can rely on comprehensive UI testing.

## Architecture Review

### 1. Zustand Store Pattern - APPROVED with observations

The `canvas-store.ts` implementation (448 lines) demonstrates proper Zustand patterns:

**Strengths:**
- Uses `subscribeWithSelector` middleware for optimized re-renders
- Immutable state updates throughout (no mutations)
- Clean separation: state, actions, and selectors
- Async actions for API integration (loadTemplate, saveTemplate)
- Proper TypeScript generics with React Flow node types

**Scalability Assessment:**
The current flat store structure will scale adequately for Phase 4 (Run Execution UI). However, if Phase 5+ adds significant state (authentication, multi-user presence), consider:
- Splitting into store slices: `useCanvasStore`, `useRunStore`, `useAuthStore`
- Using Zustand's `persist` middleware for offline support
- Adding optimistic updates with rollback for collaborative editing

**Risk Level:** Low. Current pattern handles the expected load.

### 2. React Flow v12 Integration - WELL ARCHITECTED

The integration follows React Flow v12 best practices:

**Strengths:**
- Custom node types (`LaneNode`, `BlockNode`) are properly memoized
- Node type registration is centralized in `Canvas.tsx`
- Parent-child relationships for lanes/blocks use `parentId` correctly
- Viewport management (fitView, zoom limits) configured appropriately

**Cross-cutting Concerns Addressed:**
- Keyboard handling for delete (Delete/Backspace)
- Selection state synchronized between React Flow and Zustand
- Drag-and-drop data transfer uses namespaced MIME types (`application/puppetflow-reorder`)

**Gotcha for Phase 4:** The canvas currently uses `nodesConnectable={false}`. When Phase 4 adds run execution visualization, you may need conditional connectability for live state indicators.

### 3. Snap Validation - CLEAN DOMAIN INTEGRATION

`lib/snap-validation.ts` (242 lines) demonstrates excellent separation of concerns:

- Pure functions for validation logic (no side effects)
- Imports only `Lane` type from domain layer
- Three levels: single placement, full graph, drag feedback
- Error types are specific and actionable

**Reusable Pattern:** The `validateCanvasGraph()` function with a `blockLibrary: Map<string, BlockForValidation>` parameter is a clean pattern. Consider extracting this as a generic "graph validator with external definitions" pattern for other validation scenarios.

### 4. Template Persistence - ADEQUATE for v1

The `useTemplate` hook with 500ms debounced autosave is appropriate for single-user editing.

**Phase 4+ Considerations:**
- Add conflict detection for multi-tab editing
- Consider websocket push for real-time sync
- Add retry logic for transient failures (current implementation just logs errors)

## Test Infrastructure Gap Analysis

### Problem Statement

Component tests (72/104 failures) fail due to mock setup issues:
- `vi.mock('@/lib/store/canvas-store')` returns values
- Components render but selectors return empty/undefined
- This is a React 19 + Zustand + Vitest interaction issue

### Root Cause

The mock pattern in `BlockNode.test.tsx` lines 35-42:
```typescript
vi.mock("@/lib/store/canvas-store", () => ({
  useCanvasStore: vi.fn((selector?: (state: MockCanvasStore) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockStore);
    }
    return mockStore;
  }),
}));
```

This approach works for simple hooks but fails when:
1. Components use multiple selector calls
2. Zustand's subscription-based reactivity is expected
3. React 19's concurrent features interact with mock timing

### Recommended Testing Strategy

**Option A (Recommended): Integration Testing with Real Store**

Instead of mocking Zustand, test components with the real store:

```typescript
import { useCanvasStore } from "@/lib/store/canvas-store";

beforeEach(() => {
  useCanvasStore.setState({
    nodes: [testNode],
    selectedId: null,
    // ... initial state
  });
});

afterEach(() => {
  useCanvasStore.getState().setNodes([]);
});
```

This approach:
- Tests real integration behavior
- Avoids mock synchronization issues
- Matches how `canvas-store.test.ts` already works (44/44 passing)
- Requires careful state cleanup between tests

**Option B: MSW + Component Testing**

Use Mock Service Worker for API calls, keep Zustand real:
- Mock only `fetch()` at the network level
- Let Zustand handle state naturally
- Test component behavior through user interactions

**Effort Estimate:** 4-6 hours to refactor component tests using Option A

### Test Coverage Priorities for Phase 4

Before Phase 4 begins, prioritize fixing tests for:
1. `Inspector.test.tsx` - Critical for run execution controls
2. `Canvas.test.tsx` - Must validate node rendering with run states
3. `BlockNode.test.tsx` - Needs validity indicator tests for run feedback

## Reusable Patterns Identified

### 1. Type-Safe Node Data Pattern

The `BlockNodeData` and `LaneNodeData` interfaces with `extends Record<string, unknown>` is a clean solution for React Flow's generic constraints. Extract to a shared types package.

### 2. Lane Configuration Constants

`LANE_CONFIG` and `LANE_ORDER` in `lib/types/canvas.ts` centralize layout. This pattern should be used for any future grid/lane-based UIs.

### 3. Debounce with Cancel Pattern

The debounce implementation in `useTemplate.ts` with explicit `cancel()` method is production-ready. Consider extracting to `lib/utils/debounce.ts` for reuse.

### 4. React Flow Custom Node Factory

The `createBlockNode()` factory in fixtures could be elevated to production code for programmatic node creation:

```typescript
// lib/canvas/node-factory.ts
export function createBlockNode(
  blockDef: BlockDefinition,
  lane: Lane,
  order: number,
  options?: { pinned?: boolean; override?: string }
): Node<BlockNodeData>
```

## Phase 4 Recommendations

### Before Starting Phase 4:

1. **Fix Component Test Infrastructure** (High Priority)
   - Refactor to use real Zustand store with state reset
   - Estimate: 4-6 hours

2. **Extract Reusable Patterns** (Medium Priority)
   - Move debounce, node factory to shared utils
   - Estimate: 2 hours

### Phase 4 Architecture Considerations:

1. **Run State Display**
   - Add `runState?: RunState` to `BlockNodeData`
   - Consider a separate `RunExecutionOverlay` component
   - Don't pollute canvas store with run-specific state

2. **SSE Integration**
   - Create `useRunStream` hook separate from canvas state
   - Update canvas nodes via store actions from SSE events
   - Handle reconnection and backpressure

3. **Error Visualization**
   - Lint violations should map to node validity states
   - Consider a `ValidationOverlay` component for error highlighting

## Risk Assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Component tests | Medium | Fix before Phase 4 starts |
| Store scalability | Low | Current pattern adequate |
| React Flow upgrade | Low | v12 is stable, minimal API churn expected |
| Mobile support | Low | Explicitly out of v1 scope |

## Conclusion

Phase 3 architecture is sound and follows established patterns. The main gap is test infrastructure, which should be addressed before Phase 4 to ensure UI reliability during run execution integration. The Zustand store pattern will scale for the next 2-3 phases without refactoring.

---

**Next Action:** Manager should schedule test infrastructure fix as first task of Phase 4 or as a dedicated spike before Phase 4 implementation begins.
