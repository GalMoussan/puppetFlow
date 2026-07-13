/**
 * Tests for Domain Linter Module
 *
 * Per blueprint Section 6, Phase 1.5:
 * - One test file per rule (R1-R13) - this is the main file
 * - Crafted good/bad outputs with realistic prompt fixtures
 * - Violation structure verification: rule, severity, sceneIndex, stage, evidence
 * - Minimum 2 passing, 2 failing fixtures per rule
 */

import { describe, it, expect } from "vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  lintBatch,
  lintScene,
  checkR1SequentialWeighting,
  checkR2CameraVerb,
  checkR3WordBudget,
  checkR4BeatStructure,
  checkR5DivisionOfLabor,
  checkR6Negatives,
  checkR7Handshake,
  checkR8ShortExtends,
  checkR9RetentionPacing,
  checkR10LoopClosure,
  checkR11AudioDirection,
  checkR12DropSync,
  checkR13CharacterLocks,
  type LintReport,
} from "@/packages/domain/linter";

import {
  type BatchOutput,
  type Scene,
  type CanvasGraph,
  type RunConfig,
  type Violation,
} from "@/packages/domain/types";

import { createMinimalGraph, createMinimalScene, createMinimalBatch } from "./helpers";

// Helper to create a scene with specific prompts
function createSceneWithPrompts(
  index: number,
  overrides: Partial<Scene>
): Scene {
  return {
    ...createMinimalScene(index),
    ...overrides,
  };
}

// Sample valid prompts that pass all rules
const VALID_IMAGE_PROMPT = `Grand festival stage bathed in UV purple lighting. Two puppet characters positioned center stage.

CRITICAL CHARACTER LOCK - SHIKA:
Shika is a humanoid puppet with orange fur, large expressive eyes, and visible string connections at joints. Height approximately 1.5 meters. Always shows marionette control bars above.

CRITICAL CHARACTER LOCK - SHILSHUL:
Shilshul is a humanoid puppet with blue fur, matching expressive eyes, complementary design to Shika. Same visible string mechanism and control aesthetic.

This frame serves as a loop anchor for seamless video looping.`;

const VALID_VIDEO_START_PROMPT = `[00:00] [HOOK] Shika explodes onto stage left, strings blazing with intense neon purple light. The crowd surges forward in anticipation. [00:04] Camera dollies dramatically backward to capture the full spectacle as Shilshul emerges from shadow, arms unfurling in synchronized motion. Pyrotechnics flash overhead as festival energy builds. [00:08] Both puppets freeze mid-pose, strings taut, silhouettes sharp against pulsing UV backdrop. Keep same UV purple lighting, same character appearance. Keep Shika and Shilshul identical to reference image. Audio: crowd roar building to crescendo, no dialogue. ENDING FRAME [EXACT]: Both frozen mid-pose, UV purple lighting.`;

const VALID_EXTEND_MIDDLE_PROMPT = `Continue directly from the final frame of the previous clip: Both frozen mid-pose, UV purple lighting. [00:00] Shika's strings surge upward as both puppets resume motion with explosive energy. [00:04] Camera pans smoothly left as pyrotechnics flash overhead. Crowd silhouettes pulse with excitement. Keep same UV purple lighting, same character appearance. Keep Shika and Shilshul identical to reference image. Audio: synth pulse building, no dialogue. ENDING FRAME [EXACT]: Both puppets centered, arms extended.`;

const VALID_EXTEND_END_PROMPT = `Continue directly from the final frame of the previous clip: Both puppets centered, arms extended. [00:00] Energy maintains at peak as strings blaze with renewed intensity. Camera cranes up dramatically revealing full stage. [00:04] Anticipation builds to climax, crowd silhouettes surging. [00:08] [DROP] Both puppets explode into synchronized movement. Keep same UV purple lighting. Keep Shika and Shilshul identical to reference image. Audio: bass drop impact, no dialogue. ENDING FRAME [EXACT]: Peak tableau, mirrors opening.`;

const VALID_LYRICS = `[Intro]
Festival energy rises...

[Build]
The crowd anticipates...

[Pre-Drop]
Tension building...

[Drop]
Shika! Shika! Shilshul! Shilshul!
The bass explodes!

[Outro]
Energy fades...`;

describe("linter", () => {
  describe("lintBatch", () => {
    describe("basic functionality", () => {
      it("returns LintReport for valid batch", () => {
        const batch: BatchOutput = {
          scenes: createMinimalBatch().map((s, i) => ({
            ...s,
            imagePrompt: VALID_IMAGE_PROMPT,
            startPrompt: VALID_VIDEO_START_PROMPT,
            middlePrompt: VALID_EXTEND_MIDDLE_PROMPT,
            endPrompt: VALID_EXTEND_END_PROMPT,
            lyrics: VALID_LYRICS,
          })),
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: true, languages: { hi: 3, ja: 2 }, batchSize: 5 };

        const result = lintBatch(batch, graph, config);

        expect(result).toHaveProperty("valid");
        expect(result).toHaveProperty("hardViolations");
        expect(result).toHaveProperty("warnings");
        expect(result).toHaveProperty("byScene");
        expect(result).toHaveProperty("byRule");
      });

      it("is pure function with no side effects", () => {
        const batch: BatchOutput = { scenes: createMinimalBatch() };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 5 };

        const result1 = lintBatch(batch, graph, config);
        const result2 = lintBatch(batch, graph, config);

        expect(result1).toEqual(result2);
      });

      it("validates all 5 scenes", () => {
        const batch: BatchOutput = { scenes: createMinimalBatch() };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 5 };

        const result = lintBatch(batch, graph, config);

        // Should have violations grouped by scene
        expect(result.byScene).toBeDefined();
        expect(result.byScene.size).toBeLessThanOrEqual(5);
      });
    });

    describe("LintReport structure", () => {
      it("valid is true when no hard violations", () => {
        const batch: BatchOutput = {
          scenes: createMinimalBatch().map((s) => ({
            ...s,
            imagePrompt: VALID_IMAGE_PROMPT,
            startPrompt: VALID_VIDEO_START_PROMPT,
            middlePrompt: VALID_EXTEND_MIDDLE_PROMPT,
            endPrompt: VALID_EXTEND_END_PROMPT,
            lyrics: VALID_LYRICS,
          })),
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: true, languages: { hi: 3, ja: 2 }, batchSize: 5 };

        const result = lintBatch(batch, graph, config);

        expect(result.valid).toBe(true);
        expect(result.hardViolations).toHaveLength(0);
      });

      it("valid is false when hard violations exist", () => {
        const batch: BatchOutput = {
          scenes: [
            createSceneWithPrompts(1, {
              startPrompt: "No timestamps or structure here.",
            }),
          ],
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 1 };

        const result = lintBatch(batch, graph, config);

        expect(result.valid).toBe(false);
        expect(result.hardViolations.length).toBeGreaterThan(0);
      });

      it("groups violations by scene", () => {
        const batch: BatchOutput = {
          scenes: [
            createSceneWithPrompts(0, { startPrompt: "Bad prompt scene 0" }),
            createSceneWithPrompts(1, { startPrompt: "Bad prompt scene 1" }),
          ],
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 2 };

        const result = lintBatch(batch, graph, config);

        const scene0Violations = result.byScene.get(0);
        const scene1Violations = result.byScene.get(1);

        expect(scene0Violations).toBeDefined();
        expect(scene1Violations).toBeDefined();
      });

      it("groups violations by rule", () => {
        const batch: BatchOutput = {
          scenes: [
            createSceneWithPrompts(0, {
              startPrompt: "No camera verb, no timestamps.",
            }),
          ],
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 1 };

        const result = lintBatch(batch, graph, config);

        // Should have violations grouped by rule
        expect(result.byRule).toBeDefined();
      });
    });

    describe("Violation structure", () => {
      it("violations have required fields", () => {
        const batch: BatchOutput = {
          scenes: [
            createSceneWithPrompts(0, {
              startPrompt: "Invalid prompt without proper structure.",
            }),
          ],
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 1 };

        const result = lintBatch(batch, graph, config);

        if (result.hardViolations.length > 0) {
          const violation = result.hardViolations[0];
          expect(violation).toHaveProperty("rule");
          expect(violation).toHaveProperty("severity");
          expect(violation).toHaveProperty("evidence");
          expect(["hard", "warn"]).toContain(violation.severity);
        }
      });

      it("violations include sceneIndex", () => {
        const batch: BatchOutput = {
          scenes: [
            createSceneWithPrompts(0, { startPrompt: "Bad" }),
            createSceneWithPrompts(1, { startPrompt: "Also bad" }),
          ],
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 2 };

        const result = lintBatch(batch, graph, config);

        for (const violation of [...result.hardViolations, ...result.warnings]) {
          expect(typeof violation.sceneIndex).toBe("number");
          expect(violation.sceneIndex).toBeGreaterThanOrEqual(0);
        }
      });

      it("violations include stage when applicable", () => {
        const batch: BatchOutput = {
          scenes: [
            createSceneWithPrompts(0, {
              startPrompt: "No camera verb here, no proper structure.",
            }),
          ],
        };
        const graph = createMinimalGraph();
        const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 1 };

        const result = lintBatch(batch, graph, config);

        const stageViolation = result.hardViolations.find((v) => v.stage !== undefined);
        if (stageViolation) {
          expect(["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END", "LYRICS"]).toContain(
            stageViolation.stage
          );
        }
      });
    });
  });

  describe("R1 - Sequential Weighting", () => {
    describe("positive cases", () => {
      it("passes when first sentence has subject + action verb", () => {
        const prompt =
          '[00:00] Shika surges forward, strings blazing. Camera dollies. [00:04] Action. Audio: crowd, no dialogue. ENDING FRAME [EXACT]: Frozen.';

        const result = checkR1SequentialWeighting(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });

      it("passes when preservation is in final 25%", () => {
        // 80-word prompt with preservation at ~80%
        const prompt =
          "[00:00] Shika explodes onto stage left, strings blazing with UV energy. The crowd gasps. Camera whips left. [00:04] Shilshul emerges from shadow, arms unfurling in sync with bass drop. Festival lights pulse overhead. [00:08] Both freeze mid-pose, strings taut. Keep same lighting, same character appearance. Audio: crowd roar, no dialogue. ENDING FRAME [EXACT]: Both frozen.";

        const result = checkR1SequentialWeighting(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails when first sentence has no action verb", () => {
        const prompt =
          "The stage. Shika stands still. Camera pans. Keep same lighting. ENDING FRAME [EXACT]: Done.";

        const result = checkR1SequentialWeighting(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].rule).toBe("R1");
        expect(result[0].severity).toBe("hard");
        expect(result[0].evidence).toContain("first sentence");
      });

      it("fails when preservation is in first half", () => {
        const prompt =
          "Shika moves. Keep same lighting throughout. Camera pans right. The crowd roars. More action. ENDING FRAME [EXACT]: Done.";

        const result = checkR1SequentialWeighting(prompt, "VIDEO_START");

        expect(result.some((v) => v.evidence.includes("preservation"))).toBe(true);
      });
    });
  });

  describe("R2 - Explicit Camera Verb", () => {
    describe("positive cases", () => {
      it("passes with exactly one camera verb: dolly", () => {
        const prompt =
          "[00:00] Action. Camera dollies backward. [00:04] More. Audio: crowd, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR2CameraVerb(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });

      it("passes with compound camera: dolly zoom", () => {
        const prompt =
          "[00:00] Scene intensifies. Dolly zoom creates vertigo effect. [00:04] Action. Audio: roar, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR2CameraVerb(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails with zero camera verbs", () => {
        const prompt =
          "[00:00] Shika dances. Lights flash. Crowd cheers. [00:04] Energy peaks. ENDING FRAME [EXACT]: Chaos.";

        const result = checkR2CameraVerb(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].rule).toBe("R2");
        expect(result[0].evidence).toContain("No camera verb");
      });

      it("fails with two camera verbs", () => {
        const prompt =
          "[00:00] Pan left to Shika, then dolly forward. [00:04] Action. ENDING FRAME [EXACT]: Done.";

        const result = checkR2CameraVerb(prompt, "EXTEND_MIDDLE");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("2");
      });

      it('fails with only "cinematic"', () => {
        const prompt =
          "[00:00] Cinematic shot of festival. [00:04] Crowd reacts. ENDING FRAME [EXACT]: Wide view.";

        const result = checkR2CameraVerb(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("cinematic");
      });
    });
  });

  describe("R3 - Word Budget and Strong Verbs", () => {
    describe("positive cases", () => {
      it("passes at exactly 40 words", () => {
        // Crafted to be exactly 40 words
        const prompt =
          "[00:00] Shika surges forward strings blazing camera dollies backward crowd gasps Shilshul emerges arms unfurling festival lights pulse overhead both puppets freeze mid-pose strings taut keep same lighting keep same character appearance audio crowd roar ending frame exact frozen both visible.";

        const result = checkR3WordBudget(prompt, "VIDEO_START");

        const budgetViolation = result.find((v) => v.evidence.includes("word count"));
        expect(budgetViolation).toBeUndefined();
      });

      it("passes with exactly 2 generic verbs", () => {
        const prompt =
          "[00:00] Shika moves left. The crowd is excited. Camera pans. Strings explode with color. [00:04] Energy surges. ENDING FRAME [EXACT]: Frozen.";

        const result = checkR3WordBudget(prompt, "VIDEO_START");

        const genericVerbViolation = result.find((v) => v.evidence.includes("generic verb"));
        expect(genericVerbViolation).toBeUndefined();
      });
    });

    describe("negative cases", () => {
      it("warns at 35 words (under budget)", () => {
        const prompt =
          "[00:00] Shika leaps. Camera dollies. Crowd roars. [00:04] Flash. Pulse. [00:08] Freeze. Keep same. ENDING FRAME [EXACT]: Done.";

        const result = checkR3WordBudget(prompt, "VIDEO_START");

        expect(result.some((v) => v.severity === "warn" && v.evidence.includes("below"))).toBe(true);
      });

      it("fails with 3 generic verbs", () => {
        const prompt =
          "[00:00] Shika moves left. The puppet goes forward. The lighting is bright. [00:04] Camera pans. Scene is electric. Shilshul moves. [00:08] Freeze. Keep same. ENDING FRAME [EXACT]: Done.";

        const result = checkR3WordBudget(prompt, "VIDEO_START");

        expect(result.some((v) => v.evidence.includes("3 generic verbs"))).toBe(true);
      });
    });
  });

  describe("R4 - Beat Structure with Timestamps", () => {
    describe("positive cases", () => {
      it("passes with 3 timestamps", () => {
        const prompt =
          "[00:00] Beat one. [00:04] Beat two. [00:08] Beat three. Camera dollies. Audio: roar, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR4BeatStructure(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });

      it("passes with 1 timestamp (minimum)", () => {
        const prompt =
          "[00:00] Single intense beat with continuous action. Camera tracks. Audio: building synth, no dialogue. ENDING FRAME [EXACT]: Complete.";

        const result = checkR4BeatStructure(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails with 0 timestamps", () => {
        const prompt =
          "Shika dances. Camera follows. Crowd erupts. Keep same lighting. ENDING FRAME [EXACT]: Both visible.";

        const result = checkR4BeatStructure(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("No timestamp");
      });

      it("fails with 4 timestamps", () => {
        const prompt =
          "[00:00] One. [00:03] Two. [00:06] Three. [00:09] Four - too many! Camera dollies. ENDING FRAME [EXACT]: Over.";

        const result = checkR4BeatStructure(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("4");
      });
    });
  });

  describe("R5 - Image-to-Video Division of Labor", () => {
    describe("positive cases", () => {
      it("passes with no environment overlap", () => {
        const imagePrompt =
          "Grand festival stage with UV purple lighting. Massive LED screens. Dense crowd silhouettes.";
        const videoPrompt =
          "[00:00] From the source image, Shika springs into action. Camera dollies. [00:04] Energy builds. ENDING FRAME [EXACT]: Done.";

        const result = checkR5DivisionOfLabor(imagePrompt, videoPrompt);

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails with heavy environment copy", () => {
        const imagePrompt =
          "The grand mainstage at the festival features massive LED screens displaying psychedelic visuals. UV purple lighting bathes the entire scene.";
        const videoPrompt =
          "[00:00] On the grand mainstage at the festival with massive LED screens displaying psychedelic visuals and UV purple lighting bathing the entire scene, Shika performs. Camera dollies. ENDING FRAME [EXACT]: Done.";

        const result = checkR5DivisionOfLabor(imagePrompt, videoPrompt);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("overlap");
      });
    });
  });

  describe("R6 - Negatives in Video", () => {
    describe("positive cases", () => {
      it("passes with positive preservation only", () => {
        const prompt =
          "[00:00] Shika surges forward. Camera dollies. [00:04] Energy. Keep Shika identical to reference. Audio: synth, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR6Negatives(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });

      it('passes with "no dialogue" exception', () => {
        const prompt =
          "[00:00] Action. Camera pans. [00:04] Energy. Audio: crowd cheers, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR6Negatives(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it('fails with "no" constraint', () => {
        const prompt =
          "[00:00] Shika performs, no extra puppets in frame. Camera pans. ENDING FRAME [EXACT]: Done.";

        const result = checkR6Negatives(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("no extra puppets");
      });

      it('fails with "avoid" constraint', () => {
        const prompt =
          "[00:00] Shika dances, avoid cartoon style. Camera dollies. ENDING FRAME [EXACT]: Done.";

        const result = checkR6Negatives(prompt, "EXTEND_MIDDLE");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("avoid");
      });
    });
  });

  describe("R7 - Boundary Frame Handshake", () => {
    describe("positive cases", () => {
      it("passes with verbatim handshake", () => {
        const currentPrompt =
          "Action. ENDING FRAME [EXACT]: Shika stage-left, strings taut, UV purple lighting.";
        const nextPrompt =
          "Continue directly from the final frame of the previous clip: Shika stage-left, strings taut, UV purple lighting. [00:00] Action.";

        const result = checkR7Handshake(currentPrompt, nextPrompt, { strictness: "verbatim" });

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails when missing ENDING FRAME", () => {
        const currentPrompt = "[00:00] Action. No ending frame marker here.";
        const nextPrompt = "Continue from previous: Shika. [00:00] Action.";

        const result = checkR7Handshake(currentPrompt, nextPrompt, { strictness: "verbatim" });

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("ENDING FRAME");
      });

      it("fails when lighting changes", () => {
        const currentPrompt = "Action. ENDING FRAME [EXACT]: Shika frozen, UV purple lighting.";
        const nextPrompt =
          "Continue directly from the final frame of the previous clip: Shika frozen, warm amber lighting. [00:00]";

        const result = checkR7Handshake(currentPrompt, nextPrompt, {
          strictness: "verbatim",
          checkLighting: true,
        });

        expect(result.some((v) => v.evidence.includes("lighting"))).toBe(true);
      });
    });
  });

  describe("R8 - Short Extends", () => {
    describe("positive cases", () => {
      it("passes at 40 words for EXTEND", () => {
        // Crafted to be exactly 40 words
        const prompt =
          "Continue from previous Shika frozen strings taut camera pans smoothly energy builds festival lights pulse keep same UV lighting keep same character appearance keep same string positions audio synth pulse building no dialogue ending frame exact both puppets centered arms extended.";

        const result = checkR8ShortExtends(prompt, "EXTEND_MIDDLE", {
          imagePrompt: "Shika and Shilshul on stage.",
          startPrompt: "Shika performs.",
        });

        const budgetViolation = result.find((v) => v.evidence.includes("Word count"));
        expect(budgetViolation).toBeUndefined();
      });
    });

    describe("negative cases", () => {
      it("fails at 35 words (under budget)", () => {
        const prompt =
          "Continue from previous. [00:00] Shika moves. Camera pans. [00:04] Freeze. Keep same. ENDING FRAME [EXACT]: Done.";

        const result = checkR8ShortExtends(prompt, "EXTEND_MIDDLE", {
          imagePrompt: "Shika.",
          startPrompt: "Shika.",
        });

        expect(result.some((v) => v.evidence.includes("below"))).toBe(true);
      });

      it("fails when new character introduced", () => {
        const prompt =
          "Continue from previous: Shika frozen. [00:00] A new puppet named Zara appears from stage right. Camera pans. [00:04] Energy. ENDING FRAME [EXACT]: Zara visible.";

        const result = checkR8ShortExtends(prompt, "EXTEND_MIDDLE", {
          imagePrompt: "Shika and Shilshul on stage.",
          startPrompt: "Shika performs, Shilshul watches.",
        });

        expect(result.some((v) => v.evidence.includes("Zara"))).toBe(true);
      });
    });
  });

  describe("R9 - Retention Pacing", () => {
    describe("positive cases", () => {
      it("passes with 3s spacing and hook at 0s", () => {
        const prompt =
          "[00:00] [HOOK] Shika explodes! Camera dollies. [00:03] Shilshul joins. [00:06] Both sync. Audio: synth, no dialogue. ENDING FRAME [EXACT]: Pose.";

        const result = checkR9RetentionPacing(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });

      it("passes with 4s spacing (boundary)", () => {
        const prompt =
          "[00:00] [HOOK] Opening action. Camera pans. [00:04] Beat continues. [00:08] Final beat. ENDING FRAME [EXACT]: Done.";

        const result = checkR9RetentionPacing(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails with 5s gap", () => {
        const prompt =
          "[00:00] [HOOK] Shika starts. Camera tracks. [00:05] Second beat too late. ENDING FRAME [EXACT]: Done.";

        const result = checkR9RetentionPacing(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("5s");
      });

      it("fails when first beat not tagged as hook", () => {
        const prompt =
          "[00:00] Shika walks onto stage. Camera pans. [00:04] Action builds. ENDING FRAME [EXACT]: Standing.";

        const result = checkR9RetentionPacing(prompt, "VIDEO_START");

        expect(result.some((v) => v.evidence.includes("[HOOK]"))).toBe(true);
      });
    });
  });

  describe("R10 - Loop Closure (Conditional)", () => {
    describe("positive cases (loopMode=true)", () => {
      it("passes with both directives present", () => {
        const imagePrompt =
          "Grand stage. This frame serves as a loop anchor for seamless video looping.";
        const endPrompt =
          "[00:08] [DROP] Final pose mirrors the opening composition. ENDING FRAME [EXACT]: Loop complete.";

        const result = checkR10LoopClosure(imagePrompt, endPrompt, true);

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases (loopMode=true)", () => {
      it("fails when missing loop anchor in IMAGE", () => {
        const imagePrompt = "Grand stage. Standard composition.";
        const endPrompt = "[00:08] [DROP] Final pose mirrors opening. ENDING FRAME [EXACT]: Done.";

        const result = checkR10LoopClosure(imagePrompt, endPrompt, true);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("loop anchor");
      });
    });

    describe("skip scenarios (loopMode=false)", () => {
      it("passes without directives when loopMode=false", () => {
        const imagePrompt = "Grand stage. Standard setup.";
        const endPrompt = "[00:08] [DROP] Final pose. ENDING FRAME [EXACT]: Complete.";

        const result = checkR10LoopClosure(imagePrompt, endPrompt, false);

        expect(result.length).toBe(0);
      });
    });
  });

  describe("R11 - Audio Direction", () => {
    describe("positive cases", () => {
      it("passes with audio cue and no dialogue", () => {
        const prompt =
          "[00:00] Shika performs. Camera dollies. [00:04] Energy. Audio: crowd roar building, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR11AudioDirection(prompt, "VIDEO_START");

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails when missing audio cue", () => {
        const prompt =
          "[00:00] Shika performs. Camera dollies. [00:04] Energy. ENDING FRAME [EXACT]: Done.";

        const result = checkR11AudioDirection(prompt, "VIDEO_START");

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("audio");
      });

      it('fails when missing "no dialogue"', () => {
        const prompt =
          "[00:00] Shika dances. Camera pans. [00:04] Energy. Audio: crowd cheers. ENDING FRAME [EXACT]: Done.";

        const result = checkR11AudioDirection(prompt, "EXTEND_MIDDLE");

        expect(result.some((v) => v.evidence.includes("no dialogue"))).toBe(true);
      });
    });
  });

  describe("R12 - Drop Sync", () => {
    describe("positive cases", () => {
      it("passes with DROP tag in final beat", () => {
        const prompt =
          "Continue from previous. [00:00] Energy builds. [00:08] [DROP] Climactic moment! ENDING FRAME [EXACT]: Peak.";

        const result = checkR12DropSync(prompt, VALID_LYRICS, "EXTEND_END");

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails when END final beat missing DROP tag", () => {
        const prompt =
          "Continue from previous. [00:00] Energy builds. [00:08] Climactic moment without tag! ENDING FRAME [EXACT]: Peak.";

        const result = checkR12DropSync(prompt, VALID_LYRICS, "EXTEND_END");

        expect(result.some((v) => v.evidence.includes("[DROP]"))).toBe(true);
      });

      it("fails when lyrics missing chant", () => {
        const badLyrics = `[Intro]
Energy...

[Drop]
The bass explodes!

[Outro]
Fading...`;

        const prompt =
          "Continue. [00:08] [DROP] Climax! ENDING FRAME [EXACT]: Done.";

        const result = checkR12DropSync(prompt, badLyrics, "EXTEND_END");

        expect(result.some((v) => v.evidence.includes("chant"))).toBe(true);
      });
    });
  });

  describe("R13 - Character Locks", () => {
    describe("positive cases", () => {
      it("passes with verbatim locks in IMAGE", () => {
        const prompt = VALID_IMAGE_PROMPT;

        const result = checkR13CharacterLocks(prompt, "IMAGE", [
          "CRITICAL CHARACTER LOCK - SHIKA",
          "CRITICAL CHARACTER LOCK - SHILSHUL",
        ]);

        expect(result.length).toBe(0);
      });

      it("passes with preservation in VIDEO", () => {
        const prompt =
          "[00:00] Shika surges. Camera dollies. [00:04] Energy. Keep Shika and Shilshul identical to reference image throughout. Audio: crowd, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR13CharacterLocks(prompt, "VIDEO_START", []);

        expect(result.length).toBe(0);
      });
    });

    describe("negative cases", () => {
      it("fails when lock block missing", () => {
        const prompt =
          "Grand festival stage with UV purple lighting. Two puppets stand ready. Standard composition.";

        const result = checkR13CharacterLocks(prompt, "IMAGE", [
          "CRITICAL CHARACTER LOCK - SHIKA",
          "CRITICAL CHARACTER LOCK - SHILSHUL",
        ]);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].evidence).toContain("character lock");
      });

      it("fails when VIDEO missing preservation", () => {
        const prompt =
          "[00:00] Shika performs. Camera dollies. [00:04] Action. [00:08] Freeze. Audio: crowd, no dialogue. ENDING FRAME [EXACT]: Done.";

        const result = checkR13CharacterLocks(prompt, "VIDEO_START", []);

        // Should fail for missing preservation line
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("lintScene", () => {
    it("validates single scene independently", () => {
      const scene = createSceneWithPrompts(0, {
        imagePrompt: VALID_IMAGE_PROMPT,
        startPrompt: VALID_VIDEO_START_PROMPT,
        middlePrompt: VALID_EXTEND_MIDDLE_PROMPT,
        endPrompt: VALID_EXTEND_END_PROMPT,
        lyrics: VALID_LYRICS,
      });
      const config: RunConfig = { loopMode: true, languages: { hi: 3, ja: 2 }, batchSize: 5 };

      const violations = lintScene(scene, config, []);

      expect(Array.isArray(violations)).toBe(true);
    });

    it("tags violations with correct sceneIndex", () => {
      const scene = createSceneWithPrompts(3, {
        startPrompt: "Bad prompt without structure.",
      });
      const config: RunConfig = { loopMode: false, languages: { hi: 3, ja: 2 }, batchSize: 5 };

      const violations = lintScene(scene, config, []);

      for (const violation of violations) {
        expect(violation.sceneIndex).toBe(3);
      }
    });
  });
});
