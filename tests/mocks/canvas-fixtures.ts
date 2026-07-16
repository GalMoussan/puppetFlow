/**
 * Canvas Test Fixtures
 *
 * Mock objects and factory functions for Phase 3 canvas component tests.
 * Used by all canvas-related test files.
 */

import { vi } from "vitest";
import type { Lane, CanvasGraph, BlockType } from "@/packages/domain/types";

// =============================================================================
// BlockDefinition Interface (matches expected structure for canvas)
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
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// React Flow Node/Edge Types for Canvas
// =============================================================================

export interface BlockNodeData extends Record<string, unknown> {
  blockDefId: string;
  name: string;
  type: BlockType;
  fragment: string;
  stageScope: Lane[];
  pinned: boolean;
  valid: boolean;
  override?: string;
  order: number;
}

export interface LaneNodeData extends Record<string, unknown> {
  lane: Lane;
}

export interface ReactFlowNode<T = unknown> {
  id: string;
  type: string;
  parentId?: string;
  position: { x: number; y: number };
  data: T;
  selected?: boolean;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    handshake?: {
      strictness: "verbatim" | "paraphrase";
      trackCrowdMembers: number;
    };
  };
}

// =============================================================================
// Lane Configuration (per canvas-technical.md)
// =============================================================================

export const LANE_CONFIG = {
  GLOBAL: { x: 0, width: 200 },
  IMAGE: { x: 220, width: 200 },
  VIDEO_START: { x: 440, width: 200 },
  EXTEND_MIDDLE: { x: 660, width: 200 },
  EXTEND_END: { x: 880, width: 200 },
} as const;

export const LANE_ORDER: readonly Lane[] = [
  "GLOBAL",
  "IMAGE",
  "VIDEO_START",
  "EXTEND_MIDDLE",
  "EXTEND_END",
] as const;

// =============================================================================
// Mock Block Definitions
// =============================================================================

export const mockCameraBlock: BlockDefinition = {
  id: "block-camera-whip",
  type: "CAMERA_MOVE",
  name: "Whip Pan",
  promptFragment:
    "Camera whips horizontally from left to right, motion blur emphasizing speed and urgency",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  rotationGroup: "camera",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockCameraDolly: BlockDefinition = {
  id: "block-camera-dolly",
  type: "CAMERA_MOVE",
  name: "Dolly In",
  promptFragment:
    "Camera dollies forward smoothly, closing distance on the subject with deliberate pace",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  rotationGroup: "camera",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockCameraDutch: BlockDefinition = {
  id: "block-camera-dutch",
  type: "CAMERA_MOVE",
  name: "Dutch Tilt",
  promptFragment: "Camera tilts at 15-degree angle, creating visual unease and dynamic tension",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
  rotationGroup: "camera",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockHookBlock: BlockDefinition = {
  id: "block-hook-explosion",
  type: "HOOK",
  name: "String Explosion",
  promptFragment:
    "Opening hook: puppet strings burst from unexpected locations, startling the crowd",
  stageScope: ["GLOBAL", "VIDEO_START"],
  rotationGroup: "hook",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockGlobalBlock: BlockDefinition = {
  id: "block-global-style",
  type: "STYLE_LOCK",
  name: "Neon Aesthetic",
  promptFragment: "Neon color palette throughout: electric blue, hot pink, lime green accents",
  stageScope: ["GLOBAL"],
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockImageOnlyBlock: BlockDefinition = {
  id: "block-image-only",
  type: "PUPPET_VISUAL",
  name: "Puppet Portrait",
  promptFragment: "Close-up puppet portrait with dramatic lighting",
  stageScope: ["IMAGE"],
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockAllStagesBlock: BlockDefinition = {
  id: "block-all-stages",
  type: "PUPPET_DYNAMIC",
  name: "Crowd Interaction",
  promptFragment: "Puppets interact with crowd members, reaching out from stage",
  stageScope: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockPhysicalGagBlock: BlockDefinition = {
  id: "block-gag-tangle",
  type: "PHYSICAL_GAG",
  name: "String Tangle",
  promptFragment: "Puppet strings comically tangle, puppet struggles to free itself",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  rotationGroup: "gag",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockPayoffBlock: BlockDefinition = {
  id: "block-payoff-chant",
  type: "PAYOFF",
  name: "Crowd Chant Sync",
  promptFragment: "Crowd chants in sync with puppet movements, reaching crescendo",
  stageScope: ["EXTEND_END"],
  rotationGroup: "payoff",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockNarrativeBlock: BlockDefinition = {
  id: "block-chaos-balloon",
  type: "CHAOS_THREAD",
  name: "Rogue Balloon",
  promptFragment: "A rogue balloon drifts across the frame, puppets track it with suspicion",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  rotationGroup: "chaos",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockLongNameBlock: BlockDefinition = {
  id: "block-long-name",
  type: "CAMERA_MOVE",
  name: "Very Long Camera Move Name That Exceeds Container Width",
  promptFragment: "Line 1\nLine 2\nLine 3\nLine 4\nLine 5",
  stageScope: ["VIDEO_START"],
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

// Collection of all mock blocks
export const mockBlocks: BlockDefinition[] = [
  mockCameraBlock,
  mockCameraDolly,
  mockCameraDutch,
  mockHookBlock,
  mockGlobalBlock,
  mockImageOnlyBlock,
  mockAllStagesBlock,
  mockPhysicalGagBlock,
  mockPayoffBlock,
  mockNarrativeBlock,
  mockLongNameBlock,
];

// =============================================================================
// Block Groups (for palette tests)
// =============================================================================

export const BLOCK_GROUPS: Record<string, readonly BlockType[]> = {
  "Theme & Style": ["THEME_PACK_REF", "STYLE_LOCK", "CHARACTER_LOCK"],
  "Scene Elements": ["PUPPET_VISUAL", "STAGE_AREA", "FESTIVAL_MOMENT"],
  Actions: ["CAMERA_MOVE", "PUPPET_DYNAMIC", "PHYSICAL_GAG"],
  Narrative: ["HOOK", "CHAOS_THREAD", "PAYOFF"],
  Configuration: ["SONG_SECTION", "LANGUAGE", "LOOP_CLOSURE", "CUSTOM"],
};

export function getBlockGroup(type: BlockType): string | null {
  for (const [group, types] of Object.entries(BLOCK_GROUPS)) {
    if (types.includes(type)) {
      return group;
    }
  }
  return null;
}

// =============================================================================
// Mock Canvas Graph
// =============================================================================

export const mockEmptyGraph: CanvasGraph = {
  version: 1,
  lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  nodes: [],
  edges: [],
  runConfig: {
    loopMode: true,
    languages: { hi: 3, ja: 2 },
    batchSize: 5,
  },
};

export const mockGraphWithNodes: CanvasGraph = {
  version: 1,
  lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  nodes: [
    {
      id: "node-1",
      blockDefId: "block-camera-whip",
      lane: "VIDEO_START",
      order: 0,
      pinned: false,
    },
    {
      id: "node-2",
      blockDefId: "block-gag-tangle",
      lane: "EXTEND_MIDDLE",
      order: 0,
      pinned: true,
    },
    {
      id: "node-3",
      blockDefId: "block-payoff-chant",
      lane: "EXTEND_END",
      order: 0,
      pinned: false,
    },
  ],
  edges: [
    {
      from: "IMAGE",
      to: "VIDEO_START",
      handshake: { strictness: "verbatim", trackCrowdMembers: 2 },
    },
    {
      from: "VIDEO_START",
      to: "EXTEND_MIDDLE",
      handshake: { strictness: "verbatim", trackCrowdMembers: 2 },
    },
  ],
  runConfig: {
    loopMode: true,
    languages: { hi: 3, ja: 2 },
    batchSize: 5,
  },
};

export const mockGraphWithOverride: CanvasGraph = {
  version: 1,
  lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  nodes: [
    {
      id: "node-override",
      blockDefId: "block-camera-whip",
      lane: "VIDEO_START",
      order: 0,
      pinned: false,
      overrides: {
        promptFragment: "Custom override text for this specific template",
      },
    },
  ],
  edges: [],
  runConfig: {
    loopMode: false,
    languages: { hi: 2, ja: 3 },
    batchSize: 5,
  },
};

export const mockGraphWithMultipleInLane: CanvasGraph = {
  version: 1,
  lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  nodes: [
    {
      id: "node-a",
      blockDefId: "block-camera-whip",
      lane: "VIDEO_START",
      order: 0,
    },
    {
      id: "node-b",
      blockDefId: "block-camera-dolly",
      lane: "VIDEO_START",
      order: 1,
    },
    {
      id: "node-c",
      blockDefId: "block-camera-dutch",
      lane: "VIDEO_START",
      order: 2,
    },
  ],
  edges: [],
  runConfig: {
    loopMode: true,
    languages: { hi: 3, ja: 2 },
    batchSize: 5,
  },
};

// =============================================================================
// Mock Canvas Store
// =============================================================================

export type SaveState = "idle" | "saving" | "saved" | "error";
export type RunStatus = "idle" | "compiling" | "generating" | "linting" | "repairing" | "done" | "failed";

export interface MockCanvasStore {
  // State
  nodes: ReactFlowNode<BlockNodeData | LaneNodeData>[];
  edges: ReactFlowEdge[];
  selectedId: string | null;
  templateId: string | null;
  templateName: string;
  themePackId: string | null;
  isDirty: boolean;
  saveState: SaveState;
  runConfig: {
    loopMode: boolean;
    languages: { hi: number; ja: number };
    batchSize: number;
  };

  // Actions - using explicit function signatures with vi.Mock
  setNodes: ReturnType<typeof vi.fn<(nodes: ReactFlowNode<BlockNodeData | LaneNodeData>[]) => void>>;
  setEdges: ReturnType<typeof vi.fn<(edges: ReactFlowEdge[]) => void>>;
  onNodesChange: ReturnType<typeof vi.fn<(changes: unknown[]) => void>>;
  onEdgesChange: ReturnType<typeof vi.fn<(changes: unknown[]) => void>>;
  onConnect: ReturnType<typeof vi.fn<(connection: unknown) => void>>;
  addBlock: ReturnType<typeof vi.fn<(blockDef: unknown, lane: Lane, order: number) => void>>;
  removeBlock: ReturnType<typeof vi.fn<(nodeId: string) => void>>;
  updateBlockOverride: ReturnType<typeof vi.fn<(nodeId: string, fragment: string | undefined) => void>>;
  togglePin: ReturnType<typeof vi.fn<(nodeId: string) => void>>;
  selectNode: ReturnType<typeof vi.fn<(nodeId: string | null) => void>>;
  loadTemplate: ReturnType<typeof vi.fn<(templateId: string) => Promise<void>>>;
  saveTemplate: ReturnType<typeof vi.fn<() => Promise<void>>>;
  setThemePackId: ReturnType<typeof vi.fn<(themePackId: string | null) => void>>;
  setRunConfig: ReturnType<typeof vi.fn<(config: Partial<MockCanvasStore["runConfig"]>) => void>>;
}

export function createMockCanvasStore(overrides?: Partial<MockCanvasStore>): MockCanvasStore {
  return {
    nodes: [],
    edges: [],
    selectedId: null,
    templateId: null,
    templateName: "Untitled",
    themePackId: null,
    isDirty: false,
    saveState: "idle",
    runConfig: {
      loopMode: true,
      languages: { hi: 3, ja: 2 },
      batchSize: 5,
    },
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    addBlock: vi.fn(),
    removeBlock: vi.fn(),
    updateBlockOverride: vi.fn(),
    togglePin: vi.fn(),
    selectNode: vi.fn(),
    loadTemplate: vi.fn(),
    saveTemplate: vi.fn().mockResolvedValue(undefined),
    setThemePackId: vi.fn(),
    setRunConfig: vi.fn(),
    ...overrides,
  };
}

// =============================================================================
// Factory Functions for React Flow Nodes
// =============================================================================

export function createLaneNode(lane: Lane): ReactFlowNode<LaneNodeData> {
  return {
    id: lane,
    type: "lane",
    position: { x: LANE_CONFIG[lane].x, y: 0 },
    data: { lane },
  };
}

export function createBlockNode(
  id: string,
  blockDef: BlockDefinition,
  lane: Lane,
  order: number,
  options?: Partial<{
    pinned: boolean;
    override: string;
    valid: boolean;
    selected: boolean;
  }>
): ReactFlowNode<BlockNodeData> {
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
    selected: options?.selected,
  };
}

export function createLaneNodes(): ReactFlowNode<LaneNodeData>[] {
  return LANE_ORDER.map(createLaneNode);
}

// =============================================================================
// Mock Template
// =============================================================================

export const mockTemplate = {
  id: "tpl-001",
  name: "Festival Template v1",
  graph: mockGraphWithNodes,
  themePackId: "pack-1",
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

export const mockThemePack = {
  id: "pack-1",
  name: "Master of Puppets",
  active: true,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

// =============================================================================
// Block Type Colors (for testing visual states)
// =============================================================================

export const TYPE_COLORS: Record<BlockType, string> = {
  THEME_PACK_REF: "bg-purple-600",
  HOOK: "bg-amber-600",
  CAMERA_MOVE: "bg-blue-600",
  PUPPET_DYNAMIC: "bg-green-600",
  PUPPET_VISUAL: "bg-teal-600",
  PHYSICAL_GAG: "bg-orange-600",
  CHAOS_THREAD: "bg-red-600",
  PAYOFF: "bg-pink-600",
  SONG_SECTION: "bg-violet-600",
  LANGUAGE: "bg-cyan-600",
  CHARACTER_LOCK: "bg-indigo-600",
  STYLE_LOCK: "bg-rose-600",
  LOOP_CLOSURE: "bg-yellow-600",
  STAGE_AREA: "bg-lime-600",
  FESTIVAL_MOMENT: "bg-emerald-600",
  CUSTOM: "bg-slate-600",
};

export function getTypeColor(type: BlockType): string {
  return TYPE_COLORS[type] || "bg-slate-600";
}

// =============================================================================
// Validation Error Types
// =============================================================================

export interface ValidationError {
  nodeId: string;
  type: "INVALID_LANE" | "MISSING_DEFINITION";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// Mock Block Definition Map (for validation tests)
// =============================================================================

export function createBlockDefMap(blocks: BlockDefinition[]): Map<string, BlockDefinition> {
  return new Map(blocks.map((b) => [b.id, b]));
}

export const mockBlockDefMap = createBlockDefMap(mockBlocks);
