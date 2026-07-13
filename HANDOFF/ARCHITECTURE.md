# PuppetFlow Architecture

## Stack Overview

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.2.10 |
| Language | TypeScript (strict) | 5.x |
| React | React 19 | 19.x |
| Canvas | @xyflow/react (React Flow) | 12.x |
| State | Zustand | 5.x |
| Database | PostgreSQL via Prisma | 7.x |
| Styling | Tailwind CSS | 4.x |
| Testing | Vitest + Testing Library | 3.x |
| E2E | Playwright | (configured) |
| LLM | Anthropic Claude | claude-sonnet-4-6 |
| Validation | Zod | 3.x |

---

## Directory Structure

```
puppetflow/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main canvas page
│   ├── library/page.tsx          # Block & Theme Pack manager
│   ├── runs/page.tsx             # Run history
│   ├── runs/[id]/page.tsx        # Run viewer (5 scene cards)
│   └── api/                      # API routes
│       ├── blocks/route.ts       # CRUD BlockDefinition
│       ├── theme-packs/route.ts  # CRUD ThemePack
│       ├── templates/route.ts    # CRUD FlowTemplate
│       ├── runs/route.ts         # POST execute (SSE), GET list
│       └── export/[runId]/route.ts
│
├── packages/
│   └── domain/                   # PURE TypeScript, zero React/Next
│       ├── types.ts              # Domain types + Zod schemas
│       ├── rules.ts              # R1-R15 rule definitions
│       ├── compiler.ts           # Graph → scaffold (deterministic)
│       ├── variety.ts            # Combo assignment + collision detection
│       ├── linter.ts             # Output validation → Violation[]
│       ├── handshake.ts          # Boundary frame extraction & similarity
│       └── exporter.ts           # Batch → markdown format
│
├── lib/
│   ├── anthropic.ts              # Anthropic client, structured output
│   ├── agent.ts                  # Orchestrates compile→generate→lint→repair
│   ├── db.ts                     # Prisma client singleton
│   ├── env.ts                    # Environment validation (Zod)
│   ├── store/
│   │   └── canvas-store.ts       # Zustand store for canvas state
│   └── hooks/
│       └── useTemplate.ts        # Template loading/saving hook
│
├── components/
│   └── canvas/
│       ├── Canvas.tsx            # Main React Flow canvas
│       ├── BlockNode.tsx         # Custom block node
│       ├── LaneNode.tsx          # Lane group node
│       ├── BlockPalette.tsx      # Left sidebar - block library
│       ├── Inspector.tsx         # Right sidebar - selected node details
│       ├── RunButton.tsx         # Run button + modal trigger
│       ├── RunModal.tsx          # Run configuration modal
│       ├── RunProgress.tsx       # SSE progress display
│       ├── CreateBlockButton.tsx # Create new block
│       └── CreateBlockModal.tsx  # Block creation form
│
├── hooks/
│   └── useRunProgress.ts         # SSE progress hook (EventSource)
│
├── prisma/
│   ├── schema.prisma             # Data models
│   └── seed.ts                   # Master of Puppets seed data
│
├── tests/
│   ├── packages/domain/          # Domain unit tests
│   ├── components/canvas/        # Component tests
│   ├── api/                      # API route integration tests
│   ├── lib/                      # Library tests
│   └── __fixtures__/             # Test fixtures
│
└── puppetflow-docs/              # Documentation repo (separate)
```

---

## Data Models (Prisma)

### ThemePack
The creative universe for video generation.
```prisma
model ThemePack {
  id        String   @id @default(cuid())
  name      String   @unique
  canon     Json     # Universe rules, stages, moments, characters
  active    Boolean  @default(false)
  blocks    BlockDefinition[]
  templates FlowTemplate[]
}
```

### BlockDefinition
Building blocks for prompt composition.
```prisma
model BlockDefinition {
  id            String    @id @default(cuid())
  type          BlockType # HOOK, CAMERA_MOVE, PUPPET_DYNAMIC, etc.
  name          String
  promptFragment String   @db.Text
  stageScope    String[]  # Which lanes accept this block
  rotationGroup String?   # Variety axis (camera, hook, gag, etc.)
  meta          Json?
  themePackId   String?
  archived      Boolean   @default(false)
}
```

### FlowTemplate
Saved canvas configurations.
```prisma
model FlowTemplate {
  id          String    @id @default(cuid())
  name        String
  graph       Json      # React Flow nodes + edges
  themePackId String
  runs        Run[]
}
```

### Run
Execution record.
```prisma
model Run {
  id         String    @id @default(cuid())
  templateId String
  runDate    DateTime
  batchSize  Int       @default(5)
  loopMode   Boolean   @default(true)
  status     RunStatus # PENDING|COMPILING|GENERATING|LINTING|REPAIRING|DONE|FAILED
  scaffold   String?   @db.Text
  model      String
  scenes     Scene[]
}
```

### Scene
Generated video scene with prompts.
```prisma
model Scene {
  id             String @id @default(cuid())
  runId          String
  index          Int    # 1..5
  combo          Json   # Assigned variety axes
  lyrics         String @db.Text
  imagePrompt    String @db.Text
  startPrompt    String @db.Text
  middlePrompt   String @db.Text
  endPrompt      String @db.Text
  boundaryFrame1 String @db.Text  # START→MIDDLE
  boundaryFrame2 String @db.Text  # MIDDLE→END
  finalFrame     String @db.Text
  lintReport     Json   # Violation[]
}
```

---

## State Management (Zustand)

### Canvas Store (`lib/store/canvas-store.ts`)

```typescript
interface CanvasState {
  // Graph state
  nodes: Node<BlockNodeData | LaneNodeData>[];
  edges: Edge[];

  // Selection
  selectedId: string | null;

  // Template
  templateId: string | null;
  templateName: string | null;
  themePackId: string | null;
  isDirty: boolean;
  saveState: SaveState; // idle | saving | saved | error

  // Run state
  runStatus: RunStatus; // idle | compiling | generating | linting | repairing | done | failed
  currentRunId: string | null;
  runConfig: RunConfig;

  // Actions
  setNodes, setEdges, onNodesChange, onEdgesChange, onConnect
  addBlock, removeBlock, updateBlockOverride, togglePin
  selectNode, loadTemplate, saveTemplate
  setThemePackId, setRunStatus, setCurrentRunId, setRunConfig
}
```

**Key Pattern:** Use `useShallow` from Zustand for stable selector references:
```typescript
const { hasBlocks, runStatus } = useCanvasStore(
  useShallow((state) => ({
    hasBlocks: state.nodes.filter((n) => n.type === "block").length > 0,
    runStatus: state.runStatus,
  }))
);
```

---

## Agent Pipeline (`lib/agent.ts`)

```
runBatch(templateId, config):
  1. Load + validate graph (Zod)
  2. Compile scaffold (deterministic)
  3. Assign variety combos (pure)
  4. For each phase: emit SSE event
  5. Call Anthropic API (structured output)
  6. Lint output → Violation[]
  7. If hard violations: repair pass (one retry)
  8. Persist Run + Scenes + UsageLog
```

---

## Canvas Architecture

### Lane System
Five vertical lanes representing video stages:
1. **GLOBAL** - Locks, style, loop closure
2. **IMAGE** - Image prompt blocks
3. **VIDEO_START** - First video segment
4. **EXTEND_MIDDLE** - Middle segment
5. **EXTEND_END** - Final segment (drop)

### Block Nodes
- Type-colored headers (HOOK=amber, CAMERA=blue, etc.)
- Validity indicator (green=valid lane, red=invalid)
- Pin toggle (pinned blocks exempt from variety rotation)
- Fragment preview (2 lines)

### Snap Rules
- Block can only be placed in lanes within its `stageScope`
- GLOBAL lane accepts: locks, theme pack ref, style, loop closure
- Drag validation in LaneNode.tsx

---

## SSE Event Flow

```
Client                    Server
  │                         │
  │ POST /api/runs          │
  │ ───────────────────────>│
  │                         │
  │ SSE: phase=compiling    │
  │ <───────────────────────│
  │                         │
  │ SSE: phase=generating   │
  │ <───────────────────────│
  │                         │
  │ SSE: scene (partial)    │
  │ <───────────────────────│
  │         ...             │
  │ SSE: phase=done         │
  │ <───────────────────────│
```

Client uses `EventSource` via `useRunProgress` hook.

---

## Key Architectural Decisions

1. **Pure Domain Layer**: `packages/domain/` has zero React/Next imports. Fully testable without browser/DB.

2. **Single API Call for Batch**: All 5 scenes generated in one Anthropic call (variety rules are cross-scene constraints).

3. **SSE for Progress**: Real-time progress updates without polling.

4. **Deterministic Compilation**: Same graph → identical scaffold. Export and API produce same creative brief.

5. **TDD First**: Every feature has tests before implementation. 90%+ coverage on domain layer.
