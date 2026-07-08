# Node: Canvas

**Node path**: CEO/Canvas
**Parent**: CEO
**Kind**: leaf
**Subordinates**: none
**Last propagation**: none yet

## Charter

**Owns**: The visual flowchart editor — the primary interface for composing prompts:
- React Flow canvas with 5 vertical lanes
- Custom block nodes with type-colored headers
- Handshake edges between stage lanes
- Block palette for drag-and-drop
- Inspector panel for block overrides
- Snap validation (enforce lane constraints)
- Template save/load with debounced autosave
- Zustand state management for canvas

**Boundaries**:
- Run execution UI (modal, progress, scene cards) → `RunExperience`
- API calls and data fetching → `API`
- Business logic (compilation, linting) → `Domain`
- Auth, deployment → `Infrastructure`

## Macro Doc

The Canvas is the main screen — where users visually compose their prompt pipeline by dragging blocks into lanes and connecting them.

### Core Invariants

1. **5 Fixed Lanes**: GLOBAL, IMAGE, VIDEO_START, EXTEND_MIDDLE, EXTEND_END — always present, always in order.
2. **Lane-Type Enforcement**: Blocks can only drop into lanes matching their `stage` property. Invalid drops are rejected.
3. **Handshake Edges**: Edges between stage lanes carry boundary-frame configuration. Only valid lane pairs allow edges.
4. **Autosave**: Template changes debounce-save after 1 second of inactivity. No explicit "save" button needed.
5. **Block Overrides**: Inspector allows per-placement text overrides without modifying the base BlockDefinition.

### Lane Structure

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ GLOBAL  │  IMAGE  │ VIDEO   │ EXTEND  │ EXTEND  │
│         │         │ START   │ MIDDLE  │ END     │
│ (gray)  │(orange) │(violet) │ (cyan)  │ (green) │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Block Node Anatomy

```
┌────────────────────────┐
│ [Type Badge] Block Name│  ← Header (colored by type)
├────────────────────────┤
│ Preview text...        │  ← Truncated prose preview
│ ○ Pin toggle           │  ← Exclude from variety rotation
├────────────────────────┤
│ ● left handle          │  ← Edge connection points
│                  ● right│
└────────────────────────┘
```

### State Management

- **Zustand store**: `nodes`, `edges`, `selectedNode`, `isDirty`
- **React Query**: Template CRUD, block definitions
- **Local Storage**: User preferences (zoom, pan position)

### Key Components

| Component | Purpose |
|-----------|---------|
| `Canvas.tsx` | Main React Flow container |
| `BlockNode.tsx` | Custom node renderer |
| `BlockPalette.tsx` | Drag source for blocks |
| `Inspector.tsx` | Override editor for selected block |
| `LaneBackground.tsx` | Visual lane separators |

## Owned Detail Docs

| Doc | Path | Layer |
|-----|------|-------|
| System Overview (Canvas section) | `puppetflow-docs/architecture/system-overview.md` | Technical |
| Features (Canvas features) | `puppetflow-docs/product/features.md` | Product |
| Phase 3 Tasks | `puppetflow-docs/tasks/phase-3/` | Task |
