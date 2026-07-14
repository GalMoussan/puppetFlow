/**
 * DeepSeek API client (OpenAI-compatible chat completions)
 *
 * Uses response_format json_object for structured batch output.
 *
 * @module lib/deepseek
 */

import { z } from "zod";
import { AnthropicError } from "./errors";
import type { ComboAssignment } from "@/packages/domain/types";
import {
  type BatchOutput,
  type GenerationOptions,
  type GeneratedScene,
} from "./anthropic-types";
import { parseBatchOutput } from "./llm-batch-output";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export function hasDeepseekKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function getDeepseekModel(): string {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

/**
 * Build user prompt that forces JSON batch output for json_object mode.
 */
export function buildDeepseekGenerationPrompt(
  scaffold: string,
  assignments: ComboAssignment[]
): string {
  const assignmentText =
    assignments.length === 0
      ? ""
      : assignments
          .map((combo, idx) => {
            return `
Scene ${idx + 1} Assignment:
- Stage Area: ${combo.stageArea}
- Festival Moment: ${combo.festivalMoment}
- Dynamic: ${combo.dynamic}
- Visual: ${combo.visual}
- Hook: ${combo.hook}
- Gag: ${combo.gag}
- Camera (Start): ${combo.camera.start}
- Camera (Middle): ${combo.camera.middle}
- Camera (End): ${combo.camera.end}
- Payoff: ${combo.payoff}
- Chaos Thread: ${combo.chaosThread}
- Language: ${combo.language}
- Subgenre: ${combo.subgenre}`;
          })
          .join("\n");

  const count = Math.max(assignments.length, 1);

  return `${scaffold}

---

SCENE ASSIGNMENTS
${assignmentText || "(use scaffold defaults)"}

Generate exactly ${count} scene(s) following these assignments.

Respond with a single JSON object only (no markdown fences).
EVERY scene MUST include ALL eight string keys below — never omit any key:

{
  "scenes": [
    {
      "lyrics": "chant/lyrics text",
      "imagePrompt": "IMAGE stage still description",
      "startPrompt": "VIDEO_START motion prompt with camera verb",
      "middlePrompt": "EXTEND_MIDDLE motion prompt with camera verb",
      "endPrompt": "EXTEND_END motion prompt with camera verb and drop",
      "boundaryFrame1": "ENDING FRAME [EXACT]: verbatim START->MIDDLE handshake freeze",
      "boundaryFrame2": "ENDING FRAME [EXACT]: verbatim MIDDLE->END handshake freeze",
      "finalFrame": "FINAL FRAME: loop-closure tableau description"
    }
  ]
}

Rules:
- boundaryFrame1 / boundaryFrame2 / finalFrame are REQUIRED on every scene (not optional).
- Use the exact key names above (camelCase).
- Output JSON only — no commentary.`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  // Strip optional markdown fences
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

/**
 * Generate a batch of scenes via DeepSeek chat completions.
 */
export async function generateBatchDeepseek(
  scaffold: string,
  assignments: ComboAssignment[],
  options: GenerationOptions = {}
): Promise<BatchOutput> {
  if (!hasDeepseekKey()) {
    throw new AnthropicError("DEEPSEEK_API_KEY not configured", "authentication_error");
  }

  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const model = options.model || getDeepseekModel();
  const maxAttempts = 2;
  const prompt = buildDeepseekGenerationPrompt(scaffold, assignments);
  const maxTokens = options.maxTokens ?? 8192;

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a precise JSON generator for AI video prompt pipelines. Output only valid JSON. Every scene object MUST include: lyrics, imagePrompt, startPrompt, middlePrompt, endPrompt, boundaryFrame1, boundaryFrame2, finalFrame (all strings, never null/omitted).",
            },
            { role: "user", content: prompt },
          ],
          temperature: options.temperature ?? 1.0,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; type?: string };
        };

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("retry-after") || "5",
            10
          );
          throw new AnthropicError(
            "DeepSeek rate limit exceeded",
            "rate_limit_error",
            retryAfter
          );
        }

        if (response.status === 401) {
          throw new AnthropicError(
            "Invalid DeepSeek API key",
            "authentication_error"
          );
        }

        throw new AnthropicError(
          errorBody.error?.message || `DeepSeek API error: ${response.status}`,
          errorBody.error?.type || "api_error"
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new AnthropicError(
          "Empty response from DeepSeek",
          "validation_error"
        );
      }

      let parsed: unknown;
      try {
        parsed = extractJsonObject(content);
      } catch {
        throw new AnthropicError(
          "DeepSeek returned non-JSON content",
          "validation_error"
        );
      }

      // Normalize partial DeepSeek JSON (often omits boundary/final frames)
      return parseBatchOutput(parsed);
    } catch (err) {
      attempt++;

      if (err instanceof AnthropicError) {
        if (err.code === "authentication_error") throw err;
        if (err.code === "rate_limit_error" && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, (err.retryAfter || 5) * 1000));
          continue;
        }
        // validation_error: retry once if attempts remain
        if (err.code === "validation_error" && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
      }

      if (err instanceof z.ZodError) {
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw new AnthropicError(
          `Structured output validation failed: ${err.message}`,
          "validation_error"
        );
      }

      if (attempt >= maxAttempts) {
        if (err instanceof AnthropicError) throw err;
        throw new AnthropicError(
          err instanceof Error ? err.message : "Unknown DeepSeek error",
          "unknown_error"
        );
      }

      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new AnthropicError("DeepSeek max retry attempts exceeded");
}

export async function generateSceneDeepseek(
  scaffold: string,
  combo: ComboAssignment
): Promise<GeneratedScene> {
  const result = await generateBatchDeepseek(scaffold, [combo], {
    maxTokens: 4000,
    temperature: 1.0,
  });
  if (result.scenes.length === 0) {
    throw new AnthropicError("No scenes generated by DeepSeek");
  }
  return result.scenes[0];
}
