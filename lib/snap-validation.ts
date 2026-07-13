/**
 * Snap Validation Utilities
 *
 * Client-side validation for block placement on the canvas.
 * Validates that blocks are placed in lanes matching their stageScope.
 *
 * @module lib/snap-validation
 */

import type { Lane } from "@/packages/domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Block definition with fields needed for validation
 */
interface BlockForValidation {
  id: string;
  name: string;
  stageScope: Lane[];
}

/**
 * Result of validating a single block placement
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Error for a single node in the graph
 */
export interface ValidationError {
  nodeId: string;
  type: "INVALID_LANE" | "MISSING_DEFINITION";
  message: string;
  blockId?: string;
  targetLane?: Lane;
}

/**
 * Result of validating an entire canvas graph
 */
export interface GraphValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Drag validation state for visual feedback
 */
export type DragValidationState = "valid" | "invalid";

// =============================================================================
// Core Validation Functions
// =============================================================================

/**
 * Validates if a block can be placed in a target lane.
 *
 * @param blockDef - The block definition to validate
 * @param targetLane - The lane to place the block in
 * @returns Validation result with valid flag and optional reason
 */
export function validateBlockPlacement(
  blockDef: BlockForValidation,
  targetLane: Lane
): ValidationResult {
  if (!blockDef.stageScope.includes(targetLane)) {
    const allowedLanes = blockDef.stageScope.join(", ");
    return {
      valid: false,
      reason: `${blockDef.name} cannot be placed in ${targetLane}. Allowed lanes: ${allowedLanes}`,
    };
  }

  return { valid: true };
}

/**
 * Checks if a lane is valid for a given stageScope.
 *
 * @param stageScope - Array of valid lanes
 * @param lane - The lane to check
 * @returns true if lane is in stageScope
 */
export function isValidLane(stageScope: Lane[], lane: Lane): boolean {
  return stageScope.includes(lane);
}

/**
 * Gets a validation error object for an invalid placement, or null if valid.
 *
 * @param blockDef - The block definition to validate
 * @param targetLane - The lane to place the block in
 * @returns ValidationError or null
 */
export function getValidationError(
  blockDef: BlockForValidation,
  targetLane: Lane
): Omit<ValidationError, "nodeId"> | null {
  if (blockDef.stageScope.includes(targetLane)) {
    return null;
  }

  return {
    type: "INVALID_LANE",
    message: `${blockDef.name} cannot be placed in ${targetLane}`,
    blockId: blockDef.id,
    targetLane,
  };
}

// =============================================================================
// Graph Validation
// =============================================================================

/**
 * Canvas graph node for validation
 */
interface GraphNode {
  id: string;
  blockDefId: string;
  lane: Lane;
}

/**
 * Canvas graph for validation
 */
interface CanvasGraphForValidation {
  version: number;
  lanes: string[];
  nodes: GraphNode[];
  edges: unknown[];
  runConfig: unknown;
}

/**
 * Validates an entire canvas graph against a block library.
 *
 * @param graph - The canvas graph to validate
 * @param blockLibrary - Map of block ID to block definition
 * @returns GraphValidationResult with all errors
 */
export function validateCanvasGraph(
  graph: CanvasGraphForValidation,
  blockLibrary: Map<string, BlockForValidation>
): GraphValidationResult {
  const errors: ValidationError[] = [];

  for (const node of graph.nodes) {
    const blockDef = blockLibrary.get(node.blockDefId);

    // Check for missing block definition
    if (!blockDef) {
      errors.push({
        nodeId: node.id,
        type: "MISSING_DEFINITION",
        message: `Block definition not found: ${node.blockDefId}`,
      });
      continue;
    }

    // Check for invalid lane placement
    if (!blockDef.stageScope.includes(node.lane)) {
      errors.push({
        nodeId: node.id,
        type: "INVALID_LANE",
        message: `Block "${blockDef.name}" is not valid in lane ${node.lane}. Allowed: ${blockDef.stageScope.join(", ")}`,
        blockId: blockDef.id,
        targetLane: node.lane,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Drag and Drop Helpers
// =============================================================================

/**
 * Gets the validation state for visual feedback during drag.
 *
 * @param stageScope - Array of valid lanes for the dragged block
 * @param targetLane - The lane being hovered over
 * @returns 'valid' or 'invalid' for styling
 */
export function getDragValidationState(
  stageScope: Lane[],
  targetLane: Lane
): DragValidationState {
  return stageScope.includes(targetLane) ? "valid" : "invalid";
}

/**
 * Gets a user-friendly error message for an invalid drop.
 *
 * @param blockDef - The block that was dropped
 * @param targetLane - The lane it was dropped on
 * @returns Formatted error message for toast/notification
 */
export function getDropErrorMessage(
  blockDef: BlockForValidation,
  targetLane: Lane
): string {
  const allowedLanes = blockDef.stageScope.join(", ");
  return `Cannot place "${blockDef.name}" in ${targetLane}. Allowed: ${allowedLanes}`;
}

// =============================================================================
// Node Validity Computation
// =============================================================================

/**
 * Node with lane and stageScope for validity check
 */
interface NodeForValidity {
  id: string;
  blockDefId: string;
  lane: Lane;
  stageScope: Lane[];
}

/**
 * Computes whether a node is in a valid lane based on its stageScope.
 * Used to update validity state after moves or when loading legacy data.
 *
 * @param node - Node with lane and stageScope
 * @returns true if node is in a valid lane
 */
export function computeNodeValidity(node: NodeForValidity): boolean {
  return node.stageScope.includes(node.lane);
}
