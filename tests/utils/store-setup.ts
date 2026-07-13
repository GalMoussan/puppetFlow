/**
 * Test Utilities for Zustand Store Testing
 *
 * Per Phase 3 lessons: Use real Zustand store with setState() reset
 * instead of vi.mock() pattern which causes test isolation issues.
 *
 * @module tests/utils/store-setup
 */

import { beforeEach, afterEach } from "vitest";
import { useCanvasStore, type CanvasState } from "@/lib/store/canvas-store";
import type { Node, Edge } from "@xyflow/react";
import type { BlockNodeData, LaneNodeData, SaveState } from "@/lib/types/canvas";
import type { Lane, BlockType } from "@/packages/domain/types";

// =============================================================================
// Initial State for Reset
// =============================================================================

/**
 * Default initial state for canvas store reset
 */
export const initialCanvasState: Pick<
  CanvasState,
  | "nodes"
  | "edges"
  | "selectedId"
  | "templateId"
  | "templateName"
  | "isDirty"
  | "saveState"
  | "runConfig"
> = {
  nodes: [],
  edges: [],
  selectedId: null,
  templateId: null,
  templateName: null,
  isDirty: false,
  saveState: "idle",
  runConfig: {
    loopMode: true,
    languages: { hi: 3, ja: 2 },
    batchSize: 5,
  },
};

// =============================================================================
// Store Reset Function
// =============================================================================

/**
 * Reset the canvas store to a clean initial state
 * Call this in beforeEach for test isolation
 */
export function resetCanvasStore(
  overrides?: Partial<typeof initialCanvasState>
): void {
  useCanvasStore.setState({
    ...initialCanvasState,
    ...overrides,
  });
}

/**
 * Setup function to be called in beforeEach
 * Resets store and optionally sets initial state
 */
export function setupCanvasStore(
  initialState?: Partial<typeof initialCanvasState>
): void {
  resetCanvasStore(initialState);
}

/**
 * Get current store state (for assertions)
 */
export function getCanvasState(): CanvasState {
  return useCanvasStore.getState();
}

// =============================================================================
// Test Data Factory Functions
// =============================================================================

export interface BlockDefinition {
  id: string;
  type: BlockType;
  name: string;
  promptFragment: string;
  stageScope: Lane[];
  rotationGroup?: string;
  themePackId: string;
  archived: boolean;
}

/**
 * Create a block node for testing
 */
export function createTestBlockNode(
  id: string,
  blockDef: BlockDefinition,
  lane: Lane,
  order: number,
  options?: {
    pinned?: boolean;
    override?: string;
    valid?: boolean;
    selected?: boolean;
  }
): Node<BlockNodeData> {
  const valid = options?.valid ?? blockDef.stageScope.includes(lane);

  return {
    id,
    type: "block",
    parentId: lane,
    position: { x: 10, y: order * 100 + 50 },
    data: {
      blockDefId: blockDef.id,
      name: blockDef.name,
      type: blockDef.type,
      fragment: blockDef.promptFragment,
      stageScope: blockDef.stageScope,
      pinned: options?.pinned ?? false,
      valid,
      override: options?.override,
      order,
    },
    draggable: true,
    selectable: true,
    selected: options?.selected,
  };
}

/**
 * Create a lane node for testing
 */
export function createTestLaneNode(lane: Lane): Node<LaneNodeData> {
  const LANE_CONFIG: Record<Lane, { x: number; width: number }> = {
    GLOBAL: { x: 0, width: 200 },
    IMAGE: { x: 220, width: 200 },
    VIDEO_START: { x: 440, width: 200 },
    EXTEND_MIDDLE: { x: 660, width: 200 },
    EXTEND_END: { x: 880, width: 200 },
  };

  return {
    id: lane,
    type: "lane",
    position: { x: LANE_CONFIG[lane].x, y: 0 },
    data: { lane },
    draggable: false,
    selectable: true,
  };
}

/**
 * Create all lane nodes for testing
 */
export function createAllLaneNodes(): Node<LaneNodeData>[] {
  const lanes: Lane[] = [
    "GLOBAL",
    "IMAGE",
    "VIDEO_START",
    "EXTEND_MIDDLE",
    "EXTEND_END",
  ];
  return lanes.map(createTestLaneNode);
}

// =============================================================================
// Mock Block Definitions (commonly used in tests)
// =============================================================================

export const testBlocks = {
  cameraWhip: {
    id: "block-camera-whip",
    type: "CAMERA_MOVE" as BlockType,
    name: "Whip Pan",
    promptFragment:
      "Camera whips horizontally from left to right, motion blur emphasizing speed and urgency",
    stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"] as Lane[],
    rotationGroup: "camera",
    themePackId: "pack-1",
    archived: false,
  },
  hook: {
    id: "block-hook-explosion",
    type: "HOOK" as BlockType,
    name: "String Explosion",
    promptFragment:
      "Opening hook: puppet strings burst from unexpected locations, startling the crowd",
    stageScope: ["GLOBAL", "VIDEO_START"] as Lane[],
    rotationGroup: "hook",
    themePackId: "pack-1",
    archived: false,
  },
  globalStyle: {
    id: "block-global-style",
    type: "STYLE_LOCK" as BlockType,
    name: "Neon Aesthetic",
    promptFragment: "Neon color palette throughout: electric blue, hot pink, lime green accents",
    stageScope: ["GLOBAL"] as Lane[],
    themePackId: "pack-1",
    archived: false,
  },
  imageOnly: {
    id: "block-image-only",
    type: "PUPPET_VISUAL" as BlockType,
    name: "Puppet Portrait",
    promptFragment: "Close-up puppet portrait with dramatic lighting",
    stageScope: ["IMAGE"] as Lane[],
    themePackId: "pack-1",
    archived: false,
  },
  allStages: {
    id: "block-all-stages",
    type: "PUPPET_DYNAMIC" as BlockType,
    name: "Crowd Interaction",
    promptFragment: "Puppets interact with crowd members, reaching out from stage",
    stageScope: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"] as Lane[],
    themePackId: "pack-1",
    archived: false,
  },
} satisfies Record<string, BlockDefinition>;

// =============================================================================
// Vitest Hook for Automatic Reset
// =============================================================================

/**
 * Call this at the top of a describe block to auto-reset store
 * between tests. Handles beforeEach and afterEach automatically.
 *
 * @example
 * describe("MyComponent", () => {
 *   useAutoResetCanvasStore();
 *
 *   it("test case", () => {
 *     // Store is reset to initial state
 *   });
 * });
 */
export function useAutoResetCanvasStore(
  initialState?: Partial<typeof initialCanvasState>
): void {
  beforeEach(() => {
    resetCanvasStore(initialState);
  });

  afterEach(() => {
    resetCanvasStore();
  });
}
