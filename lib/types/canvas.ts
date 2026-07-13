/**
 * Canvas-specific types for React Flow integration
 *
 * These types bridge the domain types with React Flow's node/edge system.
 * @module lib/types/canvas
 */

import type { Node, Edge, NodeProps } from "@xyflow/react";
import type { Lane, BlockType } from "@/packages/domain/types";

// =============================================================================
// Block Node Data
// =============================================================================

/**
 * Data structure for block nodes on the canvas
 * Includes index signature for React Flow compatibility
 */
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

/**
 * Props type for BlockNode component
 */
export type BlockNodeProps = NodeProps<Node<BlockNodeData>>;

// =============================================================================
// Lane Node Data
// =============================================================================

/**
 * Data structure for lane group nodes
 * Includes index signature for React Flow compatibility
 */
export interface LaneNodeData extends Record<string, unknown> {
  lane: Lane;
}

/**
 * Props type for LaneNode component
 */
export type LaneNodeProps = NodeProps<Node<LaneNodeData>>;

// =============================================================================
// React Flow Node/Edge Types
// =============================================================================

/**
 * Union type for all canvas node types
 */
export type CanvasNodeData = BlockNodeData | LaneNodeData;

/**
 * Typed canvas node
 */
export type CanvasNode = Node<BlockNodeData> | Node<LaneNodeData>;

/**
 * Handshake edge data for lane-to-lane transitions
 * Includes index signature for React Flow compatibility
 */
export interface HandshakeEdgeData extends Record<string, unknown> {
  handshake: {
    strictness: "verbatim" | "paraphrase";
    trackCrowdMembers: number;
  };
}

/**
 * Canvas edge with optional handshake data
 */
export type CanvasEdge = Edge<HandshakeEdgeData> | Edge;

// =============================================================================
// Lane Configuration
// =============================================================================

/**
 * Lane positioning configuration
 */
export const LANE_CONFIG = {
  GLOBAL: { x: 0, width: 200 },
  IMAGE: { x: 220, width: 200 },
  VIDEO_START: { x: 440, width: 200 },
  EXTEND_MIDDLE: { x: 660, width: 200 },
  EXTEND_END: { x: 880, width: 200 },
} as const;

/**
 * Fixed lane order
 */
export const LANE_ORDER: readonly Lane[] = [
  "GLOBAL",
  "IMAGE",
  "VIDEO_START",
  "EXTEND_MIDDLE",
  "EXTEND_END",
] as const;

// =============================================================================
// Block Type Colors
// =============================================================================

/**
 * Mapping of block types to Tailwind background color classes
 */
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

/**
 * Get the Tailwind background color class for a block type
 */
export function getTypeColor(type: BlockType): string {
  return TYPE_COLORS[type] || "bg-slate-600";
}

// =============================================================================
// Block Groups (for palette organization)
// =============================================================================

/**
 * Block type groupings for the palette
 */
export const BLOCK_GROUPS: Record<string, readonly BlockType[]> = {
  "Theme & Style": ["THEME_PACK_REF", "STYLE_LOCK", "CHARACTER_LOCK"],
  "Scene Elements": ["PUPPET_VISUAL", "STAGE_AREA", "FESTIVAL_MOMENT"],
  Actions: ["CAMERA_MOVE", "PUPPET_DYNAMIC", "PHYSICAL_GAG"],
  Narrative: ["HOOK", "CHAOS_THREAD", "PAYOFF"],
  Configuration: ["SONG_SECTION", "LANGUAGE", "LOOP_CLOSURE", "CUSTOM"],
} as const;

/**
 * Get the group name for a block type
 */
export function getBlockGroup(type: BlockType): string | null {
  for (const [group, types] of Object.entries(BLOCK_GROUPS)) {
    if (types.includes(type)) {
      return group;
    }
  }
  return null;
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation error types
 */
export interface ValidationError {
  nodeId: string;
  type: "INVALID_LANE" | "MISSING_DEFINITION";
  message: string;
}

/**
 * Result of validating the canvas graph
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// Save State
// =============================================================================

/**
 * State of template save operation
 */
export type SaveState = "idle" | "saving" | "saved" | "error";

// =============================================================================
// Run Status
// =============================================================================

/**
 * State of a run operation
 */
export type RunStatus = "idle" | "compiling" | "generating" | "linting" | "repairing" | "done" | "failed";
