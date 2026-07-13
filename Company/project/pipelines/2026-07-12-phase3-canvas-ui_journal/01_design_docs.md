# Journal: Documenter — Phase 3 Design Documentation

## What I Did

- Created GDD for Canvas UI at `puppetflow-docs/product/canvas-ui.md`
- Created technical architecture doc at `puppetflow-docs/developer/canvas-technical.md`
- Updated `puppetflow-docs/SUMMARY.md` to include both new documents in navigation

## Key Design Decisions Documented

### GDD (canvas-ui.md)

1. **Lanes enforce pipeline structure** — The 5 lanes (GLOBAL, IMAGE, VIDEO_START, EXTEND_MIDDLE, EXTEND_END) are fixed and ordered because the underlying AI video generation workflow depends on this structure for boundary frame handshakes.

2. **Snap validation is dual-layer** — Client-side for immediate feedback (green/red validity dots, drop rejection toasts) plus server-side revalidation on save to prevent invalid templates from being persisted.

3. **Variety pools defined by canvas contents** — Dragging rotation-group blocks onto canvas defines the candidate pools the variety engine draws from. This is a key user concept: "drag 6 cameras means rotate among 6 cameras."

4. **Mobile is read-only** — Canvas editing is desktop-only for v1. Mobile users can view template structure but cannot edit.

### Technical Doc (canvas-technical.md)

1. **React Flow group nodes for lanes** — Lanes implemented as React Flow group nodes with fixed positions; blocks are child nodes within lane parents.

2. **Zustand store with slices** — Actions grouped into logical slices (Graph, Selection, Template, Config) for maintainability and tree-shaking.

3. **Selector pattern for performance** — Components subscribe to only the state they need via selectors, avoiding unnecessary re-renders.

4. **Bidirectional transformation** — Documented the graph JSON to React Flow state (on load) and React Flow state to graph JSON (on save) transformations.

5. **Debounced autosave** — 500ms debounce on template saves to avoid API spam during rapid edits.

6. **Node memoization** — All custom node components wrapped with `memo()` for render performance.

## Problems Encountered

None significant. The blueprint (puppetflow-blueprint.md) was comprehensive and well-structured, making it straightforward to extract the relevant specifications for Phase 3.

## Assumptions

1. **React Flow v12 (@xyflow/react)** — Assumed this is installed as specified in blueprint. The technical doc uses v12 APIs (nodeTypes, custom nodes as components).

2. **Zustand already configured** — Assumed Zustand is part of the project setup (Phase 0). If not, the Implementer will need to install it.

3. **Block definitions fetched from API** — The technical doc assumes `/api/blocks?themePackId=X` endpoint exists from Phase 2. If the exact contract differs, the useBlockLibrary hook will need adjustment.

4. **Handshake edges are auto-generated** — Per blueprint, handshake edges between video lanes are auto-generated (not user-created). The technical doc reflects this.

5. **Dark UI color tokens exist** — The components reference color classes (bg-neutral-950, ring-violet-500, etc.) assuming Tailwind is configured with the festival theme palette.

## Files Modified

- Created: `/Users/galmoussan/projects/claude/puppetflow-docs/product/canvas-ui.md`
- Created: `/Users/galmoussan/projects/claude/puppetflow-docs/developer/canvas-technical.md`
- Updated: `/Users/galmoussan/projects/claude/puppetflow-docs/SUMMARY.md`

## Notes for Optimizer

1. **Test spec needed** — This journal covers Phase 1a (design docs). Phase 1b (test specifications) should follow next with detailed test cases for snap validation, drag-drop, inspector, and autosave.

2. **Code examples in technical doc** — I included substantial code snippets in the technical doc to guide the Implementer. If these prove inaccurate after implementation, the Doc Sync phase should update them.

3. **Performance section** — Added performance optimization guidance (memoization, selectors, debouncing) proactively since canvas UIs are performance-sensitive.
