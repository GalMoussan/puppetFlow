# PuppetFlow Coding Conventions

## TDD Workflow (MANDATORY)

```
RED → GREEN → REFACTOR

1. Write test first (must fail)
2. Run test to confirm it fails
3. Write minimal code to pass
4. Run test to confirm it passes
5. Refactor if needed
6. Verify coverage (≥90% for domain)
```

**Never write production code without a failing test first.**

---

## TypeScript Standards

### Strict Mode
TypeScript strict mode is enabled. All code must:
- Have explicit types for function parameters and return values
- Handle `null` and `undefined` explicitly
- Use `as const` for literal types

### Immutability
```typescript
// CORRECT: Create new objects
const newNode = { ...node, data: { ...node.data, pinned: true } };

// WRONG: Mutate existing
node.data.pinned = true;
```

### Type Definitions
- Domain types: `packages/domain/types.ts`
- Canvas types: `lib/types/canvas.ts`
- API types: Co-located with routes

---

## Zustand Store Patterns

### Use `useShallow` for Object Selectors
```typescript
// CORRECT: Stable reference, no unnecessary re-renders
const { nodes, edges } = useCanvasStore(
  useShallow((state) => ({
    nodes: state.nodes,
    edges: state.edges,
  }))
);

// WRONG: New object every render
const { nodes, edges } = useCanvasStore((state) => ({
  nodes: state.nodes,
  edges: state.edges,
}));
```

### Single Value Selectors Don't Need useShallow
```typescript
// OK: Primitive value, stable reference
const selectedId = useCanvasStore((state) => state.selectedId);
```

---

## React Patterns

### Client Components
Mark client components explicitly:
```typescript
"use client";
```

### Props Interface
Define props interfaces above the component:
```typescript
interface BlockNodeProps {
  id: string;
  data: BlockNodeData;
  selected: boolean;
}

export function BlockNode({ id, data, selected }: BlockNodeProps) {
  // ...
}
```

### Null Handling for Optional Props
```typescript
// CORRECT: Provide fallback
<Component value={maybeNull || ""} />

// WRONG: Pass potentially null
<Component value={maybeNull} />  // if prop is required string
```

---

## File Organization

### Directory Structure
```
components/
  canvas/           # Canvas-related components
    index.ts        # Barrel exports
    Canvas.tsx
    BlockNode.tsx
    ...
  run/              # Run-related components
    RunViewer.tsx
    ...

lib/
  store/            # Zustand stores
  hooks/            # Custom hooks
  types/            # Type definitions
```

### Barrel Exports
Every component directory has an `index.ts`:
```typescript
export { Canvas } from "./Canvas";
export { BlockNode } from "./BlockNode";
// ... all public exports
```

### Import Paths
Use path aliases:
```typescript
// CORRECT
import { BlockNodeData } from "@/lib/types/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";

// WRONG
import { BlockNodeData } from "../../../lib/types/canvas";
```

---

## Naming Conventions

### Files
- Components: `PascalCase.tsx` (e.g., `BlockNode.tsx`)
- Hooks: `camelCase.ts` (e.g., `useTemplate.ts`)
- Types: `kebab-case.ts` (e.g., `canvas-types.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

### Variables
- React components: `PascalCase`
- Functions/hooks: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Zustand Actions
Verb prefix: `set*`, `add*`, `remove*`, `update*`, `toggle*`
```typescript
setNodes, addBlock, removeBlock, updateBlockOverride, togglePin
```

---

## DO NOT Rules

### DO NOT mutate state
```typescript
// NEVER
state.nodes.push(newNode);
node.data.pinned = true;

// ALWAYS
set((state) => ({ nodes: [...state.nodes, newNode] }));
```

### DO NOT use `any`
```typescript
// NEVER
const data: any = response.json();

// ALWAYS
const data: ApiResponse = await response.json();
```

### DO NOT skip null checks
```typescript
// NEVER
const name = template.name;  // template might be null

// ALWAYS
const name = template?.name || "Untitled";
```

### DO NOT hardcode IDs in production code
```typescript
// NEVER (except seed data)
const themePackId = "cmrj77h7400005qltc7rcmos1";

// ALWAYS
const themePackId = useCanvasStore((s) => s.themePackId);
```

### DO NOT mix domain and UI concerns
```typescript
// packages/domain/ should NEVER import:
import React from "react";
import { useRouter } from "next/navigation";
import { prisma } from "@/lib/db";

// Domain is PURE TypeScript only
```

### DO NOT write tests after implementation
TDD means test FIRST. If you wrote code without a test, stop and write the test.

### DO NOT commit with failing tests
All 974 core tests must pass. The 14 agent.test.ts failures are known and pre-existing.

### DO NOT use deprecated APIs
```typescript
// WRONG: Old Zustand shallow
import shallow from "zustand/shallow";

// CORRECT: Zustand v5
import { useShallow } from "zustand/shallow";
```

---

## Error Handling

### API Routes
```typescript
try {
  // operation
} catch (error) {
  console.error("Context:", error);
  return NextResponse.json(
    { error: "User-friendly message" },
    { status: 500 }
  );
}
```

### Client Components
- Use try/catch for async operations
- Set error state for user feedback
- Consider toast notifications for transient errors

---

## Testing Conventions

### Test File Location
Mirror the source structure:
```
packages/domain/compiler.ts → tests/packages/domain/compiler.test.ts
components/canvas/BlockNode.tsx → tests/components/canvas/BlockNode.test.tsx
```

### Test Structure
```typescript
describe("ModuleName", () => {
  describe("functionName", () => {
    it("should do X when Y", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Mock Patterns
```typescript
// Mock Zustand store
vi.mock("@/lib/store/canvas-store", () => ({
  useCanvasStore: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));
```
