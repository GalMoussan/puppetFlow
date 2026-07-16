/**
 * Tests for Domain Types and Zod Schemas
 *
 * Per blueprint Section 6, Phase 1.1:
 * - Graph JSON round-trip test (valid graph survives parse-serialize-parse)
 * - Invalid lane rejection test (unknown lane string fails)
 * - Version gate test (version !== 1 fails)
 * - Schema inference type-checking (compile-time verification)
 */

import { describe, it, expect } from "vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  LaneSchema,
  BlockTypeSchema,
  RunStatusSchema,
  CanvasNodeSchema,
  CanvasEdgeSchema,
  CanvasGraphSchema,
  ViolationSchema,
  SceneSchema,
  BatchOutputSchema,
  ComboAssignmentSchema,
  RunConfigSchema,
  type Lane,
  type BlockType,
  type RunStatus,
  type CanvasNode,
  type CanvasEdge,
  type CanvasGraph,
  type Violation,
  type BatchOutput,
  type ComboAssignment,
  type RunConfig,
} from "@/packages/domain/types";

import { createMinimalGraph, createMinimalScene } from "./helpers";

describe("types", () => {
  describe("LaneSchema", () => {
    it("accepts valid lane values", () => {
      const validLanes: Lane[] = [
        "GLOBAL",
        "IMAGE",
        "VIDEO_START",
        "EXTEND_MIDDLE",
        "EXTEND_END",
      ];

      for (const lane of validLanes) {
        const result = LaneSchema.safeParse(lane);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(lane);
        }
      }
    });

    it("rejects invalid lane values", () => {
      const invalidLanes = [
        "INVALID",
        "global",
        "VIDEO",
        "EXTEND",
        "",
        123,
        null,
        undefined,
      ];

      for (const lane of invalidLanes) {
        const result = LaneSchema.safeParse(lane);
        expect(result.success).toBe(false);
      }
    });

    it("provides descriptive error for unknown lane", () => {
      const result = LaneSchema.safeParse("UNKNOWN_LANE");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Invalid");
      }
    });
  });

  describe("BlockTypeSchema", () => {
    it("accepts all 16 block types from Prisma schema", () => {
      const validTypes: BlockType[] = [
        "THEME_PACK_REF",
        "HOOK",
        "CAMERA_MOVE",
        "PUPPET_DYNAMIC",
        "PUPPET_VISUAL",
        "PHYSICAL_GAG",
        "CHAOS_THREAD",
        "PAYOFF",
        "SONG_SECTION",
        "LANGUAGE",
        "CHARACTER_LOCK",
        "STYLE_LOCK",
        "LOOP_CLOSURE",
        "STAGE_AREA",
        "FESTIVAL_MOMENT",
        "CUSTOM",
      ];

      for (const type of validTypes) {
        const result = BlockTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid block types", () => {
      const invalidTypes = ["INVALID_TYPE", "hook", "Camera", ""];
      for (const type of invalidTypes) {
        const result = BlockTypeSchema.safeParse(type);
        expect(result.success).toBe(false);
      }
    });
  });

  describe("RunStatusSchema", () => {
    it("accepts all run status values", () => {
      const validStatuses: RunStatus[] = [
        "PENDING",
        "COMPILING",
        "GENERATING",
        "LINTING",
        "REPAIRING",
        "DONE",
        "FAILED",
      ];

      for (const status of validStatuses) {
        const result = RunStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("CanvasNodeSchema", () => {
    it("accepts valid node with required fields", () => {
      const validNode: CanvasNode = {
        id: "node-1",
        blockDefId: "block-1",
        lane: "VIDEO_START",
        order: 0,
      };

      const result = CanvasNodeSchema.safeParse(validNode);
      expect(result.success).toBe(true);
    });

    it("accepts node with optional overrides", () => {
      const nodeWithOverrides: CanvasNode = {
        id: "node-1",
        blockDefId: "block-1",
        lane: "IMAGE",
        order: 1,
        overrides: {
          promptFragment: "Custom fragment text",
        },
      };

      const result = CanvasNodeSchema.safeParse(nodeWithOverrides);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overrides?.promptFragment).toBe(
          "Custom fragment text"
        );
      }
    });

    it("accepts node with pinned flag", () => {
      const pinnedNode: CanvasNode = {
        id: "node-1",
        blockDefId: "block-1",
        lane: "GLOBAL",
        order: 0,
        pinned: true,
      };

      const result = CanvasNodeSchema.safeParse(pinnedNode);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pinned).toBe(true);
      }
    });

    it("rejects node with invalid lane", () => {
      const invalidNode = {
        id: "node-1",
        blockDefId: "block-1",
        lane: "INVALID_LANE",
        order: 0,
      };

      const result = CanvasNodeSchema.safeParse(invalidNode);
      expect(result.success).toBe(false);
    });

    it("rejects node with missing required fields", () => {
      const incompleteNode = {
        id: "node-1",
        lane: "VIDEO_START",
      };

      const result = CanvasNodeSchema.safeParse(incompleteNode);
      expect(result.success).toBe(false);
    });
  });

  describe("CanvasEdgeSchema", () => {
    it("accepts valid edge with handshake config", () => {
      const validEdge: CanvasEdge = {
        from: "VIDEO_START",
        to: "EXTEND_MIDDLE",
        handshake: {
          strictness: "verbatim",
          trackCrowdMembers: 2,
        },
      };

      const result = CanvasEdgeSchema.safeParse(validEdge);
      expect(result.success).toBe(true);
    });

    it("accepts paraphrase strictness", () => {
      const edge: CanvasEdge = {
        from: "EXTEND_MIDDLE",
        to: "EXTEND_END",
        handshake: {
          strictness: "paraphrase",
          trackCrowdMembers: 0,
        },
      };

      const result = CanvasEdgeSchema.safeParse(edge);
      expect(result.success).toBe(true);
    });

    it("rejects invalid strictness value", () => {
      const invalidEdge = {
        from: "VIDEO_START",
        to: "EXTEND_MIDDLE",
        handshake: {
          strictness: "fuzzy",
          trackCrowdMembers: 2,
        },
      };

      const result = CanvasEdgeSchema.safeParse(invalidEdge);
      expect(result.success).toBe(false);
    });
  });

  describe("RunConfigSchema", () => {
    it("accepts valid run config", () => {
      const validConfig: RunConfig = {
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        batchSize: 5,
      };

      const result = RunConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it("constrains batchSize to 1-10 range", () => {
      const tooSmall = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 0 };
      const tooLarge = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 11 };

      expect(RunConfigSchema.safeParse(tooSmall).success).toBe(false);
      expect(RunConfigSchema.safeParse(tooLarge).success).toBe(false);
    });

    it("requires non-negative language weights", () => {
      const negativeWeight = {
        loopMode: false,
        languages: { hi: -1, ja: 2 },
        batchSize: 5,
      };

      const result = RunConfigSchema.safeParse(negativeWeight);
      expect(result.success).toBe(false);
    });
  });

  describe("CanvasGraphSchema", () => {
    it("accepts valid graph with version 1", () => {
      const validGraph = createMinimalGraph();

      const result = CanvasGraphSchema.safeParse(validGraph);
      expect(result.success).toBe(true);
    });

    it("rejects graph with version !== 1 (version gate)", () => {
      const invalidVersionGraph = {
        ...createMinimalGraph(),
        version: 2,
      };

      const result = CanvasGraphSchema.safeParse(invalidVersionGraph);
      expect(result.success).toBe(false);
    });

    it("accepts graph with nodes and edges", () => {
      const graphWithContent: CanvasGraph = {
        version: 1,
        lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
        nodes: [
          { id: "n1", blockDefId: "b1", lane: "IMAGE", order: 0 },
          { id: "n2", blockDefId: "b2", lane: "VIDEO_START", order: 0 },
        ],
        edges: [
          {
            from: "VIDEO_START",
            to: "EXTEND_MIDDLE",
            handshake: { strictness: "verbatim", trackCrowdMembers: 2 },
          },
        ],
        runConfig: { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 5 },
      };

      const result = CanvasGraphSchema.safeParse(graphWithContent);
      expect(result.success).toBe(true);
    });

    it("accepts empty nodes and edges arrays (empty canvas)", () => {
      const emptyCanvas = createMinimalGraph();

      const result = CanvasGraphSchema.safeParse(emptyCanvas);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toHaveLength(0);
        expect(result.data.edges).toHaveLength(0);
      }
    });

    it("round-trip: parse -> serialize -> parse produces identical graph", () => {
      const originalGraph: CanvasGraph = {
        version: 1,
        lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
        nodes: [
          { id: "node-1", blockDefId: "block-1", lane: "IMAGE", order: 0 },
          {
            id: "node-2",
            blockDefId: "block-2",
            lane: "VIDEO_START",
            order: 1,
            pinned: true,
          },
        ],
        edges: [
          {
            from: "VIDEO_START",
            to: "EXTEND_MIDDLE",
            handshake: { strictness: "verbatim", trackCrowdMembers: 2 },
          },
        ],
        runConfig: { loopMode: true, languages: { hi: 3, ja: 2 }, batchSize: 5 },
      };

      // First parse
      const firstParse = CanvasGraphSchema.parse(originalGraph);

      // Serialize to JSON and parse back
      const serialized = JSON.stringify(firstParse);
      const reparsedJson = JSON.parse(serialized);

      // Second parse
      const secondParse = CanvasGraphSchema.parse(reparsedJson);

      // Compare
      expect(secondParse).toEqual(firstParse);
    });
  });

  describe("ViolationSchema", () => {
    it("accepts valid hard violation", () => {
      const violation: Violation = {
        rule: "R3",
        severity: "hard",
        sceneIndex: 0,
        stage: "VIDEO_START",
        evidence: "3 generic verbs detected: 'moves', 'goes', 'is' (max 2 allowed)",
      };

      const result = ViolationSchema.safeParse(violation);
      expect(result.success).toBe(true);
    });

    it("accepts valid warn violation", () => {
      const violation: Violation = {
        rule: "R14",
        severity: "warn",
        sceneIndex: 2,
        evidence: "Stage+moment combo used 15 days ago (30-day limit)",
      };

      const result = ViolationSchema.safeParse(violation);
      expect(result.success).toBe(true);
    });

    it("rejects violation with invalid severity", () => {
      const invalidViolation = {
        rule: "R1",
        severity: "error",
        evidence: "test",
      };

      const result = ViolationSchema.safeParse(invalidViolation);
      expect(result.success).toBe(false);
    });

    it("accepts violation without optional fields", () => {
      const minimalViolation = {
        rule: "R2",
        severity: "hard",
        evidence: "No camera verb detected",
      };

      const result = ViolationSchema.safeParse(minimalViolation);
      expect(result.success).toBe(true);
    });
  });

  describe("ComboAssignmentSchema", () => {
    it("accepts valid combo assignment", () => {
      const combo: ComboAssignment = {
        stageArea: "Main Stage",
        festivalMoment: "Sunset Arrival",
        dynamic: "Synchronized dance",
        visual: "Neon glowing strings",
        hook: "String explosion",
        gag: "Strings tangle",
        camera: {
          start: "dolly",
          middle: "pan",
          end: "crane up",
        },
        payoff: "Crowd chant sync",
        chaosThread: "Rogue balloon",
        language: "hi",
        subgenre: "psycore",
      };

      const result = ComboAssignmentSchema.safeParse(combo);
      expect(result.success).toBe(true);
    });

    it("requires all camera positions", () => {
      const missingMiddle = {
        stageArea: "Main Stage",
        festivalMoment: "Sunset",
        dynamic: "test",
        visual: "test",
        hook: "test",
        gag: "test",
        camera: {
          start: "dolly",
          end: "crane up",
        },
        payoff: "test",
        chaosThread: "test",
        language: "hi",
        subgenre: "psycore",
      };

      const result = ComboAssignmentSchema.safeParse(missingMiddle);
      expect(result.success).toBe(false);
    });
  });

  describe("SceneSchema", () => {
    it("accepts valid scene", () => {
      const scene = createMinimalScene(1);

      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(true);
    });

    it("accepts scene with null notes", () => {
      const scene = {
        ...createMinimalScene(1),
        notes: null,
      };

      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(true);
    });

    it("accepts scene with string notes", () => {
      const scene = {
        ...createMinimalScene(1),
        notes: "Producer requested more energy in hook",
      };

      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(true);
    });

    it("rejects scene with invalid index", () => {
      const scene = {
        ...createMinimalScene(1),
        index: -1,
      };

      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(false);
    });
  });

  describe("BatchOutputSchema", () => {
    it("accepts valid batch output with 5 scenes", () => {
      const batch: BatchOutput = {
        scenes: [
          createMinimalScene(1),
          createMinimalScene(2),
          createMinimalScene(3),
          createMinimalScene(4),
          createMinimalScene(5),
        ],
      };

      const result = BatchOutputSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });

    it("accepts batch with different sizes", () => {
      const smallBatch: BatchOutput = {
        scenes: [createMinimalScene(1)],
      };

      const result = BatchOutputSchema.safeParse(smallBatch);
      expect(result.success).toBe(true);
    });

    it("rejects batch with empty scenes array", () => {
      const emptyBatch = {
        scenes: [],
      };

      const result = BatchOutputSchema.safeParse(emptyBatch);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    // These are compile-time checks - if this file compiles, the types are correct
    it("infers Lane type correctly", () => {
      const lane: Lane = "VIDEO_START";
      expect(typeof lane).toBe("string");
    });

    it("infers CanvasGraph type correctly", () => {
      const graph: CanvasGraph = createMinimalGraph();
      expect(graph.version).toBe(1);
      expect(Array.isArray(graph.lanes)).toBe(true);
    });

    it("infers Violation type correctly", () => {
      const violation: Violation = {
        rule: "R1",
        severity: "hard",
        evidence: "test",
      };
      expect(violation.rule).toBe("R1");
    });
  });
});
