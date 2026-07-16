/**
 * Tests for Snap Validation
 *
 * Per Phase 3 test specification section 5:
 * - Valid drop feedback (S01-S04)
 * - Invalid drop feedback (S05-S08)
 * - Validity dot updates (S09-S10)
 * - Server revalidation (S11-S13)
 * - Validation rule logic (S14-S16)
 *
 * Coverage target: >= 90% line / 85% branch coverage
 */

import { describe, it, expect } from "vitest";

// These imports will fail until implementation exists - expected for TDD
import {
  validateBlockPlacement,
  validateCanvasGraph,
  isValidLane,
  getValidationError,
} from "@/lib/snap-validation";

import { Lane } from "@puppetflow/domain";

// =============================================================================
// Mock Data
// =============================================================================

const mockCameraBlock = {
  id: "block-camera-whip",
  type: "CAMERA_MOVE",
  name: "Whip Pan",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"] as Lane[],
};

const mockGlobalBlock = {
  id: "block-global-style",
  type: "STYLE_MODIFIER",
  name: "Neon Style",
  stageScope: ["GLOBAL"] as Lane[],
};

const mockAllStagesBlock = {
  id: "block-all-stages",
  type: "HOOK",
  name: "Transition Hook",
  stageScope: [
    "GLOBAL",
    "IMAGE",
    "VIDEO_START",
    "EXTEND_MIDDLE",
    "EXTEND_END",
  ] as Lane[],
};

const mockImageBlock = {
  id: "block-image-only",
  type: "IMAGE_MODIFIER",
  name: "Image Filter",
  stageScope: ["IMAGE"] as Lane[],
};

// =============================================================================
// Test Suite
// =============================================================================

describe("Snap Validation", () => {
  // ===========================================================================
  // Section 5.5: Validation Rule Logic (Pure Functions)
  // ===========================================================================

  describe("validateBlockPlacement", () => {
    // S14: Valid placement returns true
    it("returns valid for matching lane", () => {
      const result = validateBlockPlacement(mockCameraBlock, "VIDEO_START");

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns valid when block has multiple valid lanes and placed in any", () => {
      const lanes: Lane[] = ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"];

      lanes.forEach((lane) => {
        const result = validateBlockPlacement(mockCameraBlock, lane);
        expect(result.valid).toBe(true);
      });
    });

    // S15: Invalid placement returns reason
    it("returns invalid with reason for non-matching lane", () => {
      const result = validateBlockPlacement(mockCameraBlock, "IMAGE");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cannot be placed in IMAGE");
      expect(result.reason).toContain("VIDEO_START");
    });

    it("includes block name in error message", () => {
      const result = validateBlockPlacement(mockCameraBlock, "GLOBAL");

      expect(result.reason).toContain(mockCameraBlock.name);
    });

    it("lists all allowed lanes in error message", () => {
      const result = validateBlockPlacement(mockCameraBlock, "IMAGE");

      mockCameraBlock.stageScope.forEach((lane) => {
        expect(result.reason).toContain(lane);
      });
    });

    // S04: GLOBAL-only block valid in GLOBAL
    it("returns valid for GLOBAL-only block in GLOBAL lane", () => {
      const result = validateBlockPlacement(mockGlobalBlock, "GLOBAL");

      expect(result.valid).toBe(true);
    });

    // S08: GLOBAL-only block rejected in IMAGE
    it("returns invalid for GLOBAL-only block in non-GLOBAL lane", () => {
      const result = validateBlockPlacement(mockGlobalBlock, "IMAGE");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("GLOBAL");
    });

    // S03: Block with ALL_STAGES scope valid anywhere
    it("returns valid for all-stages block in any lane", () => {
      const allLanes: Lane[] = [
        "GLOBAL",
        "IMAGE",
        "VIDEO_START",
        "EXTEND_MIDDLE",
        "EXTEND_END",
      ];

      allLanes.forEach((lane) => {
        const result = validateBlockPlacement(mockAllStagesBlock, lane);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("isValidLane", () => {
    it("returns true for valid lane", () => {
      expect(isValidLane(mockCameraBlock.stageScope, "VIDEO_START")).toBe(true);
    });

    it("returns false for invalid lane", () => {
      expect(isValidLane(mockCameraBlock.stageScope, "IMAGE")).toBe(false);
    });

    it("returns true when stageScope includes all lanes", () => {
      expect(isValidLane(mockAllStagesBlock.stageScope, "IMAGE")).toBe(true);
    });
  });

  describe("getValidationError", () => {
    it("returns null for valid placement", () => {
      const error = getValidationError(mockCameraBlock, "VIDEO_START");
      expect(error).toBeNull();
    });

    it("returns error object for invalid placement", () => {
      const error = getValidationError(mockCameraBlock, "IMAGE");

      expect(error).not.toBeNull();
      expect(error?.type).toBe("INVALID_LANE");
      expect(error?.blockId).toBe(mockCameraBlock.id);
      expect(error?.targetLane).toBe("IMAGE");
    });
  });

  // ===========================================================================
  // Section 5.5: Graph Validation (S16)
  // ===========================================================================

  describe("validateCanvasGraph", () => {
    const createMockGraph = (
      nodes: Array<{
        id: string;
        blockDefId: string;
        lane: Lane;
      }>
    ) => ({
      version: 1,
      lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      nodes,
      edges: [],
      runConfig: null,
    });

    const blockLibrary = new Map([
      [mockCameraBlock.id, mockCameraBlock],
      [mockGlobalBlock.id, mockGlobalBlock],
      [mockAllStagesBlock.id, mockAllStagesBlock],
      [mockImageBlock.id, mockImageBlock],
    ]);

    // S16: validateCanvasGraph catches all errors
    it("returns valid for graph with all valid placements", () => {
      const graph = createMockGraph([
        { id: "node-1", blockDefId: mockCameraBlock.id, lane: "VIDEO_START" },
        { id: "node-2", blockDefId: mockGlobalBlock.id, lane: "GLOBAL" },
      ]);

      const result = validateCanvasGraph(graph, blockLibrary);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns all errors for graph with multiple invalid placements", () => {
      const graph = createMockGraph([
        { id: "node-1", blockDefId: mockCameraBlock.id, lane: "IMAGE" }, // Invalid
        { id: "node-2", blockDefId: mockGlobalBlock.id, lane: "VIDEO_START" }, // Invalid
        { id: "node-3", blockDefId: mockAllStagesBlock.id, lane: "GLOBAL" }, // Valid
      ]);

      const result = validateCanvasGraph(graph, blockLibrary);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map((e) => e.nodeId)).toContain("node-1");
      expect(result.errors.map((e) => e.nodeId)).toContain("node-2");
    });

    // S13: Server returns missing definition error
    it("returns error for missing block definition", () => {
      const graph = createMockGraph([
        { id: "node-1", blockDefId: "nonexistent-block", lane: "VIDEO_START" },
      ]);

      const result = validateCanvasGraph(graph, blockLibrary);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("MISSING_DEFINITION");
      expect(result.errors[0].nodeId).toBe("node-1");
    });

    it("returns mixed errors for invalid lanes and missing definitions", () => {
      const graph = createMockGraph([
        { id: "node-1", blockDefId: mockCameraBlock.id, lane: "IMAGE" }, // Invalid lane
        { id: "node-2", blockDefId: "nonexistent-block", lane: "GLOBAL" }, // Missing def
      ]);

      const result = validateCanvasGraph(graph, blockLibrary);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);

      const invalidLaneError = result.errors.find((e) => e.nodeId === "node-1");
      expect(invalidLaneError?.type).toBe("INVALID_LANE");

      const missingDefError = result.errors.find((e) => e.nodeId === "node-2");
      expect(missingDefError?.type).toBe("MISSING_DEFINITION");
    });

    it("returns valid for empty graph", () => {
      const graph = createMockGraph([]);

      const result = validateCanvasGraph(graph, blockLibrary);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("includes helpful message in each error", () => {
      const graph = createMockGraph([
        { id: "node-1", blockDefId: mockCameraBlock.id, lane: "IMAGE" },
      ]);

      const result = validateCanvasGraph(graph, blockLibrary);

      expect(result.errors[0].message).toBeDefined();
      expect(result.errors[0].message.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Section 5.1-5.2: Drag and Drop Validation Helpers
  // ===========================================================================

  describe("Drag and Drop Validation Helpers", () => {
    // S01 & S05: Validation during drag
    describe("getDragValidationState", () => {
      // This import will fail until implementation exists
      // import { getDragValidationState } from "@/lib/snap-validation";

      it("returns 'valid' for allowed lane during drag", async () => {
        // Dynamic import pattern for TDD
        const { getDragValidationState } = await import("@/lib/snap-validation");

        const state = getDragValidationState(
          mockCameraBlock.stageScope,
          "VIDEO_START"
        );
        expect(state).toBe("valid");
      });

      it("returns 'invalid' for disallowed lane during drag", async () => {
        const { getDragValidationState } = await import("@/lib/snap-validation");

        const state = getDragValidationState(
          mockCameraBlock.stageScope,
          "IMAGE"
        );
        expect(state).toBe("invalid");
      });
    });

    // S07: Toast error message generation
    describe("getDropErrorMessage", () => {
      it("returns formatted error message for invalid drop", async () => {
        const { getDropErrorMessage } = await import("@/lib/snap-validation");

        const message = getDropErrorMessage(mockCameraBlock, "IMAGE");

        expect(message).toContain("Cannot place");
        expect(message).toContain(mockCameraBlock.name);
        expect(message).toContain("IMAGE");
        expect(message).toContain("Allowed:");
      });

      it("lists all allowed lanes in message", async () => {
        const { getDropErrorMessage } = await import("@/lib/snap-validation");

        const message = getDropErrorMessage(mockCameraBlock, "GLOBAL");

        mockCameraBlock.stageScope.forEach((lane) => {
          expect(message).toContain(lane);
        });
      });
    });
  });

  // ===========================================================================
  // Section 5.3: Validity Computation
  // ===========================================================================

  describe("Validity Computation", () => {
    // S09 & S10: Compute validity for node
    describe("computeNodeValidity", () => {
      it("returns true when node is in valid lane", async () => {
        const { computeNodeValidity } = await import("@/lib/snap-validation");

        const node = {
          id: "node-1",
          blockDefId: mockCameraBlock.id,
          lane: "VIDEO_START" as Lane,
          stageScope: mockCameraBlock.stageScope,
        };

        expect(computeNodeValidity(node)).toBe(true);
      });

      it("returns false when node is in invalid lane (legacy data)", async () => {
        const { computeNodeValidity } = await import("@/lib/snap-validation");

        const node = {
          id: "node-1",
          blockDefId: mockCameraBlock.id,
          lane: "IMAGE" as Lane,
          stageScope: mockCameraBlock.stageScope,
        };

        expect(computeNodeValidity(node)).toBe(false);
      });

      it("uses stageScope from block definition", async () => {
        const { computeNodeValidity } = await import("@/lib/snap-validation");

        const globalNode = {
          id: "node-1",
          blockDefId: mockGlobalBlock.id,
          lane: "GLOBAL" as Lane,
          stageScope: mockGlobalBlock.stageScope,
        };

        expect(computeNodeValidity(globalNode)).toBe(true);

        const invalidNode = {
          ...globalNode,
          lane: "VIDEO_START" as Lane,
        };

        expect(computeNodeValidity(invalidNode)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("Edge Cases", () => {
    it("handles empty stageScope gracefully", () => {
      const emptyBlock = {
        ...mockCameraBlock,
        stageScope: [] as Lane[],
      };

      const result = validateBlockPlacement(emptyBlock, "VIDEO_START");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cannot be placed");
    });

    it("handles unknown lane type", () => {
      const result = validateBlockPlacement(
        mockCameraBlock,
        "UNKNOWN_LANE" as Lane
      );

      expect(result.valid).toBe(false);
    });

    it("is case-sensitive for lane names", () => {
      const result = validateBlockPlacement(
        mockCameraBlock,
        "video_start" as Lane
      );

      expect(result.valid).toBe(false);
    });
  });
});
