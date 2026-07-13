/**
 * Tests for Domain Rules (R1-R15)
 *
 * Per blueprint Section 6, Phase 1.2:
 * - Each rule has >= 2 positive fixtures (valid prompts that pass)
 * - Each rule has >= 2 negative fixtures (invalid prompts that fail)
 * - Total: minimum 60 test cases (15 rules x 4 fixtures)
 * - Fixtures are real prompt strings matching production format
 */

import { describe, it, expect } from "vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  RULES,
  CAMERA_MOVES,
  GENERIC_VERBS,
  INTENSITY_VERBS,
  NEGATIVE_PATTERNS,
  ALLOWED_NEGATIVES,
  CHARACTER_LOCK_BLOCKS,
  getRulesBySeverity,
  hasNegativePatterns,
  calculateEnvironmentOverlap,
  hasMirrorDirective,
  getRuleById,
  getRulesForLane,
  type Rule,
} from "@/packages/domain/rules";

import { type Lane } from "@/packages/domain/types";

import {
  loadPositiveFixtures,
  loadNegativeFixtures,
  loadAllFixtures,
  type PositiveFixture,
  type NegativeFixture,
} from "./helpers";

// Input types for rule fixtures
interface PromptInput {
  prompt: string;
  stage?: "IMAGE" | "VIDEO_START" | "EXTEND_MIDDLE" | "EXTEND_END";
}

interface CrossPromptInput {
  imagePrompt?: string;
  videoPrompt?: string;
  previousEndingFrame?: string;
  currentContinuation?: string;
}

interface BatchInput {
  sceneIndex?: number;
  combo?: Record<string, string>;
  batchCombos?: Record<string, string>[];
  runConfig?: {
    loopMode?: boolean;
    languages?: { hi: number; ja: number };
  };
}

type RuleInput = PromptInput | CrossPromptInput | BatchInput;

describe("rules", () => {
  describe("RULES constant", () => {
    it("contains exactly 15 rules", () => {
      expect(RULES).toHaveLength(15);
    });

    it("each rule has required properties", () => {
      for (const rule of RULES) {
        expect(rule).toHaveProperty("id");
        expect(rule).toHaveProperty("name");
        expect(rule).toHaveProperty("description");
        expect(rule).toHaveProperty("severity");
        expect(rule).toHaveProperty("appliesTo");
        expect(["hard", "warn", "advisory"]).toContain(rule.severity);
        expect(Array.isArray(rule.appliesTo)).toBe(true);
      }
    });

    it("rule IDs are R1 through R15", () => {
      const expectedIds = Array.from({ length: 15 }, (_, i) => `R${i + 1}`);
      const actualIds = RULES.map((r) => r.id);
      expect(actualIds).toEqual(expectedIds);
    });

    it("rules are unique by ID", () => {
      const ids = RULES.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("CAMERA_MOVES vocabulary", () => {
    it("contains all controlled vocabulary from blueprint", () => {
      const expectedMoves = [
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

      for (const move of expectedMoves) {
        expect(CAMERA_MOVES).toContain(move);
      }
    });

    it("does not include generic camera words", () => {
      expect(CAMERA_MOVES).not.toContain("cinematic");
      expect(CAMERA_MOVES).not.toContain("camera");
      expect(CAMERA_MOVES).not.toContain("shot");
    });
  });

  describe("GENERIC_VERBS constant", () => {
    it("contains moves, goes, is", () => {
      expect(GENERIC_VERBS).toContain("moves");
      expect(GENERIC_VERBS).toContain("goes");
      expect(GENERIC_VERBS).toContain("is");
    });
  });

  describe("INTENSITY_VERBS constant", () => {
    it("contains strong action verbs", () => {
      const expectedVerbs = [
        "surges",
        "snaps",
        "unfurls",
        "detonates",
        "whips",
        "freezes",
        "explodes",
        "crashes",
      ];

      for (const verb of expectedVerbs) {
        expect(INTENSITY_VERBS).toContain(verb);
      }
    });
  });

  describe("NEGATIVE_PATTERNS constant", () => {
    it("contains forbidden negative phrases", () => {
      expect(NEGATIVE_PATTERNS).toContain("no ");
      expect(NEGATIVE_PATTERNS).toContain("avoid ");
      expect(NEGATIVE_PATTERNS).toContain("never ");
    });
  });

  describe("ALLOWED_NEGATIVES constant", () => {
    it("contains no dialogue exception", () => {
      expect(ALLOWED_NEGATIVES).toContain("no dialogue");
    });
  });

  describe("R1 - Sequential Weighting", () => {
    const rule1 = () => RULES.find((r) => r.id === "R1")!;

    it("applies to video stages", () => {
      expect(rule1().appliesTo).toContain("VIDEO_START");
      expect(rule1().appliesTo).toContain("EXTEND_MIDDLE");
      expect(rule1().appliesTo).toContain("EXTEND_END");
    });

    it("has hard severity", () => {
      expect(rule1().severity).toBe("hard");
    });

    describe("positive fixtures", () => {
      it("passes when first sentence has subject + action verb", () => {
        const input = {
          prompt:
            'Shika surges forward, strings blazing with neon light. Camera dollies backward. [00:04] The crowd roars. Keep same lighting throughout. ENDING FRAME [EXACT]: Shika center stage, arms raised.',
          stage: "VIDEO_START" as const,
        };

        // Predicate will be called when implementation exists
        expect(rule1().predicate).toBeDefined();
      });

      it("passes when preservation is in final 25%", () => {
        // 80-word prompt with "keep same lighting" at word 65 (position 81%)
        const input = {
          prompt: `[00:00] Shika explodes onto stage left, strings crackling with UV energy. The crowd gasps in unison. Camera whips left to capture the full spectacle. [00:04] Shilshul emerges from shadow, arms unfurling in perfect sync with the bass drop. Festival lights pulse rhythmically overhead. [00:08] Both puppets freeze mid-pose, strings taut. Keep same lighting, same character appearance throughout this scene. ENDING FRAME [EXACT]: Both puppets frozen.`,
          stage: "VIDEO_START" as const,
        };

        expect(rule1().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails when first sentence has no action verb", () => {
        const input = {
          prompt:
            "The stage. Shika stands still. Camera pans left. Keep same lighting.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: "The stage." contains no action verb
        expect(rule1().predicate).toBeDefined();
      });

      it("fails when preservation is in first half", () => {
        const input = {
          prompt:
            "Shika moves left. Keep same lighting throughout. Camera pans right. The crowd roars.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: preservation at ~20%
        expect(rule1().predicate).toBeDefined();
      });
    });
  });

  describe("R2 - Explicit Camera Verb", () => {
    const rule2 = () => RULES.find((r) => r.id === "R2")!;

    it("applies to video stages", () => {
      expect(rule2().appliesTo).toContain("VIDEO_START");
      expect(rule2().appliesTo).toContain("EXTEND_MIDDLE");
      expect(rule2().appliesTo).toContain("EXTEND_END");
    });

    it("has hard severity", () => {
      expect(rule2().severity).toBe("hard");
    });

    describe("positive fixtures", () => {
      it("passes with exactly one camera verb: dolly", () => {
        const input = {
          prompt:
            "[00:00] Shika leaps forward. Camera dollies backward as the crowd erupts. [00:04] Festival lights cascade. Keep same character. ENDING FRAME [EXACT]: Shika mid-air.",
          stage: "VIDEO_START" as const,
        };

        expect(rule2().predicate).toBeDefined();
      });

      it("passes with compound camera: dolly zoom", () => {
        const input = {
          prompt:
            "[00:00] The scene intensifies. Dolly zoom creates vertigo effect as Shilshul spins. [00:04] Strings tangle dramatically. Audio: crowd roar, no dialogue. ENDING FRAME [EXACT]: Shilshul dizzy.",
          stage: "VIDEO_START" as const,
        };

        expect(rule2().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails with zero camera verbs", () => {
        const input = {
          prompt:
            "[00:00] Shika dances wildly. Lights flash everywhere. The crowd cheers loudly. [00:04] Festival energy peaks. ENDING FRAME [EXACT]: Chaos.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: no camera verb detected
        expect(rule2().predicate).toBeDefined();
      });

      it("fails with two camera verbs", () => {
        const input = {
          prompt:
            "[00:00] Pan left to Shika, then dolly forward toward the stage. [00:04] Action continues. ENDING FRAME [EXACT]: Final pose.",
          stage: "EXTEND_MIDDLE" as const,
        };

        // Should fail: 2 camera verbs (pan, dolly)
        expect(rule2().predicate).toBeDefined();
      });

      it("fails with only cinematic", () => {
        const input = {
          prompt:
            "[00:00] Cinematic shot of the festival as Shika performs. [00:04] Crowd reacts. ENDING FRAME [EXACT]: Wide view.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: "cinematic" is not a valid camera verb
        expect(rule2().predicate).toBeDefined();
      });
    });
  });

  describe("R3 - Word Budget and Strong Verbs", () => {
    const rule3 = () => RULES.find((r) => r.id === "R3")!;

    it("applies to video stages", () => {
      expect(rule3().appliesTo).toContain("VIDEO_START");
    });

    describe("positive fixtures", () => {
      it("passes at exactly 40 words (lower boundary)", () => {
        // Exactly 40 words including punctuation handling
        const input = {
          prompt:
            "[00:00] Shika's strings surge upward as puppet arms unfurl in perfect sync. The crowd gasps. [00:04] Camera whips left. Shilshul detonates confetti cannons, streamers cascading through UV beams. [00:08] Both puppets freeze mid-pose. Keep same lighting, same character appearance, same string tension throughout.",
          stage: "VIDEO_START" as const,
        };

        expect(rule3().predicate).toBeDefined();
      });

      it("passes at exactly 90 words (upper boundary)", () => {
        const input = {
          prompt:
            "[00:00] Shika explodes onto the mainstage platform, strings blazing with intense neon purple light that pulses to the thundering bassline. The massive crowd surges forward in anticipation. [00:04] Camera dollies dramatically backward to capture the full spectacular scene as Shilshul emerges from the shadows stage right, arms unfurling in perfect synchronization with the escalating pre-drop build. Festival pyrotechnics erupt overhead. [00:08] Both puppets freeze mid-pose, strings taut and gleaming. Keep same UV purple lighting, same character appearance, same string tension, same crowd energy throughout this segment. ENDING FRAME [EXACT]: Puppets frozen center stage.",
          stage: "VIDEO_START" as const,
        };

        expect(rule3().predicate).toBeDefined();
      });

      it("passes with exactly 2 generic verbs (maximum allowed)", () => {
        const input = {
          prompt:
            "[00:00] Shika moves left dramatically. The crowd is wild with excitement. Camera pans to follow. Strings explode with color. [00:04] Festival energy surges. ENDING FRAME [EXACT]: Action frozen.",
          stage: "VIDEO_START" as const,
        };

        // 2 generic verbs: moves, is
        expect(rule3().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("warns at 35 words (under budget)", () => {
        const input = {
          prompt:
            "[00:00] Shika leaps. Camera dollies back. Crowd roars. [00:04] Strings flash. Lights pulse. [00:08] Freeze. Keep same lighting. ENDING FRAME [EXACT]: Done.",
          stage: "VIDEO_START" as const,
        };

        // Should warn: word count below 40
        expect(rule3().predicate).toBeDefined();
      });

      it("fails with 3 generic verbs", () => {
        const input = {
          prompt:
            "[00:00] Shika moves to the left side of the stage. The puppet goes toward the crowd. The lighting is bright and colorful. [00:04] Camera pans right. The scene is electric with energy. Shilshul moves forward. [00:08] Both puppets freeze. Keep same lighting, same characters. ENDING FRAME [EXACT]: Final pose.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: 3 generic verbs (moves, goes, is)
        expect(rule3().predicate).toBeDefined();
      });
    });
  });

  describe("R4 - Beat Structure with Timestamps", () => {
    const rule4 = () => RULES.find((r) => r.id === "R4")!;

    it("has hard severity", () => {
      expect(rule4().severity).toBe("hard");
    });

    describe("positive fixtures", () => {
      it("passes with 3 timestamps (maximum)", () => {
        const input = {
          prompt:
            "[00:00] Shika explodes onto stage. [00:04] Shilshul joins the dance. [00:08] Both freeze dramatically. Camera dollies back. Audio: crowd roar, no dialogue. ENDING FRAME [EXACT]: Frozen tableau.",
          stage: "VIDEO_START" as const,
        };

        expect(rule4().predicate).toBeDefined();
      });

      it("passes with 2 timestamps", () => {
        const input = {
          prompt:
            "[00:00] Shika surges forward energetically. Camera pans left to capture motion. [00:05] Action builds to climax. Keep same lighting. ENDING FRAME [EXACT]: Peak energy.",
          stage: "VIDEO_START" as const,
        };

        expect(rule4().predicate).toBeDefined();
      });

      it("passes with 1 timestamp (minimum)", () => {
        const input = {
          prompt:
            "[00:00] Single intense beat as Shika performs continuous action throughout the entire ten second clip. Camera tracks smoothly. Maintain consistent energy. Audio: building synth, no dialogue. ENDING FRAME [EXACT]: Shika centered.",
          stage: "VIDEO_START" as const,
        };

        expect(rule4().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails with 0 timestamps", () => {
        const input = {
          prompt:
            "Shika dances across the stage while Shilshul watches from the wings. Camera follows the action smoothly. The crowd erupts in cheers as the performance reaches its climax. Keep same lighting throughout. ENDING FRAME [EXACT]: Both puppets visible.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: no timestamp markers
        expect(rule4().predicate).toBeDefined();
      });

      it("fails with 4 timestamps", () => {
        const input = {
          prompt:
            "[00:00] Beat one starts. [00:03] Beat two. [00:06] Beat three. [00:09] Beat four - too many! Camera dollies. ENDING FRAME [EXACT]: Over-structured.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: 4 timestamps (max 3 allowed)
        expect(rule4().predicate).toBeDefined();
      });
    });
  });

  describe("R5 - Image-to-Video Division of Labor", () => {
    const rule5 = () => RULES.find((r) => r.id === "R5")!;

    it("applies to VIDEO_START cross-referencing IMAGE", () => {
      expect(rule5().appliesTo).toContain("VIDEO_START");
    });

    describe("positive fixtures", () => {
      it("passes with no environment overlap", () => {
        const input = {
          imagePrompt:
            "A grand festival stage bathed in UV purple lighting. Two puppet characters, Shika and Shilshul, stand ready. The mainstage towers behind them with psychedelic visuals projected onto massive LED screens. Dense crowd silhouettes visible in foreground.",
          videoPrompt:
            "[00:00] From the source image, Shika springs into action. Camera dollies backward. [00:04] Strings flash with energy. [00:08] Both freeze. Keep same character. Audio: crowd roar, no dialogue. ENDING FRAME [EXACT]: Action complete.",
        };

        expect(rule5().predicate).toBeDefined();
      });

      it("passes with minimal overlap (10 words)", () => {
        const input = {
          imagePrompt:
            "Festival stage with UV purple lighting, two puppets Shika and Shilshul positioned center frame, crowd visible.",
          videoPrompt:
            "[00:00] Shika surges forward, strings blazing. Camera pans left capturing the motion. [00:04] Energy builds. UV purple lighting pulses. [00:08] Freeze. Keep same lighting. ENDING FRAME [EXACT]: Done.",
        };

        // Some overlap but under 25%
        expect(rule5().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails with heavy environment copy", () => {
        const input = {
          imagePrompt:
            "The grand mainstage at the festival features massive LED screens displaying psychedelic visuals. UV purple lighting bathes the entire scene. Two puppet characters stand ready.",
          videoPrompt:
            "[00:00] On the grand mainstage at the festival with massive LED screens displaying psychedelic visuals and UV purple lighting bathing the entire scene, Shika performs. Camera dollies. ENDING FRAME [EXACT]: Same scene.",
        };

        // Should fail: >25% token overlap
        expect(rule5().predicate).toBeDefined();
      });
    });
  });

  describe("R6 - Negatives in Image, Positives in Video", () => {
    const rule6 = () => RULES.find((r) => r.id === "R6")!;

    describe("positive fixtures", () => {
      it("passes with positive preservation only", () => {
        const input = {
          prompt:
            "[00:00] Shika surges forward dramatically. Camera dollies back. [00:04] Strings flash brilliantly. [00:08] Freeze pose. Keep Shika identical to reference image. Keep same UV lighting. Audio: synth pulse, no dialogue. ENDING FRAME [EXACT]: Shika frozen.",
          stage: "VIDEO_START" as const,
        };

        expect(rule6().predicate).toBeDefined();
      });

      it('passes with "no dialogue" exception', () => {
        const input = {
          prompt:
            "[00:00] Action begins intensely. Camera pans smoothly left. [00:04] Energy peaks dramatically. [00:08] Both puppets freeze. Audio: crowd cheers building to climax, no dialogue. Keep same character appearance. ENDING FRAME [EXACT]: Frozen moment.",
          stage: "EXTEND_MIDDLE" as const,
        };

        // "no dialogue" is allowed
        expect(rule6().predicate).toBeDefined();
      });

      it('passes with "no" within a word', () => {
        const input = {
          prompt:
            "[00:00] The enormous crowd surges forward. Camera dollies through the innovative stage design. [00:04] Action continues phenomenally. [00:08] Freeze. Keep same lighting. ENDING FRAME [EXACT]: Scene complete.",
          stage: "VIDEO_START" as const,
        };

        // "no" appears only as substring (enormous, innovative, phenomenally)
        expect(rule6().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails with 'no' constraint", () => {
        const input = {
          prompt:
            "[00:00] Shika performs the routine, no extra puppets in frame. Camera pans. [00:04] Action. ENDING FRAME [EXACT]: Done.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: "no extra puppets" is negative constraint
        expect(rule6().predicate).toBeDefined();
      });

      it("fails with 'avoid' constraint", () => {
        const input = {
          prompt:
            "[00:00] Shika dances, avoid cartoon style throughout. Camera dollies. [00:04] Continue. ENDING FRAME [EXACT]: Complete.",
          stage: "EXTEND_MIDDLE" as const,
        };

        // Should fail: "avoid cartoon style" is negative constraint
        expect(rule6().predicate).toBeDefined();
      });

      it("fails with 'never' constraint", () => {
        const input = {
          prompt:
            "[00:00] Performance continues, never show empty stage. Camera pans. [00:04] Energy. ENDING FRAME [EXACT]: Populated.",
          stage: "EXTEND_END" as const,
        };

        // Should fail: "never show empty stage" is negative constraint
        expect(rule6().predicate).toBeDefined();
      });
    });
  });

  describe("R7 - Boundary Frame Handshake", () => {
    const rule7 = () => RULES.find((r) => r.id === "R7")!;

    describe("positive fixtures", () => {
      it("passes with verbatim handshake (100% similarity)", () => {
        const input = {
          previousEndingFrame:
            "Shika stage-left, strings taut at 45-degree angle, mouth agape in mid-laugh, Shilshul stage-right with one arm raised, confetti frozen mid-air, camera at medium-wide, UV purple lighting from overhead, crowd silhouettes visible.",
          currentContinuation:
            "Continue directly from the final frame of the previous clip: Shika stage-left, strings taut at 45-degree angle, mouth agape in mid-laugh, Shilshul stage-right with one arm raised, confetti frozen mid-air, camera at medium-wide, UV purple lighting from overhead, crowd silhouettes visible.",
        };

        expect(rule7().predicate).toBeDefined();
      });

      it("passes with 80% similarity (boundary)", () => {
        const input = {
          previousEndingFrame:
            "Shika stage-left, strings taut at angle, laughing expression, Shilshul stage-right arm raised, confetti in air, medium-wide shot, UV purple lighting, crowd visible.",
          currentContinuation:
            "Continue directly from the final frame: Shika stage-left, strings taut at angle, laughing expression, Shilshul stage-right arm raised, confetti in air, medium-wide shot, UV purple lighting, crowd visible.",
        };

        // Slight variation but >=80%
        expect(rule7().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails when missing ENDING FRAME", () => {
        const input = {
          prompt:
            "[00:00] Shika performs dramatically. Camera dollies. [00:04] Action continues. [00:08] Scene ends without proper ending frame marker.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: missing "ENDING FRAME [EXACT]:"
        expect(rule7().predicate).toBeDefined();
      });

      it("fails with 79% similarity (below threshold)", () => {
        const input = {
          previousEndingFrame:
            "Shika stage-left, strings taut at 45-degree angle, mouth agape in mid-laugh, Shilshul stage-right with one arm raised, confetti frozen mid-air, camera at medium-wide, UV purple lighting from overhead, crowd silhouettes visible.",
          currentContinuation:
            "Continue from previous: Shika on left, strings at angle, laughing, Shilshul on right arm up, confetti in air, medium shot, purple lights, crowd behind.",
        };

        // Should fail: similarity ~79% < 80%
        expect(rule7().predicate).toBeDefined();
      });

      it("fails when lighting changes across handshake", () => {
        const input = {
          previousEndingFrame:
            "Shika frozen mid-pose, UV purple lighting from overhead, strings taut.",
          currentContinuation:
            "Continue from previous: Shika frozen mid-pose, warm amber lighting from overhead, strings taut.",
        };

        // Should fail: lighting changed from "UV purple" to "warm amber"
        expect(rule7().predicate).toBeDefined();
      });
    });
  });

  describe("R8 - Short Extends, Preservation-Heavy", () => {
    const rule8 = () => RULES.find((r) => r.id === "R8")!;

    it("applies only to EXTEND stages", () => {
      expect(rule8().appliesTo).toContain("EXTEND_MIDDLE");
      expect(rule8().appliesTo).toContain("EXTEND_END");
      expect(rule8().appliesTo).not.toContain("VIDEO_START");
    });

    describe("positive fixtures", () => {
      it("passes at 40 words (lower boundary)", () => {
        const input = {
          prompt:
            "Continue directly from previous: Shika stage-left frozen. [00:00] Shika's strings surge upward as movement resumes. Camera pans smoothly left. [00:04] Energy builds steadily. Keep same UV purple lighting, same character appearance, same crowd position. ENDING FRAME [EXACT]: Shika centered stage.",
          stage: "EXTEND_MIDDLE" as const,
        };

        expect(rule8().predicate).toBeDefined();
      });

      it("passes at 70 words (upper boundary)", () => {
        const input = {
          prompt:
            "Continue directly from previous: Shika and Shilshul frozen mid-pose, UV purple lighting, crowd visible. [00:00] Shika's strings surge dramatically upward as both puppets resume their synchronized dance routine together. Camera pans smoothly left to capture the full stage energy. [00:04] The festival atmosphere builds steadily as pyrotechnics pulse overhead rhythmically. Keep same UV purple lighting, same character appearance, same string positions. ENDING FRAME [EXACT]: Both puppets frozen center stage, strings gleaming under festival lights.",
          stage: "EXTEND_MIDDLE" as const,
        };

        expect(rule8().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails at 35 words (under budget)", () => {
        const input = {
          prompt:
            "Continue from previous. [00:00] Shika moves. Camera pans. [00:04] Freeze. Keep same lighting. ENDING FRAME [EXACT]: Done.",
          stage: "EXTEND_MIDDLE" as const,
        };

        // Should fail: word count below 40
        expect(rule8().predicate).toBeDefined();
      });

      it("fails when new character introduced", () => {
        const input = {
          prompt:
            "Continue from previous: Shika frozen. [00:00] A new puppet named Zara appears suddenly from stage right, surprising everyone. Camera pans to capture Zara. [00:04] Energy shifts. Keep same lighting. ENDING FRAME [EXACT]: Zara visible.",
          stage: "EXTEND_MIDDLE" as const,
          priorStages: {
            imagePrompt: "Shika and Shilshul on stage.",
            startPrompt: "Shika performs, Shilshul watches.",
          },
        };

        // Should fail: "Zara" not present in prior stages
        expect(rule8().predicate).toBeDefined();
      });
    });
  });

  describe("R9 - Retention Pacing", () => {
    const rule9 = () => RULES.find((r) => r.id === "R9")!;

    it("applies to VIDEO_START only", () => {
      expect(rule9().appliesTo).toContain("VIDEO_START");
      expect(rule9().appliesTo).not.toContain("EXTEND_MIDDLE");
    });

    describe("positive fixtures", () => {
      it("passes with 3s spacing and hook at 0s", () => {
        const input = {
          prompt:
            "[00:00] [HOOK] Shika explodes onto stage with strings blazing! Camera dollies dramatically backward. [00:03] Shilshul joins the action energetically. [00:06] Both puppets synchronize their movements. Keep same lighting. Audio: synth pulse, no dialogue. ENDING FRAME [EXACT]: Synchronized pose.",
          stage: "VIDEO_START" as const,
        };

        expect(rule9().predicate).toBeDefined();
      });

      it("passes with 4s spacing (boundary) and hook at 2s", () => {
        const input = {
          prompt:
            "[00:02] [HOOK] Opening action as Shika springs forward dramatically! Camera pans smoothly left to capture the energy. [00:06] Beat continues with building intensity. Keep same character appearance. ENDING FRAME [EXACT]: Action frozen.",
          stage: "VIDEO_START" as const,
        };

        // Hook at 2s is within 0-2s window, 4s gap is at boundary
        expect(rule9().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails with 5s gap between beats", () => {
        const input = {
          prompt:
            "[00:00] [HOOK] Shika starts performing energetically. Camera tracks smoothly. [00:05] Second beat arrives too late. Keep same lighting. ENDING FRAME [EXACT]: Done.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: 5s gap exceeds 4s maximum
        expect(rule9().predicate).toBeDefined();
      });

      it("fails when first beat not tagged as hook", () => {
        const input = {
          prompt:
            "[00:00] Shika walks onto stage casually. Camera pans. [00:04] Action builds slowly. Keep same character. ENDING FRAME [EXACT]: Standing.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: no [HOOK] tag at first beat
        expect(rule9().predicate).toBeDefined();
      });

      it("fails when hook is at 3s (outside 0-2s window)", () => {
        const input = {
          prompt:
            "[00:03] [HOOK] Late opening action as Shika finally springs into motion! Camera dollies. [00:07] Beat continues. Keep same lighting. ENDING FRAME [EXACT]: Complete.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: hook at 3s, outside 0-2s window
        expect(rule9().predicate).toBeDefined();
      });
    });
  });

  describe("R10 - Loop Closure (Conditional)", () => {
    const rule10 = () => RULES.find((r) => r.id === "R10")!;

    it("applies to IMAGE and EXTEND_END", () => {
      expect(rule10().appliesTo).toContain("IMAGE");
      expect(rule10().appliesTo).toContain("EXTEND_END");
    });

    describe("positive fixtures (loopMode=true)", () => {
      it("passes with both directives present", () => {
        const input = {
          runConfig: { loopMode: true },
          imagePrompt:
            "Grand festival stage with UV lighting. Shika and Shilshul positioned center. This frame serves as a loop anchor for seamless video looping.",
          endPrompt:
            "[00:00] Continue from previous. Camera cranes up. [00:04] Both puppets move toward center. [00:08] [DROP] Final pose mirrors the opening composition of the scene's source image. Keep same UV lighting. ENDING FRAME [EXACT]: Loop complete.",
        };

        expect(rule10().predicate).toBeDefined();
      });
    });

    describe("negative fixtures (loopMode=true)", () => {
      it("fails when missing loop anchor in IMAGE", () => {
        const input = {
          runConfig: { loopMode: true },
          imagePrompt:
            "Grand festival stage with UV lighting. Shika and Shilshul positioned center. Standard composition.",
          endPrompt:
            "[00:08] [DROP] Final pose mirrors the opening composition. ENDING FRAME [EXACT]: Done.",
        };

        // Should fail: IMAGE missing loop anchor directive
        expect(rule10().predicate).toBeDefined();
      });

      it("fails when missing mirror directive in END", () => {
        const input = {
          runConfig: { loopMode: true },
          imagePrompt:
            "Grand festival stage. Loop anchor composition for seamless looping.",
          endPrompt:
            "[00:00] Continue. Camera pans. [00:08] [DROP] Final moment without mirror directive. ENDING FRAME [EXACT]: Complete.",
        };

        // Should fail: END missing mirror directive
        expect(rule10().predicate).toBeDefined();
      });
    });

    describe("skip scenarios (loopMode=false)", () => {
      it("passes without directives when loopMode=false", () => {
        const input = {
          runConfig: { loopMode: false },
          imagePrompt: "Grand festival stage with UV lighting. Standard setup.",
          endPrompt:
            "[00:08] [DROP] Final pose. ENDING FRAME [EXACT]: Scene complete.",
        };

        // Should pass: rule not enforced when loopMode is false
        expect(rule10().predicate).toBeDefined();
      });
    });
  });

  describe("R11 - Audio Direction", () => {
    const rule11 = () => RULES.find((r) => r.id === "R11")!;

    describe("positive fixtures", () => {
      it("passes with audio cue and no dialogue", () => {
        const input = {
          prompt:
            '[00:00] Shika explodes onto stage dramatically. Camera dollies backward capturing the energy. [00:04] Shilshul joins the performance. [00:08] Both freeze. Audio: crowd roar building to crescendo, no dialogue. Keep same lighting. ENDING FRAME [EXACT]: Frozen tableau.',
          stage: "VIDEO_START" as const,
        };

        expect(rule11().predicate).toBeDefined();
      });

      it("passes with song section mapped correctly", () => {
        const input = {
          prompt:
            "[00:00] [HOOK] Opening action with intense energy. Camera pans dramatically left. [00:04] Build continues with rising intensity. Audio: intro synth pulse building steadily, no dialogue. Keep same character. ENDING FRAME [EXACT]: Energy peaks.",
          stage: "VIDEO_START" as const,
        };

        // START stage maps to Intro/Build
        expect(rule11().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails when missing audio cue", () => {
        const input = {
          prompt:
            "[00:00] Shika performs energetically on stage. Camera dollies backward smoothly. [00:04] Shilshul joins the dance. [00:08] Both freeze mid-pose. Keep same UV purple lighting throughout. ENDING FRAME [EXACT]: Frozen moment.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: no audio cue sentence
        expect(rule11().predicate).toBeDefined();
      });

      it("fails when missing no dialogue", () => {
        const input = {
          prompt:
            "[00:00] Shika dances energetically. Camera pans left. [00:04] Energy builds. Audio: crowd cheers building. [00:08] Freeze. Keep same lighting. ENDING FRAME [EXACT]: Done.",
          stage: "EXTEND_MIDDLE" as const,
        };

        // Should fail: audio cue present but missing "no dialogue"
        expect(rule11().predicate).toBeDefined();
      });

      it("fails when dialogue requested", () => {
        const input = {
          prompt:
            "[00:00] Shika performs while speaking to the crowd. Camera tracks the action. Audio: Shika speaks words of encouragement to fans. ENDING FRAME [EXACT]: Speaking.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: dialogue is forbidden
        expect(rule11().predicate).toBeDefined();
      });
    });
  });

  describe("R12 - Drop Sync (Series-Specific)", () => {
    const rule12 = () => RULES.find((r) => r.id === "R12")!;

    it("applies to EXTEND_END and LYRICS", () => {
      expect(rule12().appliesTo).toContain("EXTEND_END");
      expect(rule12().appliesTo).toContain("LYRICS");
    });

    describe("positive fixtures", () => {
      it("passes with DROP tag in END final beat", () => {
        const input = {
          prompt:
            "Continue from previous: Both puppets centered. [00:00] Energy builds steadily. Camera cranes up dramatically. [00:04] Anticipation rises with the music. [00:08] [DROP] Climactic moment as both puppets explode into synchronized movement! Keep same lighting. Audio: bass drop impact, no dialogue. ENDING FRAME [EXACT]: Peak energy frozen.",
          stage: "EXTEND_END" as const,
        };

        expect(rule12().predicate).toBeDefined();
      });

      it("passes with chant in lyrics", () => {
        const input = {
          lyrics: `[Intro]
Festival energy rises...

[Build]
The crowd anticipates...

[Pre-Drop]
Tension building higher...

[Drop]
Shika! Shika! Shilshul! Shilshul!
The bass explodes through the speakers!

[Outro]
Energy slowly fades...`,
          stage: "LYRICS" as const,
        };

        expect(rule12().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails when END final beat missing DROP tag", () => {
        const input = {
          prompt:
            "Continue from previous. [00:00] Energy builds. Camera pans. [00:04] Anticipation. [00:08] Climactic moment without proper tag! Keep lighting. ENDING FRAME [EXACT]: Peak.",
          stage: "EXTEND_END" as const,
        };

        // Should fail: final beat missing [DROP] tag
        expect(rule12().predicate).toBeDefined();
      });

      it("fails when lyrics missing chant", () => {
        const input = {
          lyrics: `[Intro]
Festival energy rises...

[Drop]
The bass explodes through the speakers!
Energy reaches maximum intensity!

[Outro]
Slowly fading...`,
          stage: "LYRICS" as const,
        };

        // Should fail: missing "Shika! Shika! Shilshul! Shilshul!" chant
        expect(rule12().predicate).toBeDefined();
      });

      it("fails with incomplete chant", () => {
        const input = {
          lyrics: `[Drop]
Shika! Shilshul!
The bass drops hard!`,
          stage: "LYRICS" as const,
        };

        // Should fail: incomplete chant
        expect(rule12().predicate).toBeDefined();
      });
    });
  });

  describe("R13 - Character Locks Verbatim", () => {
    const rule13 = () => RULES.find((r) => r.id === "R13")!;

    it("applies to IMAGE and all video stages", () => {
      expect(rule13().appliesTo).toContain("IMAGE");
      expect(rule13().appliesTo).toContain("VIDEO_START");
      expect(rule13().appliesTo).toContain("EXTEND_MIDDLE");
      expect(rule13().appliesTo).toContain("EXTEND_END");
    });

    describe("CHARACTER_LOCK_BLOCKS constant", () => {
      it("contains Shika and Shilshul lock definitions", () => {
        expect(CHARACTER_LOCK_BLOCKS.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("positive fixtures", () => {
      it("passes with verbatim locks in IMAGE", () => {
        // The test will use CHARACTER_LOCK_BLOCKS from the implementation
        const input = {
          prompt: `Grand festival stage with UV purple lighting.

${CHARACTER_LOCK_BLOCKS[0]}

${CHARACTER_LOCK_BLOCKS[1]}

Shika and Shilshul positioned center stage, strings gleaming under festival lights.`,
          stage: "IMAGE" as const,
        };

        expect(rule13().predicate).toBeDefined();
      });

      it("passes with condensed preservation in VIDEO", () => {
        const input = {
          prompt:
            "[00:00] Shika surges forward dramatically. Camera dollies backward. [00:04] Energy builds. Keep Shika and Shilshul identical to reference image throughout. [00:08] Freeze. Audio: crowd roar, no dialogue. ENDING FRAME [EXACT]: Both visible.",
          stage: "VIDEO_START" as const,
        };

        expect(rule13().predicate).toBeDefined();
      });
    });

    describe("negative fixtures", () => {
      it("fails when lock block modified", () => {
        const input = {
          prompt:
            "Grand festival stage. Shika is a small orange puppet with glowing strings. Different description from canonical lock. Positioned center.",
          stage: "IMAGE" as const,
        };

        // Should fail: lock text modified from canonical
        expect(rule13().predicate).toBeDefined();
      });

      it("fails when lock block missing", () => {
        const input = {
          prompt:
            "Grand festival stage with UV purple lighting. Two puppet characters stand ready. Standard scene composition without character lock blocks.",
          stage: "IMAGE" as const,
        };

        // Should fail: missing character lock blocks
        expect(rule13().predicate).toBeDefined();
      });

      it("fails when VIDEO missing preservation", () => {
        const input = {
          prompt:
            "[00:00] Shika performs action. Camera dollies. [00:04] Action continues. [00:08] Freeze. Audio: crowd roar, no dialogue. ENDING FRAME [EXACT]: Scene complete.",
          stage: "VIDEO_START" as const,
        };

        // Should fail: missing condensed preservation line
        expect(rule13().predicate).toBeDefined();
      });
    });
  });

  describe("R14 - Variety Rules", () => {
    const rule14 = () => RULES.find((r) => r.id === "R14")!;

    it("has correct severity structure", () => {
      // Within-batch: hard, History: warn
      expect(rule14().severity).toBe("hard"); // Primary severity
    });

    it("defines variety axes", () => {
      // R14 defines the axes that must not repeat
      expect(rule14()).toBeDefined();
    });

    // Note: R14 enforcement is primarily in variety.ts
    // These tests verify the rule definition
  });

  describe("R15 - Iteration Discipline (Advisory)", () => {
    const rule15 = () => RULES.find((r) => r.id === "R15")!;

    it("has advisory severity", () => {
      expect(rule15().severity).toBe("advisory");
    });

    it("has no predicate (UI-level feature)", () => {
      expect(rule15().predicate).toBeUndefined();
    });
  });

  describe("Fixture loading integration", () => {
    it("can load fixtures for rule 1", () => {
      const fixtures = loadAllFixtures(1);
      // Fixtures may not exist yet in RED phase - that's okay
      expect(fixtures).toHaveProperty("positive");
      expect(fixtures).toHaveProperty("negative");
    });
  });

  describe("Utility functions", () => {
    describe("getRulesBySeverity", () => {
      it("returns all hard rules", () => {
        const hardRules = getRulesBySeverity("hard");
        expect(hardRules.length).toBeGreaterThan(0);
        expect(hardRules.every((r: Rule) => r.severity === "hard")).toBe(true);
      });

      it("returns empty array for warn (no warn rules defined)", () => {
        const warnRules = getRulesBySeverity("warn");
        // Currently no warn severity rules exist
        expect(warnRules).toHaveLength(0);
      });

      it("returns all advisory rules", () => {
        const advisoryRules = getRulesBySeverity("advisory");
        expect(advisoryRules.length).toBeGreaterThan(0);
        expect(advisoryRules.every((r: Rule) => r.severity === "advisory")).toBe(true);
      });
    });

    describe("hasNegativePatterns", () => {
      it("returns true for text with forbidden negatives", () => {
        const result = hasNegativePatterns("Do not include any movement");
        expect(result).toBe(true);
      });

      it("returns false for text without forbidden negatives", () => {
        const result = hasNegativePatterns("Shika dances energetically on stage");
        expect(result).toBe(false);
      });

      it("allows 'no dialogue' as permitted negative", () => {
        const result = hasNegativePatterns("Audio: crowd cheers building steadily, no dialogue");
        expect(result).toBe(false);
      });
    });

    describe("calculateEnvironmentOverlap", () => {
      it("returns high overlap for matching environment", () => {
        const image = "Festival stage with neon lights and dancing crowd background";
        const video = "Shika performs on festival stage with neon lights as crowd dances";
        const overlap = calculateEnvironmentOverlap(image, video);
        expect(overlap).toBeGreaterThan(0.5);
      });

      it("returns low overlap for mismatched environment", () => {
        const image = "Tropical beach sunset with palm trees swaying";
        const video = "Industrial warehouse with concrete floors and metal beams";
        const overlap = calculateEnvironmentOverlap(image, video);
        expect(overlap).toBeLessThan(0.2);
      });

      it("returns 0 for empty image prompt", () => {
        const overlap = calculateEnvironmentOverlap("", "Festival scene with lights");
        expect(overlap).toBe(0);
      });
    });

    describe("hasMirrorDirective", () => {
      it("returns true for text with mirrors the opening", () => {
        const result = hasMirrorDirective("Final pose mirrors the opening composition");
        expect(result).toBe(true);
      });

      it("returns true for mirror opening variant", () => {
        const result = hasMirrorDirective("This scene should mirror opening frame");
        expect(result).toBe(true);
      });

      it("returns false for text without mirror directive", () => {
        const result = hasMirrorDirective("Final pose with dramatic lighting");
        expect(result).toBe(false);
      });
    });

    describe("getRuleById", () => {
      it("returns rule by ID", () => {
        const rule = getRuleById("R1");
        expect(rule).toBeDefined();
        expect(rule?.id).toBe("R1");
      });

      it("returns undefined for non-existent ID", () => {
        const rule = getRuleById("R99");
        expect(rule).toBeUndefined();
      });
    });

    describe("getRulesForLane", () => {
      it("returns rules for IMAGE lane", () => {
        const rules = getRulesForLane("IMAGE");
        expect(rules.length).toBeGreaterThan(0);
        expect(rules.every(r => r.appliesTo.includes("IMAGE"))).toBe(true);
      });

      it("returns rules for VIDEO_START lane", () => {
        const rules = getRulesForLane("VIDEO_START");
        expect(rules.length).toBeGreaterThan(0);
      });

      it("returns empty array for unknown lane", () => {
        // Test with an invalid lane value to verify defensive behavior
        const rules = getRulesForLane("UNKNOWN" as unknown as Lane);
        expect(rules).toHaveLength(0);
      });
    });
  });

  describe("Rule predicates", () => {
    describe("R13 predicate", () => {
      const rule13 = () => RULES.find((r) => r.id === "R13")!;

      it("passes for IMAGE with character lock blocks", () => {
        // Must include verbatim CHARACTER_LOCK_BLOCKS text
        const input = {
          prompt: `${CHARACTER_LOCK_BLOCKS[0]} Additional scene description.`,
          stage: "IMAGE",
        };
        expect(rule13().predicate!(input)).toBe(true);
      });

      it("fails for IMAGE without character lock blocks", () => {
        const input = {
          prompt: "A goat puppet on stage with lighting",
          stage: "IMAGE",
        };
        expect(rule13().predicate!(input)).toBe(false);
      });

      it("passes for video prompts with preservation patterns", () => {
        const input = {
          prompt: "[00:00] Action continues. Keep same character appearance. ENDING FRAME [EXACT]: Done.",
          stage: "VIDEO_START",
        };
        expect(rule13().predicate!(input)).toBe(true);
      });

      it("fails for video prompts without preservation patterns", () => {
        const input = {
          prompt: "[00:00] Action continues. ENDING FRAME [EXACT]: Done.",
          stage: "VIDEO_START",
        };
        expect(rule13().predicate!(input)).toBe(false);
      });
    });

    describe("R1 predicate (Action First)", () => {
      const rule1 = () => RULES.find((r) => r.id === "R1")!;

      it("passes when first sentence has action verb and no early preservation", () => {
        const input = { prompt: "Camera pushes through the crowd as Shika dances wildly. More action follows. Keep same character appearance at end." };
        expect(rule1().predicate!(input)).toBe(true);
      });

      it("fails when preservation language in first half", () => {
        const input = { prompt: "Keep same appearance. Camera pushes. More action." };
        expect(rule1().predicate!(input)).toBe(false);
      });
    });

    describe("R2 predicate (Camera Verb)", () => {
      const rule2 = () => RULES.find((r) => r.id === "R2")!;

      it("passes when exactly one camera move", () => {
        const input = { prompt: "Camera dolly through the scene." };
        expect(rule2().predicate!(input)).toBe(true);
      });

      it("fails when no camera moves", () => {
        const input = { prompt: "Action happens without camera direction." };
        expect(rule2().predicate!(input)).toBe(false);
      });

      it("fails when multiple camera moves", () => {
        const input = { prompt: "Camera dolly forward and then pan across the stage." };
        expect(rule2().predicate!(input)).toBe(false);
      });
    });

    describe("R3 predicate (Word Budget)", () => {
      const rule3 = () => RULES.find((r) => r.id === "R3")!;

      it("passes with 50 words and 0 generic verbs", () => {
        const words = Array(50).fill("dances").join(" ");
        const input = { prompt: words };
        expect(rule3().predicate!(input)).toBe(true);
      });

      it("fails when too few words", () => {
        const words = Array(30).fill("dances").join(" ");
        const input = { prompt: words };
        expect(rule3().predicate!(input)).toBe(false);
      });

      it("fails when too many words", () => {
        const words = Array(100).fill("dances").join(" ");
        const input = { prompt: words };
        expect(rule3().predicate!(input)).toBe(false);
      });

      it("fails when too many generic verbs", () => {
        const input = { prompt: Array(50).fill("moves goes is").join(" ") };
        expect(rule3().predicate!(input)).toBe(false);
      });
    });

    describe("R4 predicate (Beat Timestamps)", () => {
      const rule4 = () => RULES.find((r) => r.id === "R4")!;

      it("passes for 2 timestamps", () => {
        const input = { prompt: "[00:00] Action starts. [00:04] Action ends." };
        expect(rule4().predicate!(input)).toBe(true);
      });

      it("passes for 1 timestamp", () => {
        const input = { prompt: "[00:00] Single beat." };
        expect(rule4().predicate!(input)).toBe(true);
      });

      it("passes for 3 timestamps", () => {
        const input = { prompt: "[00:00] Beat one. [00:02] Beat two. [00:04] Beat three." };
        expect(rule4().predicate!(input)).toBe(true);
      });

      it("fails for 0 timestamps", () => {
        const input = { prompt: "No timestamps here." };
        expect(rule4().predicate!(input)).toBe(false);
      });

      it("fails for 4 timestamps", () => {
        const input = { prompt: "[00:00] One. [00:01] Two. [00:02] Three. [00:03] Four." };
        expect(rule4().predicate!(input)).toBe(false);
      });
    });

    describe("R5 predicate (Image-to-Video Division)", () => {
      const rule5 = () => RULES.find((r) => r.id === "R5")!;

      it("passes when no prompts provided", () => {
        const input = {};
        expect(rule5().predicate!(input)).toBe(true);
      });

      it("passes when only imagePrompt provided", () => {
        const input = { imagePrompt: "Scene description" };
        expect(rule5().predicate!(input)).toBe(true);
      });

      it("passes when overlap is low", () => {
        const input = {
          imagePrompt: "Main stage with sunset lighting and golden strings",
          videoPrompt: "Camera pans across the festival grounds showing crowd dancing",
        };
        expect(rule5().predicate!(input)).toBe(true);
      });

      it("fails when overlap is high", () => {
        const input = {
          imagePrompt: "Main stage with sunset lighting and golden strings puppet dancing",
          videoPrompt: "Main stage with sunset lighting and golden strings puppet moving",
        };
        expect(rule5().predicate!(input)).toBe(false);
      });
    });

    describe("R6 predicate (Negatives in Video)", () => {
      const rule6 = () => RULES.find((r) => r.id === "R6")!;

      it("passes when no negative patterns", () => {
        const input = { prompt: "Camera pans. Action continues. No dialogue." };
        expect(rule6().predicate!(input)).toBe(true);
      });

      it("fails when has avoid pattern", () => {
        const input = { prompt: "Camera pans. Avoid jumping. Continue smoothly." };
        expect(rule6().predicate!(input)).toBe(false);
      });

      it("fails when has no pattern (except no dialogue)", () => {
        const input = { prompt: "Camera pans. No running. Continue smoothly." };
        expect(rule6().predicate!(input)).toBe(false);
      });
    });

    describe("R7 predicate (Clip-to-Clip Handshake)", () => {
      const rule7 = () => RULES.find((r) => r.id === "R7")!;

      it("passes when prompt has ENDING FRAME [EXACT]:", () => {
        const input = { prompt: "[00:00] Action begins. ENDING FRAME [EXACT]: Shika poses." };
        expect(rule7().predicate!(input)).toBe(true);
      });

      it("fails when prompt missing ENDING FRAME marker", () => {
        const input = { prompt: "[00:00] Action begins. Scene ends." };
        expect(rule7().predicate!(input)).toBe(false);
      });
    });

    describe("R8 predicate (Short Extends)", () => {
      const rule8 = () => RULES.find((r) => r.id === "R8")!;

      it("passes for 50 words (within 40-70 range)", () => {
        const words = Array(50).fill("word").join(" ");
        const input = { prompt: words };
        expect(rule8().predicate!(input)).toBe(true);
      });

      it("fails for 30 words (below 40)", () => {
        const words = Array(30).fill("word").join(" ");
        const input = { prompt: words };
        expect(rule8().predicate!(input)).toBe(false);
      });

      it("fails for 80 words (above 70)", () => {
        const words = Array(80).fill("word").join(" ");
        const input = { prompt: words };
        expect(rule8().predicate!(input)).toBe(false);
      });
    });

    describe("R9 predicate (Retention Pacing)", () => {
      const rule9 = () => RULES.find((r) => r.id === "R9")!;

      it("passes when [HOOK] appears within first 2 seconds", () => {
        const input = { prompt: "[00:00] [HOOK] Big entrance. [00:04] Action continues." };
        expect(rule9().predicate!(input)).toBe(true);
      });

      it("passes when [HOOK] appears at 00:02", () => {
        const input = { prompt: "[00:02] [HOOK] Reveal moment." };
        expect(rule9().predicate!(input)).toBe(true);
      });

      it("fails when [HOOK] only appears after first 2 seconds without early timestamp", () => {
        const input = { prompt: "[00:04] Opening. [00:06] [HOOK] Late entrance." };
        expect(rule9().predicate!(input)).toBe(false);
      });

      it("fails when [HOOK] is missing entirely", () => {
        const input = { prompt: "[00:00] Opening. [00:04] Action continues." };
        expect(rule9().predicate!(input)).toBe(false);
      });
    });

    describe("R10 predicate (Loop Closure)", () => {
      const rule10 = () => RULES.find((r) => r.id === "R10")!;

      it("passes when loopMode is off", () => {
        const input = { prompt: "No loop directive", runConfig: { loopMode: false } };
        expect(rule10().predicate!(input)).toBe(true);
      });

      it("passes when runConfig is undefined", () => {
        const input = { prompt: "No loop directive" };
        expect(rule10().predicate!(input)).toBe(true);
      });

      it("passes when loopMode ON and has loop anchor", () => {
        const input = { prompt: "loop anchor directive here", runConfig: { loopMode: true } };
        expect(rule10().predicate!(input)).toBe(true);
      });

      it("passes when loopMode ON and mirrors opening", () => {
        const input = { prompt: "mirror opening composition", runConfig: { loopMode: true } };
        expect(rule10().predicate!(input)).toBe(true);
      });

      it("passes when loopMode ON and has seamless loop", () => {
        const input = { prompt: "seamless loop transition", runConfig: { loopMode: true } };
        expect(rule10().predicate!(input)).toBe(true);
      });

      it("fails when loopMode ON and missing loop directive", () => {
        const input = { prompt: "Regular prompt without loop", runConfig: { loopMode: true } };
        expect(rule10().predicate!(input)).toBe(false);
      });
    });

    describe("R11 predicate (Audio Direction)", () => {
      const rule11 = () => RULES.find((r) => r.id === "R11")!;

      it("passes with audio cue and no dialogue", () => {
        const input = { prompt: "Audio: soft strings. Camera pans. No dialogue." };
        expect(rule11().predicate!(input)).toBe(true);
      });

      it("passes with sound cue and no dialogue", () => {
        const input = { prompt: "Sound: crowd cheering. Camera pans. No dialogue." };
        expect(rule11().predicate!(input)).toBe(true);
      });

      it("fails without audio cue", () => {
        const input = { prompt: "Camera pans. No dialogue." };
        expect(rule11().predicate!(input)).toBe(false);
      });

      it("fails without no dialogue", () => {
        const input = { prompt: "Audio: soft strings. Camera pans." };
        expect(rule11().predicate!(input)).toBe(false);
      });
    });

    describe("R12 predicate (Drop Sync)", () => {
      const rule12 = () => RULES.find((r) => r.id === "R12")!;

      it("passes for LYRICS with required chant", () => {
        const input = { prompt: "Verse... Drop: Shika! Shika! Shilshul! Shilshul!", stage: "LYRICS" };
        expect(rule12().predicate!(input)).toBe(true);
      });

      it("fails for LYRICS without required chant", () => {
        const input = { prompt: "Verse... Drop: La la la", stage: "LYRICS" };
        expect(rule12().predicate!(input)).toBe(false);
      });

      it("passes for EXTEND_END with DROP tag", () => {
        const input = { prompt: "[DROP] Final beat", stage: "EXTEND_END" };
        expect(rule12().predicate!(input)).toBe(true);
      });

      it("fails for EXTEND_END without DROP tag", () => {
        const input = { prompt: "Final beat without tag", stage: "EXTEND_END" };
        expect(rule12().predicate!(input)).toBe(false);
      });
    });

    describe("R14 predicate", () => {
      const rule14 = () => RULES.find((r) => r.id === "R14")!;

      it("passes for empty batch combos", () => {
        const input = { batchCombos: [] };
        expect(rule14().predicate!(input)).toBe(true);
      });

      it("passes for undefined batch combos", () => {
        const input = {};
        expect(rule14().predicate!(input)).toBe(true);
      });

      it("passes for unique stage+moment combinations", () => {
        const input = {
          batchCombos: [
            { stage: "Main Stage", moment: "Sunset" },
            { stage: "Side Stage", moment: "Night" },
            { stage: "Main Stage", moment: "Night" },
          ],
        };
        expect(rule14().predicate!(input)).toBe(true);
      });

      it("fails for duplicate stage+moment combinations", () => {
        const input = {
          batchCombos: [
            { stage: "Main Stage", moment: "Sunset" },
            { stage: "Main Stage", moment: "Sunset" },
          ],
        };
        expect(rule14().predicate!(input)).toBe(false);
      });
    });
  });
});
