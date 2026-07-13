/**
 * Tests for Domain Compiler Module
 *
 * Per blueprint Section 6, Phase 1.3:
 * - Determinism: Same graph produces identical scaffold (snapshot test)
 * - Lane order: Verify blocks assembled in correct order
 * - GLOBAL injection: GLOBAL blocks appear in all stage templates
 * - Pinned blocks: Pinned blocks always present, not parameterized
 * - Overrides: node.overrides.promptFragment wins over library fragment
 * - Loop mode: Closure directives injected when enabled
 * - Character locks: Verbatim locks present exactly once in IMAGE
 */

import { describe, it, expect } from "vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  compile,
  compileStageTemplate,
  injectComboPlaceholders,
  injectLoopDirectives,
  injectCharacterLocks,
  resolveBlockFragment,
  CompilerError,
  type ThemePack,
  type BlockDefinition,
} from "@/packages/domain/compiler";

import {
  type CanvasGraph,
  type CanvasNode,
  type ComboAssignment,
  type RunConfig,
} from "@/packages/domain/types";

import { createMinimalGraph } from "./helpers";

// Sample theme pack for testing
const SAMPLE_THEME_PACK: ThemePack = {
  id: "master-of-puppets",
  name: "Master of Puppets",
  festivalName: "PuppetFest 2024",
  universeRules: [
    "All scenes take place at a psychedelic music festival",
    "Two main puppet characters: Shika (orange) and Shilshul (blue)",
    "Strings are always visible on puppet characters",
    "No references to Metallica songs or imagery",
  ],
  characters: [
    {
      name: "Shika",
      description:
        "Humanoid puppet with orange fur, large expressive eyes, visible string connections at joints",
      lockText:
        "CRITICAL CHARACTER LOCK - SHIKA:\nShika is a humanoid puppet with orange fur, large expressive eyes, and visible string connections at joints. Height approximately 1.5 meters. Always shows marionette control bars above.",
    },
    {
      name: "Shilshul",
      description:
        "Humanoid puppet with blue fur, matching expressive eyes, complementary design to Shika",
      lockText:
        "CRITICAL CHARACTER LOCK - SHILSHUL:\nShilshul is a humanoid puppet with blue fur, matching expressive eyes, complementary design to Shika. Same visible string mechanism and control aesthetic.",
    },
  ],
  stages: [
    "Main Stage",
    "Puppet Pavilion",
    "String Garden",
    "Chaos Corner",
    "Twilight Terrace",
    "Dawn Platform",
  ],
  festivalMoments: [
    "Sunset Arrival",
    "Golden Hour",
    "Twilight Transition",
    "Night Falls",
    "Midnight Peak",
    "Pre-Dawn Calm",
  ],
  subgenres: ["psycore", "hi-tech", "forest", "darkpsy", "full-on"],
  languageChants: {
    hi: "Shika! Shika! Shilshul! Shilshul!",
    ja: "Shika! Shika! Shilshul! Shilshul!",
  },
};

// Sample block definitions for testing
const SAMPLE_BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  "block-character-lock-shika": {
    id: "block-character-lock-shika",
    type: "CHARACTER_LOCK",
    name: "Shika Character Lock",
    promptFragment: SAMPLE_THEME_PACK.characters[0].lockText,
    lane: "IMAGE",
    defaultPinned: true,
  },
  "block-character-lock-shilshul": {
    id: "block-character-lock-shilshul",
    type: "CHARACTER_LOCK",
    name: "Shilshul Character Lock",
    promptFragment: SAMPLE_THEME_PACK.characters[1].lockText,
    lane: "IMAGE",
    defaultPinned: true,
  },
  "block-style-lock": {
    id: "block-style-lock",
    type: "STYLE_LOCK",
    name: "Festival Style",
    promptFragment: "Maintain psychedelic festival aesthetic with UV lighting and vibrant colors.",
    lane: "GLOBAL",
    defaultPinned: true,
  },
  "block-camera-dolly": {
    id: "block-camera-dolly",
    type: "CAMERA_MOVE",
    name: "Dolly",
    promptFragment: "Camera {{camera.start}} smoothly through the scene.",
    lane: "VIDEO_START",
    defaultPinned: false,
  },
  "block-hook-explosion": {
    id: "block-hook-explosion",
    type: "HOOK",
    name: "String Explosion",
    promptFragment: "[HOOK] {{hook}} as Shika bursts onto stage!",
    lane: "VIDEO_START",
    defaultPinned: false,
  },
  "block-loop-closure": {
    id: "block-loop-closure",
    type: "LOOP_CLOSURE",
    name: "Loop Anchor",
    promptFragment: "This frame serves as a loop anchor for seamless video looping.",
    lane: "IMAGE",
    defaultPinned: false,
  },
  "block-stage-area": {
    id: "block-stage-area",
    type: "STAGE_AREA",
    name: "Stage Area",
    promptFragment: "Scene takes place at {{stageArea}}.",
    lane: "GLOBAL",
    defaultPinned: false,
  },
  "block-festival-moment": {
    id: "block-festival-moment",
    type: "FESTIVAL_MOMENT",
    name: "Festival Moment",
    promptFragment: "The moment is {{festivalMoment}}.",
    lane: "GLOBAL",
    defaultPinned: false,
  },
};

// Sample combo assignment for testing
const SAMPLE_COMBO: ComboAssignment = {
  stageArea: "Main Stage",
  festivalMoment: "Sunset Arrival",
  dynamic: "Synchronized dance",
  visual: "Neon glowing strings",
  hook: "String explosion",
  gag: "Strings tangle",
  camera: { start: "dolly", middle: "pan", end: "crane up" },
  payoff: "Crowd chant sync",
  chaosThread: "Rogue balloon",
  language: "hi",
  subgenre: "psycore",
};

// Helper to create a test graph with nodes
function createTestGraph(nodes: CanvasNode[], runConfig?: Partial<RunConfig>): CanvasGraph {
  return {
    version: 1,
    lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
    nodes,
    edges: [],
    runConfig: {
      loopMode: false,
      languages: { hi: 3, ja: 2 },
      batchSize: 5,
      ...runConfig,
    },
  };
}

describe("compiler", () => {
  describe("compile", () => {
    describe("basic functionality", () => {
      it("returns complete scaffold as markdown string", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-character-lock-shika", lane: "IMAGE", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });

      it("is pure and deterministic given same inputs", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-character-lock-shika", lane: "IMAGE", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result1 = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);
        const result2 = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result1).toBe(result2);
      });
    });

    describe("scaffold structure", () => {
      it("includes Theme Pack Canon section", () => {
        const graph = createTestGraph([]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("PuppetFest 2024");
        expect(result).toContain("Shika");
        expect(result).toContain("Shilshul");
      });

      it("includes Rulebook Directives section", () => {
        const graph = createTestGraph([]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Check for rule references
        expect(result).toMatch(/R1|Sequential Weighting/i);
        expect(result).toMatch(/R2|Camera Verb/i);
      });

      it("includes Combo Assignments section", () => {
        const graph = createTestGraph([]);
        const combos = [SAMPLE_COMBO, { ...SAMPLE_COMBO, stageArea: "Puppet Pavilion" }];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("Scene 1");
        expect(result).toContain("Main Stage");
        expect(result).toContain("Scene 2");
        expect(result).toContain("Puppet Pavilion");
      });

      it("includes Per-Stage Templates", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-character-lock-shika", lane: "IMAGE", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("IMAGE");
        expect(result).toContain("VIDEO_START");
        expect(result).toContain("EXTEND_MIDDLE");
        expect(result).toContain("EXTEND_END");
      });

      it("includes Output Schema Instructions", () => {
        const graph = createTestGraph([]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Check for schema instructions
        expect(result).toMatch(/JSON|schema|output format/i);
      });
    });

    describe("lane order enforcement", () => {
      it("assembles blocks in lane order (GLOBAL first)", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-camera-dolly", lane: "VIDEO_START", order: 0 },
          { id: "n2", blockDefId: "block-style-lock", lane: "GLOBAL", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // GLOBAL block content should appear before VIDEO_START block content
        const globalPos = result.indexOf("psychedelic festival aesthetic");
        const videoPos = result.indexOf("Camera");

        expect(globalPos).toBeLessThan(videoPos);
      });

      it("orders blocks within lane by node.order property", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-camera-dolly", lane: "VIDEO_START", order: 1 },
          { id: "n2", blockDefId: "block-hook-explosion", lane: "VIDEO_START", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Hook (order 0) should appear before Camera (order 1)
        const hookPos = result.indexOf("[HOOK]");
        const cameraPos = result.indexOf("Camera");

        expect(hookPos).toBeLessThan(cameraPos);
      });

      it("injects GLOBAL blocks into all stage templates", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-style-lock", lane: "GLOBAL", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // GLOBAL block should appear in each stage section
        const matches = result.match(/psychedelic festival aesthetic/g);
        expect(matches?.length).toBeGreaterThanOrEqual(4); // IMAGE, VIDEO_START, EXTEND_MIDDLE, EXTEND_END
      });
    });

    describe("pinned block handling", () => {
      it("pinned blocks appear in ALL scenes", () => {
        const graph = createTestGraph([
          {
            id: "n1",
            blockDefId: "block-character-lock-shika",
            lane: "IMAGE",
            order: 0,
            pinned: true,
          },
        ]);
        const combos = [
          SAMPLE_COMBO,
          { ...SAMPLE_COMBO, stageArea: "Puppet Pavilion" },
          { ...SAMPLE_COMBO, stageArea: "String Garden" },
        ];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Character lock should appear for each scene
        const matches = result.match(/CRITICAL CHARACTER LOCK - SHIKA/g);
        expect(matches?.length).toBeGreaterThanOrEqual(3);
      });

      it("pinned blocks are not parameterized by combo", () => {
        const graph = createTestGraph([
          {
            id: "n1",
            blockDefId: "block-character-lock-shika",
            lane: "IMAGE",
            order: 0,
            pinned: true,
          },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Should contain verbatim lock text, not parameterized
        expect(result).toContain("orange fur");
        expect(result).toContain("large expressive eyes");
        expect(result).not.toContain("{{");
      });

      it("character locks are typically pinned", () => {
        const graph = createTestGraph([
          {
            id: "n1",
            blockDefId: "block-character-lock-shika",
            lane: "IMAGE",
            order: 0,
            pinned: true,
          },
          {
            id: "n2",
            blockDefId: "block-character-lock-shilshul",
            lane: "IMAGE",
            order: 1,
            pinned: true,
          },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("CRITICAL CHARACTER LOCK - SHIKA");
        expect(result).toContain("CRITICAL CHARACTER LOCK - SHILSHUL");
      });
    });

    describe("override handling", () => {
      it("node.overrides.promptFragment wins over library fragment", () => {
        const graph = createTestGraph([
          {
            id: "n1",
            blockDefId: "block-camera-dolly",
            lane: "VIDEO_START",
            order: 0,
            overrides: {
              promptFragment: "OVERRIDDEN: Custom camera movement here.",
            },
          },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("OVERRIDDEN: Custom camera movement here.");
        expect(result).not.toContain("Camera {{camera.start}} smoothly");
      });

      it("original block fragment preserved when no override", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-camera-dolly", lane: "VIDEO_START", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Should use library fragment (after placeholder substitution)
        expect(result).toContain("Camera");
        expect(result).toContain("dolly");
      });
    });

    describe("loop mode injection", () => {
      it("injects loop anchor directive in IMAGE when loopMode=true", () => {
        const graph = createTestGraph(
          [{ id: "n1", blockDefId: "block-character-lock-shika", lane: "IMAGE", order: 0 }],
          { loopMode: true }
        );
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toMatch(/loop anchor|seamless.*loop/i);
      });

      it("injects mirror directive in END when loopMode=true", () => {
        const graph = createTestGraph([], { loopMode: true });
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toMatch(/mirrors.*opening|opening.*composition/i);
      });

      it("does NOT inject loop directives when loopMode=false", () => {
        const graph = createTestGraph([], { loopMode: false });
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // The literal loop anchor text should not appear
        expect(result).not.toContain("loop anchor for seamless video looping");
      });
    });

    describe("character lock injection", () => {
      it("CRITICAL lock paragraphs appear VERBATIM in IMAGE section", () => {
        const graph = createTestGraph([
          {
            id: "n1",
            blockDefId: "block-character-lock-shika",
            lane: "IMAGE",
            order: 0,
            pinned: true,
          },
          {
            id: "n2",
            blockDefId: "block-character-lock-shilshul",
            lane: "IMAGE",
            order: 1,
            pinned: true,
          },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Check for exact verbatim text
        expect(result).toContain(SAMPLE_THEME_PACK.characters[0].lockText);
        expect(result).toContain(SAMPLE_THEME_PACK.characters[1].lockText);
      });

      it("character locks appear exactly once in IMAGE", () => {
        const graph = createTestGraph([
          {
            id: "n1",
            blockDefId: "block-character-lock-shika",
            lane: "IMAGE",
            order: 0,
            pinned: true,
          },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        // Count occurrences of the lock text
        const matches = result.match(/CRITICAL CHARACTER LOCK - SHIKA/g);
        // Should appear once per scene, not duplicated within a scene
        expect(matches?.length).toBe(1); // One scene, one lock
      });
    });

    describe("combo parameterization", () => {
      it("substitutes {{stageArea}} placeholder", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-stage-area", lane: "GLOBAL", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("Main Stage");
        expect(result).not.toContain("{{stageArea}}");
      });

      it("substitutes {{festivalMoment}} placeholder", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-festival-moment", lane: "GLOBAL", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("Sunset Arrival");
        expect(result).not.toContain("{{festivalMoment}}");
      });

      it("substitutes {{camera.start}} placeholder", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-camera-dolly", lane: "VIDEO_START", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("dolly");
        expect(result).not.toContain("{{camera.start}}");
      });

      it("substitutes different combos for different scenes", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-stage-area", lane: "GLOBAL", order: 0 },
        ]);
        const combos = [
          { ...SAMPLE_COMBO, stageArea: "Main Stage" },
          { ...SAMPLE_COMBO, stageArea: "Puppet Pavilion" },
        ];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("Main Stage");
        expect(result).toContain("Puppet Pavilion");
      });
    });

    describe("handshake directives", () => {
      it("inserts ENDING FRAME [EXACT]: template in video prompts", () => {
        const graph = createTestGraph([]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toContain("ENDING FRAME [EXACT]:");
      });

      it("inserts continuation directive at start of EXTEND prompts", () => {
        const graph = createTestGraph([]);
        const combos = [SAMPLE_COMBO];

        const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

        expect(result).toMatch(/Continue directly from|Continue from previous/i);
      });
    });

    describe("error handling", () => {
      it("throws CompilerError for missing block definition", () => {
        const graph = createTestGraph([
          { id: "n1", blockDefId: "nonexistent-block", lane: "IMAGE", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        expect(() =>
          compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS)
        ).toThrow(CompilerError);
      });

      it("throws CompilerError for unresolved placeholders", () => {
        const badBlockDefs = {
          ...SAMPLE_BLOCK_DEFINITIONS,
          "block-bad-placeholder": {
            id: "block-bad-placeholder",
            type: "CUSTOM" as const,
            name: "Bad Block",
            promptFragment: "This has {{unknownPlaceholder}} that cannot be resolved.",
            lane: "GLOBAL" as const,
            defaultPinned: false,
          },
        };
        const graph = createTestGraph([
          { id: "n1", blockDefId: "block-bad-placeholder", lane: "GLOBAL", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        expect(() =>
          compile(graph, SAMPLE_THEME_PACK, combos, badBlockDefs)
        ).toThrow(CompilerError);
      });

      it("error includes graph node ID for debugging", () => {
        const graph = createTestGraph([
          { id: "problematic-node-id", blockDefId: "nonexistent-block", lane: "IMAGE", order: 0 },
        ]);
        const combos = [SAMPLE_COMBO];

        try {
          compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);
          expect.fail("Should have thrown CompilerError");
        } catch (error) {
          expect(error).toBeInstanceOf(CompilerError);
          const compilerError = error as CompilerError;
          expect(compilerError.nodeId).toBe("problematic-node-id");
        }
      });

      it("throws CompilerError for invalid graph structure", () => {
        const invalidGraph = {
          version: 1,
          lanes: ["GLOBAL"], // Missing required lanes
          nodes: [],
          edges: [],
          runConfig: { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 5 },
        };
        const combos = [SAMPLE_COMBO];

        expect(() =>
          compile(invalidGraph as unknown as CanvasGraph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS)
        ).toThrow(CompilerError);
      });
    });
  });

  describe("compileStageTemplate", () => {
    it("compiles IMAGE stage template", () => {
      const blocks = [
        { fragment: "Scene at festival.", order: 0 },
        { fragment: "Character description here.", order: 1 },
      ];

      const result = compileStageTemplate("IMAGE", blocks, SAMPLE_COMBO);

      expect(result).toContain("Scene at festival.");
      expect(result).toContain("Character description here.");
    });

    it("compiles VIDEO_START stage template with timestamp markers", () => {
      const blocks = [{ fragment: "Action begins.", order: 0 }];

      const result = compileStageTemplate("VIDEO_START", blocks, SAMPLE_COMBO);

      expect(result).toContain("[00:00]");
    });

    it("compiles EXTEND_MIDDLE with continuation", () => {
      const blocks = [{ fragment: "Action continues.", order: 0 }];

      const result = compileStageTemplate("EXTEND_MIDDLE", blocks, SAMPLE_COMBO);

      expect(result).toMatch(/Continue/i);
    });

    it("compiles EXTEND_END with DROP directive", () => {
      const blocks = [{ fragment: "Final action.", order: 0 }];

      const result = compileStageTemplate("EXTEND_END", blocks, SAMPLE_COMBO);

      expect(result).toContain("[DROP]");
    });
  });

  describe("injectComboPlaceholders", () => {
    it("replaces single placeholder", () => {
      const template = "Scene at {{stageArea}}.";

      const result = injectComboPlaceholders(template, SAMPLE_COMBO);

      expect(result).toBe("Scene at Main Stage.");
    });

    it("replaces multiple placeholders", () => {
      const template = "{{stageArea}} during {{festivalMoment}} with {{dynamic}}.";

      const result = injectComboPlaceholders(template, SAMPLE_COMBO);

      expect(result).toBe("Main Stage during Sunset Arrival with Synchronized dance.");
    });

    it("replaces nested camera placeholders", () => {
      const template = "Camera moves: {{camera.start}}, {{camera.middle}}, {{camera.end}}.";

      const result = injectComboPlaceholders(template, SAMPLE_COMBO);

      expect(result).toBe("Camera moves: dolly, pan, crane up.");
    });

    it("leaves text without placeholders unchanged", () => {
      const template = "No placeholders here.";

      const result = injectComboPlaceholders(template, SAMPLE_COMBO);

      expect(result).toBe("No placeholders here.");
    });

    it("throws on unresolved placeholder", () => {
      const template = "Unknown: {{unknownField}}.";

      expect(() => injectComboPlaceholders(template, SAMPLE_COMBO)).toThrow();
    });
  });

  describe("injectLoopDirectives", () => {
    it("injects loop anchor when loopMode=true and stage=IMAGE", () => {
      const template = "Scene description.";

      const result = injectLoopDirectives(template, "IMAGE", true);

      expect(result).toMatch(/loop anchor|seamless.*loop/i);
    });

    it("injects mirror directive when loopMode=true and stage=EXTEND_END", () => {
      const template = "Final scene.";

      const result = injectLoopDirectives(template, "EXTEND_END", true);

      expect(result).toMatch(/mirrors|opening/i);
    });

    it("does not modify template when loopMode=false", () => {
      const template = "Scene description.";

      const result = injectLoopDirectives(template, "IMAGE", false);

      expect(result).not.toMatch(/loop anchor/);
    });

    it("does not modify VIDEO_START template", () => {
      const template = "Video start content.";

      const result = injectLoopDirectives(template, "VIDEO_START", true);

      expect(result).not.toMatch(/loop anchor|mirrors/);
    });
  });

  describe("injectCharacterLocks", () => {
    it("injects both character locks", () => {
      const template = "Scene setup.";

      const result = injectCharacterLocks(template, SAMPLE_THEME_PACK.characters);

      expect(result).toContain("CRITICAL CHARACTER LOCK - SHIKA");
      expect(result).toContain("CRITICAL CHARACTER LOCK - SHILSHUL");
    });

    it("preserves original template content", () => {
      const template = "Original scene description.";

      const result = injectCharacterLocks(template, SAMPLE_THEME_PACK.characters);

      expect(result).toContain("Original scene description.");
    });

    it("places locks after scene description", () => {
      const template = "Scene description first.";

      const result = injectCharacterLocks(template, SAMPLE_THEME_PACK.characters);

      const scenePos = result.indexOf("Scene description first.");
      const lockPos = result.indexOf("CRITICAL CHARACTER LOCK");

      expect(scenePos).toBeLessThan(lockPos);
    });
  });

  describe("resolveBlockFragment", () => {
    it("returns override fragment when present", () => {
      const node: CanvasNode = {
        id: "n1",
        blockDefId: "block-camera-dolly",
        lane: "VIDEO_START",
        order: 0,
        overrides: { promptFragment: "Custom override text." },
      };

      const result = resolveBlockFragment(node, SAMPLE_BLOCK_DEFINITIONS);

      expect(result).toBe("Custom override text.");
    });

    it("returns library fragment when no override", () => {
      const node: CanvasNode = {
        id: "n1",
        blockDefId: "block-camera-dolly",
        lane: "VIDEO_START",
        order: 0,
      };

      const result = resolveBlockFragment(node, SAMPLE_BLOCK_DEFINITIONS);

      expect(result).toBe("Camera {{camera.start}} smoothly through the scene.");
    });

    it("throws for missing block definition", () => {
      const node: CanvasNode = {
        id: "n1",
        blockDefId: "nonexistent",
        lane: "VIDEO_START",
        order: 0,
      };

      expect(() => resolveBlockFragment(node, SAMPLE_BLOCK_DEFINITIONS)).toThrow();
    });
  });

  describe("CompilerError", () => {
    it("has type property", () => {
      const error = new CompilerError("missing_block", "n1", "Block not found");

      expect(error.type).toBe("missing_block");
    });

    it("has nodeId property", () => {
      const error = new CompilerError("missing_block", "node-123", "Block not found");

      expect(error.nodeId).toBe("node-123");
    });

    it("has descriptive message", () => {
      const error = new CompilerError("unresolved_placeholder", "n1", "Cannot resolve {{unknown}}");

      expect(error.message).toContain("Cannot resolve");
    });
  });

  describe("snapshot testing", () => {
    // These tests ensure compiler output remains stable
    it("same graph always produces identical scaffold", () => {
      const graph = createTestGraph([
        { id: "n1", blockDefId: "block-character-lock-shika", lane: "IMAGE", order: 0, pinned: true },
        { id: "n2", blockDefId: "block-style-lock", lane: "GLOBAL", order: 0, pinned: true },
        { id: "n3", blockDefId: "block-camera-dolly", lane: "VIDEO_START", order: 0 },
      ]);
      const combos = [SAMPLE_COMBO, { ...SAMPLE_COMBO, stageArea: "Puppet Pavilion" }];

      const result1 = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);
      const result2 = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

      expect(result1).toBe(result2);
    });

    it("uses consistent line endings (LF)", () => {
      const graph = createTestGraph([]);
      const combos = [SAMPLE_COMBO];

      const result = compile(graph, SAMPLE_THEME_PACK, combos, SAMPLE_BLOCK_DEFINITIONS);

      expect(result).not.toContain("\r\n");
      expect(result).toContain("\n");
    });
  });
});
