/**
 * Tests for Domain Variety Engine
 *
 * Per blueprint Section 6, Phase 1.4:
 * - Property-based test: 200 random pools, verify zero within-batch collisions
 * - Both languages present per configured weights
 * - History collision detection from UsageLog fixtures
 * - Pool exhaustion throws VarietyError
 * - Pinned blocks bypass rotation, appear in all scenes
 */

import { describe, it, expect } from "vitest";
import { fc, test as fcTest } from "@fast-check/vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  assign,
  checkHistoryCollision,
  validatePools,
  hasWithinBatchCollision,
  VarietyError,
  type VarietyPool,
  type VarietyAxis,
  type HistoryEntry,
  type VarietyConfig,
} from "@/packages/domain/variety";

import { type ComboAssignment } from "@/packages/domain/types";

// Constants for test data - matching blueprint Section 7 seed data
const STAGE_AREAS = [
  "Main Stage",
  "Puppet Pavilion",
  "String Garden",
  "Chaos Corner",
  "Twilight Terrace",
  "Dawn Platform",
  "Midnight Arena",
  "Sunrise Grove",
  "Echo Chamber",
  "Prism Plaza",
  "Neon Nest",
  "Bass Drop Basin",
];

const FESTIVAL_MOMENTS = [
  "Sunset Arrival",
  "Golden Hour",
  "Twilight Transition",
  "Night Falls",
  "Midnight Peak",
  "Pre-Dawn Calm",
  "First Light",
  "Morning Glory",
  "Noon Zenith",
  "Afternoon Drift",
  "Dusk Descent",
  "Witching Hour",
  "Blue Hour",
];

const PUPPET_DYNAMICS = [
  "Shilshul puppets Shika",
  "Shika leads Shilshul",
  "Synchronized dance",
  "Call and response",
  "Mirror movements",
];

const PUPPET_VISUALS = [
  "Neon glowing strings",
  "UV reactive fur",
  "Holographic shimmer",
  "Smoke trail aura",
  "Prismatic reflections",
];

const HOOK_TYPES = [
  "String explosion",
  "Puppet reveal",
  "Crowd surge",
  "Light burst",
  "Beat drop entrance",
  "Slow-mo snap",
];

const CAMERA_MOVES = [
  "dolly",
  "push-in",
  "orbit",
  "circular dolly",
  "pan",
  "whip pan",
  "handheld tracking",
  "crane up",
  "crane down",
  "tilt-up",
  "tilt-down",
  "macro push-in",
  "dolly zoom",
  "crash-zoom",
  "snap-zoom",
  "static wide",
  "tracking shot",
];

const PHYSICAL_GAGS = [
  "Strings tangle",
  "Puppet stumble",
  "Confetti explosion",
  "Hat flip",
  "Crowd surf attempt",
  "Stage dive fake-out",
  "Guitar smash (puppet)",
  "Mic drop",
];

const PAYOFF_TYPES = [
  "Crowd chant sync",
  "Light show climax",
  "Puppet embrace",
  "String harmony",
  "Festival logo reveal",
  "Fireworks burst",
];

const CHAOS_THREADS = [
  "Rogue balloon",
  "Escaped glow stick",
  "Wandering mascot",
  "Broken string repair",
  "Crowd surfer",
  "Drone flyby",
  "Confetti cannon misfire",
  "Lightning strike (fake)",
];

const SUBGENRES = ["psycore", "hi-tech", "forest", "darkpsy", "full-on"];

const ROTATION_AXES: VarietyAxis[] = [
  "hook",
  "camera_start",
  "camera_middle",
  "camera_end",
  "dynamic",
  "visual",
  "gag",
  "payoff",
  "chaosThread",
  "stageArea",
  "festivalMoment",
];

// Helper to create a valid variety pool with sufficient elements
function createValidPool(): VarietyPool {
  return {
    hook: HOOK_TYPES.slice(0, 6),
    camera_start: CAMERA_MOVES.slice(0, 6),
    camera_middle: CAMERA_MOVES.slice(0, 6),
    camera_end: CAMERA_MOVES.slice(0, 6),
    dynamic: PUPPET_DYNAMICS.slice(0, 5),
    visual: PUPPET_VISUALS.slice(0, 5),
    gag: PHYSICAL_GAGS.slice(0, 6),
    payoff: PAYOFF_TYPES.slice(0, 6),
    chaosThread: CHAOS_THREADS.slice(0, 6),
    stageArea: STAGE_AREAS.slice(0, 6),
    festivalMoment: FESTIVAL_MOMENTS.slice(0, 6),
    language: ["hi", "ja"],
    subgenre: SUBGENRES.slice(0, 5),
  };
}

// Helper to create insufficient pool (for error testing)
function createInsufficientPool(axis: VarietyAxis): VarietyPool {
  const pool = createValidPool();
  // Make the specified axis have fewer elements than batch size
  pool[axis] = pool[axis]?.slice(0, 3) ?? [];
  return pool;
}

// Helper to create a combo assignment for testing
function createTestCombo(index: number): ComboAssignment {
  return {
    stageArea: STAGE_AREAS[index],
    festivalMoment: FESTIVAL_MOMENTS[index],
    dynamic: PUPPET_DYNAMICS[index % PUPPET_DYNAMICS.length],
    visual: PUPPET_VISUALS[index % PUPPET_VISUALS.length],
    hook: HOOK_TYPES[index % HOOK_TYPES.length],
    gag: PHYSICAL_GAGS[index % PHYSICAL_GAGS.length],
    camera: {
      start: CAMERA_MOVES[index],
      middle: CAMERA_MOVES[index + 1],
      end: CAMERA_MOVES[index + 2],
    },
    payoff: PAYOFF_TYPES[index % PAYOFF_TYPES.length],
    chaosThread: CHAOS_THREADS[index % CHAOS_THREADS.length],
    language: index % 2 === 0 ? "hi" : "ja",
    subgenre: SUBGENRES[index % SUBGENRES.length],
  };
}

// Helper to create history entries
function createHistoryEntry(daysAgo: number, combo: Partial<ComboAssignment>): HistoryEntry {
  return {
    runDate: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
    stageArea: combo.stageArea ?? "Main Stage",
    festivalMoment: combo.festivalMoment ?? "Sunset Arrival",
    dynamic: combo.dynamic ?? "Synchronized dance",
    payoff: combo.payoff ?? "Crowd chant sync",
    hook: combo.hook ?? "String explosion",
    camera: combo.camera?.start ?? "dolly",
    gag: combo.gag ?? "Strings tangle",
    chaosThread: combo.chaosThread ?? "Rogue balloon",
    language: combo.language ?? "hi",
  };
}

// Arbitrary generators for property-based testing
function arbitraryPoolWithMinSize(minSize: number): fc.Arbitrary<string[]> {
  return fc
    .array(fc.string({ minLength: 3, maxLength: 30 }), {
      minLength: minSize,
      maxLength: 20,
    })
    .map((arr) => [...new Set(arr)]); // Deduplicate
}

function arbitraryPoolConfig(): fc.Arbitrary<VarietyPool> {
  return fc.record({
    hook: arbitraryPoolWithMinSize(5),
    camera_start: arbitraryPoolWithMinSize(5),
    camera_middle: arbitraryPoolWithMinSize(5),
    camera_end: arbitraryPoolWithMinSize(5),
    dynamic: arbitraryPoolWithMinSize(5),
    visual: arbitraryPoolWithMinSize(5),
    gag: arbitraryPoolWithMinSize(5),
    payoff: arbitraryPoolWithMinSize(5),
    chaosThread: arbitraryPoolWithMinSize(5),
    stageArea: arbitraryPoolWithMinSize(5),
    festivalMoment: arbitraryPoolWithMinSize(5),
    language: fc.constant(["hi", "ja"]),
    subgenre: arbitraryPoolWithMinSize(1),
  });
}

function arbitraryNewCombo(): fc.Arbitrary<ComboAssignment> {
  return fc.record({
    stageArea: fc.constantFrom(...STAGE_AREAS),
    festivalMoment: fc.constantFrom(...FESTIVAL_MOMENTS),
    dynamic: fc.constantFrom(...PUPPET_DYNAMICS),
    visual: fc.constantFrom(...PUPPET_VISUALS),
    hook: fc.constantFrom(...HOOK_TYPES),
    gag: fc.constantFrom(...PHYSICAL_GAGS),
    camera: fc.record({
      start: fc.constantFrom(...CAMERA_MOVES),
      middle: fc.constantFrom(...CAMERA_MOVES),
      end: fc.constantFrom(...CAMERA_MOVES),
    }),
    payoff: fc.constantFrom(...PAYOFF_TYPES),
    chaosThread: fc.constantFrom(...CHAOS_THREADS),
    language: fc.constantFrom("hi" as const, "ja" as const),
    subgenre: fc.constantFrom(...SUBGENRES),
  });
}

function arbitraryUsageLog(count: number): fc.Arbitrary<HistoryEntry[]> {
  return fc.array(
    fc.record({
      runDate: fc
        .date({
          min: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          max: new Date(),
        })
        .map((d) => d.getTime()),
      stageArea: fc.constantFrom(...STAGE_AREAS),
      festivalMoment: fc.constantFrom(...FESTIVAL_MOMENTS),
      dynamic: fc.constantFrom(...PUPPET_DYNAMICS),
      payoff: fc.constantFrom(...PAYOFF_TYPES),
      hook: fc.constantFrom(...HOOK_TYPES),
      camera: fc.constantFrom(...CAMERA_MOVES),
      gag: fc.constantFrom(...PHYSICAL_GAGS),
      chaosThread: fc.constantFrom(...CHAOS_THREADS),
      language: fc.constantFrom("hi" as const, "ja" as const),
    }),
    { minLength: count, maxLength: count }
  );
}

describe("variety", () => {
  describe("assign", () => {
    describe("basic functionality", () => {
      it("returns exactly batchSize combo assignments", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
        };

        const result = assign(pools, history, config);

        expect(result).toHaveLength(5);
      });

      it("returns batchSize of 3 when configured", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 3,
          languages: { hi: 2, ja: 1 },
        };

        const result = assign(pools, history, config);

        expect(result).toHaveLength(3);
      });

      it("each assignment contains all variety axes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
        };

        const result = assign(pools, history, config);

        for (const combo of result) {
          expect(combo).toHaveProperty("stageArea");
          expect(combo).toHaveProperty("festivalMoment");
          expect(combo).toHaveProperty("dynamic");
          expect(combo).toHaveProperty("visual");
          expect(combo).toHaveProperty("hook");
          expect(combo).toHaveProperty("gag");
          expect(combo).toHaveProperty("camera");
          expect(combo.camera).toHaveProperty("start");
          expect(combo.camera).toHaveProperty("middle");
          expect(combo.camera).toHaveProperty("end");
          expect(combo).toHaveProperty("payoff");
          expect(combo).toHaveProperty("chaosThread");
          expect(combo).toHaveProperty("language");
          expect(combo).toHaveProperty("subgenre");
        }
      });

      it("is pure and deterministic given same inputs", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
          seed: 42, // Fixed seed for reproducibility
        };

        const result1 = assign(pools, history, config);
        const result2 = assign(pools, history, config);

        expect(result1).toEqual(result2);
      });
    });

    describe("within-batch collision prevention", () => {
      it("no repeated hook type across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const hooks = result.map((c) => c.hook);
        const uniqueHooks = new Set(hooks);

        expect(uniqueHooks.size).toBe(5);
      });

      it("no repeated camera_start across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const cameraStarts = result.map((c) => c.camera.start);
        const uniqueCameras = new Set(cameraStarts);

        expect(uniqueCameras.size).toBe(5);
      });

      it("no repeated camera_middle across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const cameraMiddles = result.map((c) => c.camera.middle);
        const uniqueCameras = new Set(cameraMiddles);

        expect(uniqueCameras.size).toBe(5);
      });

      it("no repeated camera_end across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const cameraEnds = result.map((c) => c.camera.end);
        const uniqueCameras = new Set(cameraEnds);

        expect(uniqueCameras.size).toBe(5);
      });

      it("no repeated physical gag across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const gags = result.map((c) => c.gag);
        const uniqueGags = new Set(gags);

        expect(uniqueGags.size).toBe(5);
      });

      it("no repeated puppet dynamic across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const dynamics = result.map((c) => c.dynamic);
        const uniqueDynamics = new Set(dynamics);

        expect(uniqueDynamics.size).toBe(5);
      });

      it("no repeated puppet visual across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const visuals = result.map((c) => c.visual);
        const uniqueVisuals = new Set(visuals);

        expect(uniqueVisuals.size).toBe(5);
      });

      it("no repeated payoff type across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const payoffs = result.map((c) => c.payoff);
        const uniquePayoffs = new Set(payoffs);

        expect(uniquePayoffs.size).toBe(5);
      });

      it("no repeated chaos thread across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const chaosThreads = result.map((c) => c.chaosThread);
        const uniqueChaos = new Set(chaosThreads);

        expect(uniqueChaos.size).toBe(5);
      });

      it("no repeated stage/area across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const stageAreas = result.map((c) => c.stageArea);
        const uniqueStages = new Set(stageAreas);

        expect(uniqueStages.size).toBe(5);
      });

      it("no repeated festival moment across 5 scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const festivalMoments = result.map((c) => c.festivalMoment);
        const uniqueMoments = new Set(festivalMoments);

        expect(uniqueMoments.size).toBe(5);
      });
    });

    describe("language distribution", () => {
      it("both Hindi and Japanese appear in batch when weights require both", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        const result = assign(pools, history, config);
        const languages = result.map((c) => c.language);

        expect(languages.filter((l) => l === "hi").length).toBe(3);
        expect(languages.filter((l) => l === "ja").length).toBe(2);
      });

      it("follows configured weights {hi: 4, ja: 1}", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 4, ja: 1 } };

        const result = assign(pools, history, config);
        const languages = result.map((c) => c.language);

        expect(languages.filter((l) => l === "hi").length).toBe(4);
        expect(languages.filter((l) => l === "ja").length).toBe(1);
      });

      it("follows configured weights {hi: 2, ja: 3}", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 2, ja: 3 } };

        const result = assign(pools, history, config);
        const languages = result.map((c) => c.language);

        expect(languages.filter((l) => l === "hi").length).toBe(2);
        expect(languages.filter((l) => l === "ja").length).toBe(3);
      });

      it("throws when language distribution cannot be satisfied", () => {
        const pools = createValidPool();
        pools.language = ["hi"]; // Only Hindi available
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        expect(() => assign(pools, history, config)).toThrow(VarietyError);
      });
    });

    describe("pool validation", () => {
      it("throws VarietyError when hook pool smaller than batch size", () => {
        const pools = createInsufficientPool("hook");
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        expect(() => assign(pools, history, config)).toThrow(VarietyError);
        expect(() => assign(pools, history, config)).toThrow(/hook/);
      });

      it("throws VarietyError when stageArea pool smaller than batch size", () => {
        const pools = createInsufficientPool("stageArea");
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        expect(() => assign(pools, history, config)).toThrow(VarietyError);
        expect(() => assign(pools, history, config)).toThrow(/stageArea/);
      });

      it("includes axis name and pool size in error message", () => {
        const pools = createValidPool();
        pools.dynamic = ["Synchronized dance", "Mirror movements"]; // Only 2 elements
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        try {
          assign(pools, history, config);
          expect.fail("Should have thrown VarietyError");
        } catch (error) {
          expect(error).toBeInstanceOf(VarietyError);
          const varietyError = error as VarietyError;
          expect(varietyError.type).toBe("pool_exhausted");
          expect(varietyError.axis).toBe("dynamic");
          expect(varietyError.poolSize).toBe(2);
          expect(varietyError.batchSize).toBe(5);
        }
      });

      it("validation happens before assignment starts", () => {
        const pools = createInsufficientPool("hook");
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

        // Should throw immediately, not after partial assignment
        expect(() => assign(pools, history, config)).toThrow(VarietyError);
      });
    });

    describe("pinned block handling", () => {
      it("pinned blocks bypass rotation and appear in all scenes", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
          pinnedBlocks: [{ axis: "hook" as VarietyAxis, value: "String explosion" }],
        };

        const result = assign(pools, history, config);

        // All scenes should have the pinned hook
        for (const combo of result) {
          expect(combo.hook).toBe("String explosion");
        }
      });

      it("pinned blocks do not trigger collision errors", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
          pinnedBlocks: [{ axis: "gag" as VarietyAxis, value: "Strings tangle" }],
        };

        // Should not throw even though all scenes have same gag
        expect(() => assign(pools, history, config)).not.toThrow();
      });

      it("non-pinned axes still have no collisions", () => {
        const pools = createValidPool();
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
          pinnedBlocks: [{ axis: "hook" as VarietyAxis, value: "String explosion" }],
        };

        const result = assign(pools, history, config);

        // Other axes should still be unique
        const stageAreas = result.map((c) => c.stageArea);
        expect(new Set(stageAreas).size).toBe(5);

        const moments = result.map((c) => c.festivalMoment);
        expect(new Set(moments).size).toBe(5);
      });

      it("pinned blocks do not consume pool slots", () => {
        const pools = createValidPool();
        pools.hook = ["String explosion"]; // Only one hook, but it's pinned
        const history: HistoryEntry[] = [];
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
          pinnedBlocks: [{ axis: "hook" as VarietyAxis, value: "String explosion" }],
        };

        // Should not throw even though hook pool has only 1 element
        expect(() => assign(pools, history, config)).not.toThrow();
      });
    });

    describe("history collision retry in assign", () => {
      it("retries when history collision detected and finds valid combo", () => {
        const pools = createValidPool();
        // Create history that collides with first potential pick but allows others
        const history = [
          createHistoryEntry(5, {
            stageArea: STAGE_AREAS[0],
            festivalMoment: FESTIVAL_MOMENTS[0],
          }),
        ];
        const config: VarietyConfig = { batchSize: 1, languages: { hi: 1, ja: 0 } };

        // Should succeed by retrying with different combo
        const result = assign(pools, history, config);
        expect(result).toHaveLength(1);
        // Result should NOT match the colliding combination
        expect(result[0].stageArea !== STAGE_AREAS[0] || result[0].festivalMoment !== FESTIVAL_MOMENTS[0]).toBe(true);
      });

      it("throws VarietyError when all combos collide with history", () => {
        // Create pools with only one option each
        const singleOptionPools: VarietyPool = {
          stageArea: [STAGE_AREAS[0]],
          festivalMoment: [FESTIVAL_MOMENTS[0]],
          dynamic: [PUPPET_DYNAMICS[0]],
          visual: [PUPPET_VISUALS[0]],
          hook: [HOOK_TYPES[0]],
          gag: [PHYSICAL_GAGS[0]],
          payoff: [PAYOFF_TYPES[0]],
          chaosThread: [CHAOS_THREADS[0]],
          camera_start: [CAMERA_MOVES[0]],
          camera_middle: [CAMERA_MOVES[1]],
          camera_end: [CAMERA_MOVES[2]],
          language: ["hi"],
          subgenre: [SUBGENRES[0]],
        };

        // History that matches the only possible combo
        const history = [
          createHistoryEntry(5, {
            stageArea: STAGE_AREAS[0],
            festivalMoment: FESTIVAL_MOMENTS[0],
          }),
        ];
        const config: VarietyConfig = { batchSize: 1, languages: { hi: 1, ja: 0 } };

        expect(() => assign(singleOptionPools, history, config)).toThrow(VarietyError);
        expect(() => assign(singleOptionPools, history, config)).toThrow(/retries/i);
      });
    });
  });

  describe("checkHistoryCollision", () => {
    describe("stage+moment collision (30-day window)", () => {
      it("detects collision within 30 days", () => {
        const combo = createTestCombo(0);
        const history = [
          createHistoryEntry(15, {
            stageArea: combo.stageArea,
            festivalMoment: combo.festivalMoment,
          }),
        ];

        const result = checkHistoryCollision(combo, history);

        expect(result.collision).toBe(true);
        expect(result.type).toBe("stage-moment");
        expect(result.severity).toBe("warn");
      });

      it("does not detect collision after 30 days", () => {
        const combo = createTestCombo(0);
        const history = [
          createHistoryEntry(35, {
            stageArea: combo.stageArea,
            festivalMoment: combo.festivalMoment,
          }),
        ];

        const result = checkHistoryCollision(combo, history);

        expect(result.collision).toBe(false);
      });

      it("boundary: detects collision at exactly 30 days", () => {
        const combo = createTestCombo(0);
        const history = [
          createHistoryEntry(30, {
            stageArea: combo.stageArea,
            festivalMoment: combo.festivalMoment,
          }),
        ];

        const result = checkHistoryCollision(combo, history);

        // At exactly 30 days, should still be within window
        expect(result.collision).toBe(true);
      });

      it("boundary: no collision at 31 days", () => {
        const combo = createTestCombo(0);
        const history = [
          createHistoryEntry(31, {
            stageArea: combo.stageArea,
            festivalMoment: combo.festivalMoment,
          }),
        ];

        const result = checkHistoryCollision(combo, history);

        expect(result.collision).toBe(false);
      });

      it("returns evidence with days since last use", () => {
        const combo = createTestCombo(0);
        const history = [
          createHistoryEntry(15, {
            stageArea: combo.stageArea,
            festivalMoment: combo.festivalMoment,
          }),
        ];

        const result = checkHistoryCollision(combo, history);

        expect(result.evidence).toContain("15");
        expect(result.evidence).toContain("days");
      });
    });

    describe("dynamic+payoff collision (10-run window)", () => {
      it("detects collision within last 10 runs", () => {
        const combo = createTestCombo(0);
        // Use different stage/moment to avoid stage-moment collision
        const history = Array.from({ length: 10 }, (_, i) =>
          createHistoryEntry(i, {
            dynamic: i === 5 ? combo.dynamic : "Other dynamic",
            payoff: i === 5 ? combo.payoff : "Other payoff",
            stageArea: "Different Stage",
            festivalMoment: "Different Moment",
          })
        );

        const result = checkHistoryCollision(combo, history);

        expect(result.collision).toBe(true);
        expect(result.type).toBe("dynamic-payoff");
        expect(result.severity).toBe("warn");
      });

      it("does not detect collision outside 10-run window", () => {
        const combo = createTestCombo(0);
        // Use different stage/moment to avoid stage-moment collision
        const history = Array.from({ length: 15 }, (_, i) =>
          createHistoryEntry(i, {
            dynamic: i === 0 ? combo.dynamic : "Other dynamic",
            payoff: i === 0 ? combo.payoff : "Other payoff",
            stageArea: "Different Stage",
            festivalMoment: "Different Moment",
          })
        );
        // The matching entry is at index 0, which is outside the last 10 runs

        const result = checkHistoryCollision(combo, history);

        // Should not detect because the match is older than 10 runs
        expect(result.collision).toBe(false);
      });

      it("boundary: detects collision at exactly 10th run", () => {
        const combo = createTestCombo(0);
        // Create exactly 10 entries, with match at the oldest one
        // Use different stage/moment to avoid stage-moment collision
        const history = Array.from({ length: 10 }, (_, i) =>
          createHistoryEntry(i, {
            dynamic: i === 0 ? combo.dynamic : "Other dynamic",
            payoff: i === 0 ? combo.payoff : "Other payoff",
            stageArea: "Different Stage",
            festivalMoment: "Different Moment",
          })
        );

        const result = checkHistoryCollision(combo, history);

        // At exactly 10th run back, should still detect
        expect(result.collision).toBe(true);
      });
    });

    describe("no collision scenarios", () => {
      it("returns no collision for empty history", () => {
        const combo = createTestCombo(0);
        const history: HistoryEntry[] = [];

        const result = checkHistoryCollision(combo, history);

        expect(result.collision).toBe(false);
      });

      it("returns no collision when combo is unique", () => {
        const combo = createTestCombo(0);
        const history = [createTestCombo(1), createTestCombo(2), createTestCombo(3)].map((c, i) =>
          createHistoryEntry(i + 1, c)
        );

        const result = checkHistoryCollision(combo, history);

        expect(result.collision).toBe(false);
      });
    });
  });

  describe("validatePools", () => {
    it("returns valid for sufficient pools", () => {
      const pools = createValidPool();
      const batchSize = 5;

      const result = validatePools(pools, batchSize);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns invalid with error for insufficient pool", () => {
      const pools = createInsufficientPool("hook");
      const batchSize = 5;

      const result = validatePools(pools, batchSize);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("hook");
    });

    it("detects multiple insufficient pools", () => {
      const pools = createValidPool();
      pools.hook = pools.hook.slice(0, 3);
      pools.gag = pools.gag.slice(0, 2);
      const batchSize = 5;

      const result = validatePools(pools, batchSize);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe("hasWithinBatchCollision", () => {
    it("returns false for collision-free assignments", () => {
      const assignments = [
        createTestCombo(0),
        createTestCombo(1),
        createTestCombo(2),
        createTestCombo(3),
        createTestCombo(4),
      ];

      const result = hasWithinBatchCollision(assignments);

      expect(result).toBe(false);
    });

    it("returns true when hooks collide", () => {
      const assignments = [
        { ...createTestCombo(0), hook: "String explosion" },
        { ...createTestCombo(1), hook: "String explosion" }, // Duplicate
        createTestCombo(2),
        createTestCombo(3),
        createTestCombo(4),
      ];

      const result = hasWithinBatchCollision(assignments);

      expect(result).toBe(true);
    });

    it("returns true when stage areas collide", () => {
      const assignments = [
        { ...createTestCombo(0), stageArea: "Main Stage" },
        createTestCombo(1),
        { ...createTestCombo(2), stageArea: "Main Stage" }, // Duplicate
        createTestCombo(3),
        createTestCombo(4),
      ];

      const result = hasWithinBatchCollision(assignments);

      expect(result).toBe(true);
    });
  });

  // Property-based tests
  describe("property-based tests", () => {
    fcTest.prop([arbitraryPoolConfig()], { numRuns: 200, seed: 42 })(
      "zero within-batch collision across 200 random pool configurations",
      (pools) => {
        // Filter to ensure minimum pool sizes
        const validPools: VarietyPool = {
          ...pools,
          hook: [...new Set(pools.hook)].slice(0, Math.max(5, pools.hook.length)),
          camera_start: [...new Set(pools.camera_start)].slice(0, Math.max(5, pools.camera_start.length)),
          camera_middle: [...new Set(pools.camera_middle)].slice(0, Math.max(5, pools.camera_middle.length)),
          camera_end: [...new Set(pools.camera_end)].slice(0, Math.max(5, pools.camera_end.length)),
          dynamic: [...new Set(pools.dynamic)].slice(0, Math.max(5, pools.dynamic.length)),
          visual: [...new Set(pools.visual)].slice(0, Math.max(5, pools.visual.length)),
          gag: [...new Set(pools.gag)].slice(0, Math.max(5, pools.gag.length)),
          payoff: [...new Set(pools.payoff)].slice(0, Math.max(5, pools.payoff.length)),
          chaosThread: [...new Set(pools.chaosThread)].slice(0, Math.max(5, pools.chaosThread.length)),
          stageArea: [...new Set(pools.stageArea)].slice(0, Math.max(5, pools.stageArea.length)),
          festivalMoment: [...new Set(pools.festivalMoment)].slice(0, Math.max(5, pools.festivalMoment.length)),
          language: ["hi", "ja"],
          subgenre: pools.subgenre.length > 0 ? pools.subgenre : ["psycore"],
        };

        // Skip if pools are too small after deduplication
        const allPoolsValid = [
          validPools.hook,
          validPools.camera_start,
          validPools.camera_middle,
          validPools.camera_end,
          validPools.dynamic,
          validPools.visual,
          validPools.gag,
          validPools.payoff,
          validPools.chaosThread,
          validPools.stageArea,
          validPools.festivalMoment,
        ].every((pool) => pool.length >= 5);

        if (!allPoolsValid) {
          return true; // Skip this case
        }

        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
        };

        const assignments = assign(validPools, [], config);

        // Check no collisions on any axis
        for (const axis of ROTATION_AXES) {
          const usedValues = new Set<string>();
          for (const assignment of assignments) {
            let value: string | undefined;
            if (axis === "camera_start") {
              value = assignment.camera.start;
            } else if (axis === "camera_middle") {
              value = assignment.camera.middle;
            } else if (axis === "camera_end") {
              value = assignment.camera.end;
            } else {
              value = assignment[axis as keyof ComboAssignment] as string;
            }

            if (value !== null && value !== undefined) {
              expect(usedValues.has(value)).toBe(false);
              usedValues.add(value);
            }
          }
        }

        return true;
      }
    );

    fcTest.prop(
      [
        arbitraryUsageLog(50),
        arbitraryNewCombo(),
      ],
      { numRuns: 100, seed: 42 }
    )(
      "history collision detection is consistent with constraint rules",
      (history, newCombo) => {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

        // Check for stage+moment collision manually
        const hasStageMomentCollision = history.some(
          (entry) =>
            entry.runDate > thirtyDaysAgo &&
            entry.stageArea === newCombo.stageArea &&
            entry.festivalMoment === newCombo.festivalMoment
        );

        // Check for dynamic+payoff collision manually (last 10 runs)
        const recentRuns = history.slice(-10);
        const hasDynamicPayoffCollision = recentRuns.some(
          (entry) =>
            entry.dynamic === newCombo.dynamic && entry.payoff === newCombo.payoff
        );

        const result = checkHistoryCollision(newCombo, history);

        if (hasStageMomentCollision || hasDynamicPayoffCollision) {
          expect(result.collision).toBe(true);
        }

        return true;
      }
    );

    fcTest.prop(
      [
        arbitraryPoolConfig(),
        fc.record({
          hi: fc.integer({ min: 1, max: 4 }),
          ja: fc.integer({ min: 1, max: 4 }),
        }).filter((w) => w.hi + w.ja === 5),
      ],
      { numRuns: 100, seed: 42 }
    )(
      "language distribution matches configured weights",
      (pools, weights) => {
        const validPools = {
          ...pools,
          hook: pools.hook.length >= 5 ? pools.hook : HOOK_TYPES.slice(0, 6),
          camera_start: pools.camera_start.length >= 5 ? pools.camera_start : CAMERA_MOVES.slice(0, 6),
          camera_middle: pools.camera_middle.length >= 5 ? pools.camera_middle : CAMERA_MOVES.slice(0, 6),
          camera_end: pools.camera_end.length >= 5 ? pools.camera_end : CAMERA_MOVES.slice(0, 6),
          dynamic: pools.dynamic.length >= 5 ? pools.dynamic : PUPPET_DYNAMICS.slice(0, 5),
          visual: pools.visual.length >= 5 ? pools.visual : PUPPET_VISUALS.slice(0, 5),
          gag: pools.gag.length >= 5 ? pools.gag : PHYSICAL_GAGS.slice(0, 6),
          payoff: pools.payoff.length >= 5 ? pools.payoff : PAYOFF_TYPES.slice(0, 6),
          chaosThread: pools.chaosThread.length >= 5 ? pools.chaosThread : CHAOS_THREADS.slice(0, 6),
          stageArea: pools.stageArea.length >= 5 ? pools.stageArea : STAGE_AREAS.slice(0, 6),
          festivalMoment: pools.festivalMoment.length >= 5 ? pools.festivalMoment : FESTIVAL_MOMENTS.slice(0, 6),
          language: ["hi", "ja"],
          subgenre: pools.subgenre.length > 0 ? pools.subgenre : ["psycore"],
        };

        const config: VarietyConfig = {
          batchSize: 5,
          languages: weights,
        };

        const assignments = assign(validPools, [], config);
        const languages = assignments.map((a) => a.language);

        const hiCount = languages.filter((l) => l === "hi").length;
        const jaCount = languages.filter((l) => l === "ja").length;

        expect(hiCount).toBe(weights.hi);
        expect(jaCount).toBe(weights.ja);
        expect(hiCount + jaCount).toBe(5);

        return true;
      }
    );

    fcTest.prop(
      [
        fc.record({
          hook: fc.array(fc.string(), { minLength: 1, maxLength: 4 }),
          camera_start: arbitraryPoolWithMinSize(5),
          camera_middle: arbitraryPoolWithMinSize(5),
          camera_end: arbitraryPoolWithMinSize(5),
          dynamic: arbitraryPoolWithMinSize(5),
          visual: arbitraryPoolWithMinSize(5),
          gag: arbitraryPoolWithMinSize(5),
          payoff: arbitraryPoolWithMinSize(5),
          chaosThread: arbitraryPoolWithMinSize(5),
          stageArea: arbitraryPoolWithMinSize(5),
          festivalMoment: arbitraryPoolWithMinSize(5),
          language: fc.constant(["hi", "ja"]),
          subgenre: arbitraryPoolWithMinSize(1),
        }),
      ],
      { numRuns: 50, seed: 42 }
    )(
      "throws VarietyError when pool size < batch size",
      (pools) => {
        const config: VarietyConfig = {
          batchSize: 5,
          languages: { hi: 3, ja: 2 },
        };

        // Pool for 'hook' has 1-4 elements, which is < 5
        expect(() => assign(pools as VarietyPool, [], config)).toThrow(VarietyError);

        return true;
      }
    );
  });

  describe("VarietyError", () => {
    it("has correct type for pool_exhausted", () => {
      const pools = createInsufficientPool("hook");
      const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

      try {
        assign(pools, [], config);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VarietyError);
        const varietyError = error as VarietyError;
        expect(varietyError.type).toBe("pool_exhausted");
      }
    });

    it("has correct type for language_constraint", () => {
      const pools = createValidPool();
      pools.language = ["hi"]; // Only Hindi
      const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

      try {
        assign(pools, [], config);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VarietyError);
        const varietyError = error as VarietyError;
        expect(varietyError.type).toBe("language_constraint");
      }
    });

    it("includes attempted assignments in error details", () => {
      const pools = createInsufficientPool("hook");
      const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

      try {
        assign(pools, [], config);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VarietyError);
        const varietyError = error as VarietyError;
        expect(varietyError.batchSize).toBeDefined();
        expect(varietyError.axis).toBeDefined();
      }
    });

    it("throws invalid_config for batch size 0", () => {
      const pools = createValidPool();
      const config: VarietyConfig = { batchSize: 0, languages: { hi: 0, ja: 0 } };

      expect(() => assign(pools, [], config)).toThrow(VarietyError);
      expect(() => assign(pools, [], config)).toThrow(/batch size/i);
    });

    it("throws invalid_config for batch size 11", () => {
      const pools = createValidPool();
      const config: VarietyConfig = { batchSize: 11, languages: { hi: 6, ja: 5 } };

      expect(() => assign(pools, [], config)).toThrow(VarietyError);
      expect(() => assign(pools, [], config)).toThrow(/batch size/i);
    });

    it("throws language_constraint when Hindi required but not in pool", () => {
      const pools = createValidPool();
      pools.language = ["ja"]; // Only Japanese
      const config: VarietyConfig = { batchSize: 2, languages: { hi: 1, ja: 1 } };

      try {
        assign(pools, [], config);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VarietyError);
        const varietyError = error as VarietyError;
        expect(varietyError.type).toBe("language_constraint");
        expect(varietyError.message).toContain("Hindi");
      }
    });

    it("throws language_constraint when Japanese required but not in pool", () => {
      const pools = createValidPool();
      pools.language = ["hi"]; // Only Hindi
      const config: VarietyConfig = { batchSize: 2, languages: { hi: 1, ja: 1 } };

      try {
        assign(pools, [], config);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VarietyError);
        const varietyError = error as VarietyError;
        expect(varietyError.type).toBe("language_constraint");
        expect(varietyError.message).toContain("Japanese");
      }
    });

    it("throws pool_exhausted for empty subgenre pool", () => {
      const pools = createValidPool();
      pools.subgenre = []; // Empty subgenre
      const config: VarietyConfig = { batchSize: 2, languages: { hi: 1, ja: 1 } };

      expect(() => assign(pools, [], config)).toThrow(VarietyError);
      expect(() => assign(pools, [], config)).toThrow(/subgenre/i);
    });

    it("throws pool_exhausted for undefined subgenre pool", () => {
      const pools = createValidPool();
      delete (pools as unknown as Record<string, unknown>).subgenre;
      const config: VarietyConfig = { batchSize: 2, languages: { hi: 1, ja: 1 } };

      expect(() => assign(pools, [], config)).toThrow(VarietyError);
      expect(() => assign(pools, [], config)).toThrow(/subgenre/i);
    });

    it("throws language_constraint when weights sum differs from batch size", () => {
      const pools = createValidPool();
      const config: VarietyConfig = { batchSize: 5, languages: { hi: 2, ja: 1 } }; // Sum is 3, not 5

      try {
        assign(pools, [], config);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VarietyError);
        const varietyError = error as VarietyError;
        expect(varietyError.type).toBe("language_constraint");
        expect(varietyError.message).toContain("sum");
      }
    });

    it("throws pool_exhausted for undefined axis pool", () => {
      const pools = createValidPool();
      delete (pools as unknown as Record<string, unknown>).hook;
      const config: VarietyConfig = { batchSize: 5, languages: { hi: 3, ja: 2 } };

      expect(() => assign(pools, [], config)).toThrow(VarietyError);
      expect(() => assign(pools, [], config)).toThrow(/hook/i);
    });
  });
});
