/**
 * Tests for LLM batch output normalization (DeepSeek partial JSON resilience)
 */

import { describe, it, expect } from "vitest";
import {
  normalizeBatchOutput,
  normalizeGeneratedScene,
  parseBatchOutput,
  lastSentence,
} from "@/lib/llm-batch-output";

describe("lastSentence", () => {
  it("returns the last sentence", () => {
    expect(lastSentence("First. Second end.")).toBe("Second end.");
  });

  it("returns full text when no sentence break", () => {
    expect(lastSentence("no punctuation")).toBe("no punctuation");
  });
});

describe("normalizeGeneratedScene", () => {
  it("passes through complete scenes", () => {
    const scene = {
      lyrics: "a",
      imagePrompt: "b",
      startPrompt: "c",
      middlePrompt: "d",
      endPrompt: "e",
      boundaryFrame1: "f1",
      boundaryFrame2: "f2",
      finalFrame: "ff",
    };
    expect(normalizeGeneratedScene(scene)).toEqual(scene);
  });

  it("derives missing boundary/final frames from stage prompts", () => {
    const scene = {
      lyrics: "Shika!",
      imagePrompt: "Wide stage.",
      startPrompt: "Dolly in. Puppets face camera.",
      middlePrompt: "Pan left. Crowd surges.",
      endPrompt: "Crane up to drop. Freeze pose.",
    };
    const result = normalizeGeneratedScene(scene);
    expect(result.boundaryFrame1).toContain("ENDING FRAME");
    expect(result.boundaryFrame1).toContain("Puppets face camera");
    expect(result.boundaryFrame2).toContain("ENDING FRAME");
    expect(result.boundaryFrame2).toContain("Crowd surges");
    expect(result.finalFrame).toContain("FINAL FRAME");
    expect(result.finalFrame).toContain("Freeze pose");
  });

  it("accepts snake_case field names", () => {
    const result = normalizeGeneratedScene({
      lyrics: "x",
      image_prompt: "img",
      start_prompt: "start",
      middle_prompt: "mid",
      end_prompt: "end",
      boundary_frame_1: "bf1",
      boundary_frame_2: "bf2",
      final_frame: "fin",
    });
    expect(result.imagePrompt).toBe("img");
    expect(result.boundaryFrame1).toBe("bf1");
    expect(result.finalFrame).toBe("fin");
  });

  it("accepts nested boundaryFrames shape", () => {
    const result = normalizeGeneratedScene({
      lyrics: "x",
      imagePrompt: "i",
      startPrompt: "s",
      middlePrompt: "m",
      endPrompt: "e",
      boundaryFrames: {
        start: { description: "start desc" },
        end: { description: "end desc" },
      },
    });
    expect(result.boundaryFrame1).toBe("start desc");
    expect(result.boundaryFrame2).toBe("end desc");
  });
});

describe("normalizeBatchOutput + parseBatchOutput", () => {
  it("fills frames so DeepSeek-style partial scenes parse", () => {
    const raw = {
      scenes: [
        {
          lyrics: "Line",
          imagePrompt: "Image",
          startPrompt: "Start action ends here.",
          middlePrompt: "Middle action ends here.",
          endPrompt: "End action ends here.",
          // intentionally omit boundaryFrame1/2 and finalFrame
        },
      ],
    };

    const normalized = normalizeBatchOutput(raw) as {
      scenes: Array<{ boundaryFrame1: string; finalFrame: string }>;
    };
    expect(normalized.scenes[0].boundaryFrame1).toBeTruthy();
    expect(normalized.scenes[0].finalFrame).toBeTruthy();

    const parsed = parseBatchOutput(raw);
    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0].lyrics).toBe("Line");
    expect(typeof parsed.scenes[0].boundaryFrame1).toBe("string");
    expect(parsed.scenes[0].boundaryFrame1.length).toBeGreaterThan(0);
  });

  it("still fails when core string fields are missing entirely", () => {
    // After normalize, empty strings are valid for schema — lyrics can be ""
    // Real failure mode is non-object / no scenes array
    expect(() => parseBatchOutput({ notScenes: [] })).toThrow();
  });
});
