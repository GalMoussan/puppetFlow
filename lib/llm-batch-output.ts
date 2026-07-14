/**
 * Normalize / parse LLM batch generation JSON.
 *
 * Providers (especially DeepSeek json_object mode) often omit boundary/final
 * frame fields or use alternate key names. We coerce before Zod validation.
 *
 * @module lib/llm-batch-output
 */

import {
  BatchOutputSchema,
  type BatchOutput,
} from "./anthropic-types";

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = asString(obj[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

/** Last sentence or trailing slice for frame derivation. */
export function lastSentence(text: string, maxLen = 280): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? trimmed;
  if (last.length <= maxLen) return last;
  return last.slice(-maxLen);
}

function nestedFrameDescription(
  frames: unknown,
  side: "start" | "end"
): string | undefined {
  if (!frames || typeof frames !== "object") return undefined;
  const node = (frames as Record<string, unknown>)[side];
  if (typeof node === "string") return node;
  if (node && typeof node === "object") {
    return asString((node as Record<string, unknown>).description);
  }
  return undefined;
}

/**
 * Coerce one scene object into the canonical GeneratedScene field set.
 * Missing boundary/final frames are derived from stage prompts.
 */
export function normalizeGeneratedScene(
  raw: unknown
): Record<string, string> {
  if (!raw || typeof raw !== "object") {
    return {
      lyrics: "",
      imagePrompt: "",
      startPrompt: "",
      middlePrompt: "",
      endPrompt: "",
      boundaryFrame1: "ENDING FRAME [EXACT]: Hold composition for middle extend.",
      boundaryFrame2: "ENDING FRAME [EXACT]: Hold composition for end extend.",
      finalFrame: "FINAL FRAME: Loop-ready tableau matching opening energy.",
    };
  }

  const o = raw as Record<string, unknown>;
  const boundaryFrames = o.boundaryFrames ?? o.boundary_frames;

  const lyrics = pickString(o, ["lyrics", "Lyrics"]) ?? "";
  const imagePrompt =
    pickString(o, ["imagePrompt", "image_prompt", "image", "ImagePrompt"]) ??
    "";
  const startPrompt =
    pickString(o, [
      "startPrompt",
      "start_prompt",
      "videoStart",
      "video_start",
      "start",
    ]) ?? "";
  const middlePrompt =
    pickString(o, [
      "middlePrompt",
      "middle_prompt",
      "extendMiddle",
      "extend_middle",
      "middle",
    ]) ?? "";
  const endPrompt =
    pickString(o, [
      "endPrompt",
      "end_prompt",
      "extendEnd",
      "extend_end",
      "end",
    ]) ?? "";

  let boundaryFrame1 =
    pickString(o, [
      "boundaryFrame1",
      "boundary_frame_1",
      "boundaryFrameStart",
      "bf1",
    ]) ?? nestedFrameDescription(boundaryFrames, "start");

  let boundaryFrame2 =
    pickString(o, [
      "boundaryFrame2",
      "boundary_frame_2",
      "boundaryFrameEnd",
      "bf2",
    ]) ?? nestedFrameDescription(boundaryFrames, "end");

  let finalFrame = pickString(o, [
    "finalFrame",
    "final_frame",
    "loopFrame",
    "loop_frame",
  ]);

  if (!boundaryFrame1?.trim()) {
    boundaryFrame1 = startPrompt.trim()
      ? `ENDING FRAME [EXACT]: ${lastSentence(startPrompt)}`
      : "ENDING FRAME [EXACT]: Hold composition for middle extend.";
  }
  if (!boundaryFrame2?.trim()) {
    boundaryFrame2 = middlePrompt.trim()
      ? `ENDING FRAME [EXACT]: ${lastSentence(middlePrompt)}`
      : "ENDING FRAME [EXACT]: Hold composition for end extend.";
  }
  if (!finalFrame?.trim()) {
    finalFrame = endPrompt.trim()
      ? `FINAL FRAME: ${lastSentence(endPrompt)}`
      : "FINAL FRAME: Loop-ready tableau matching opening energy.";
  }

  return {
    lyrics,
    imagePrompt,
    startPrompt,
    middlePrompt,
    endPrompt,
    boundaryFrame1,
    boundaryFrame2,
    finalFrame,
  };
}

/**
 * Normalize arbitrary LLM JSON into `{ scenes: GeneratedScene[] }`.
 */
export function normalizeBatchOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const scenesRaw = obj.scenes ?? obj.Scenes ?? obj.scene_list;
  if (!Array.isArray(scenesRaw)) return raw;
  return {
    scenes: scenesRaw.map((scene) => normalizeGeneratedScene(scene)),
  };
}

/**
 * Normalize then validate batch output against BatchOutputSchema.
 */
export function parseBatchOutput(raw: unknown): BatchOutput {
  return BatchOutputSchema.parse(normalizeBatchOutput(raw));
}
