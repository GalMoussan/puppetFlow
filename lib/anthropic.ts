/**
 * Anthropic API Client
 *
 * Handles communication with Claude API for scene generation.
 * Uses structured output via tool schemas.
 *
 * @module lib/anthropic
 */

import { z } from "zod";
import { AnthropicError } from "./errors";
import type { ComboAssignment, Scene } from "@/packages/domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Scene output from Anthropic (before DB fields added)
 */
export interface GeneratedScene {
  lyrics: string;
  imagePrompt: string;
  startPrompt: string;
  middlePrompt: string;
  endPrompt: string;
  boundaryFrame1: string;
  boundaryFrame2: string;
  finalFrame: string;
}

/**
 * Batch output schema for validation
 */
export const BatchOutputSchema = z.object({
  scenes: z.array(
    z.object({
      lyrics: z.string(),
      imagePrompt: z.string(),
      startPrompt: z.string(),
      middlePrompt: z.string(),
      endPrompt: z.string(),
      boundaryFrame1: z.string(),
      boundaryFrame2: z.string(),
      finalFrame: z.string(),
    })
  ),
});

export type BatchOutput = z.infer<typeof BatchOutputSchema>;

/**
 * Options for generation
 */
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

// =============================================================================
// Anthropic Client
// =============================================================================

/**
 * Check if Anthropic API is available
 */
export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Get configured model name
 */
export function getModelName(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

/**
 * Generate a batch of scenes from scaffold and combo assignments
 */
export async function generateBatch(
  scaffold: string,
  assignments: ComboAssignment[],
  options: GenerationOptions = {}
): Promise<BatchOutput> {
  if (!hasAnthropicKey()) {
    throw new AnthropicError("ANTHROPIC_API_KEY not configured");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = getModelName();
  const maxAttempts = 2;

  // Build the prompt with assignments
  const prompt = buildGenerationPrompt(scaffold, assignments);

  // Tool schema for structured output
  const toolSchema = {
    name: "return_batch_output",
    description: "Return the generated scenes with prompts for each stage",
    input_schema: {
      type: "object",
      properties: {
        scenes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              lyrics: { type: "string", description: "Generated lyrics for the scene" },
              imagePrompt: { type: "string", description: "IMAGE stage prompt" },
              startPrompt: { type: "string", description: "VIDEO_START stage prompt" },
              middlePrompt: { type: "string", description: "EXTEND_MIDDLE stage prompt" },
              endPrompt: { type: "string", description: "EXTEND_END stage prompt" },
              boundaryFrame1: { type: "string", description: "START->MIDDLE handshake frame" },
              boundaryFrame2: { type: "string", description: "MIDDLE->END handshake frame" },
              finalFrame: { type: "string", description: "Final frame for loop closure" },
            },
            required: [
              "lyrics",
              "imagePrompt",
              "startPrompt",
              "middlePrompt",
              "endPrompt",
              "boundaryFrame1",
              "boundaryFrame2",
              "finalFrame",
            ],
          },
        },
      },
      required: ["scenes"],
    },
  };

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 1.0,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          tools: [toolSchema],
          tool_choice: { type: "tool", name: "return_batch_output" },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "5", 10);
          throw new AnthropicError(
            "Rate limit exceeded",
            "rate_limit_error",
            retryAfter
          );
        }

        if (response.status === 401) {
          throw new AnthropicError("Invalid API key", "authentication_error");
        }

        throw new AnthropicError(
          errorBody.error?.message || `API error: ${response.status}`,
          errorBody.error?.type
        );
      }

      const data = await response.json();

      // Extract tool use block
      const toolUseBlock = data.content?.find(
        (block: { type: string }) => block.type === "tool_use"
      );

      if (!toolUseBlock) {
        throw new AnthropicError("No tool use in response");
      }

      // Validate and return
      const output = BatchOutputSchema.parse(toolUseBlock.input);
      return output;
    } catch (err) {
      attempt++;

      if (err instanceof AnthropicError) {
        // Don't retry auth errors
        if (err.code === "authentication_error") {
          throw err;
        }
        // Retry rate limits with backoff
        if (err.code === "rate_limit_error" && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, (err.retryAfter || 5) * 1000));
          continue;
        }
      }

      if (err instanceof z.ZodError) {
        throw new AnthropicError(
          `Structured output validation failed: ${err.message}`,
          "validation_error"
        );
      }

      if (attempt >= maxAttempts) {
        if (err instanceof AnthropicError) {
          throw err;
        }
        throw new AnthropicError(
          err instanceof Error ? err.message : "Unknown error",
          "unknown_error"
        );
      }

      // Exponential backoff for other errors
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new AnthropicError("Max retry attempts exceeded");
}

/**
 * Generate a single scene for reroll
 */
export async function generateScene(
  scaffold: string,
  sceneIndex: number,
  combo: ComboAssignment,
  stage?: string
): Promise<GeneratedScene> {
  // For single scene generation, we use the same batch mechanism
  // but with only one combo
  const result = await generateBatch(scaffold, [combo], {
    maxTokens: 2000,
    temperature: 1.0,
  });

  if (result.scenes.length === 0) {
    throw new AnthropicError("No scenes generated");
  }

  return result.scenes[0];
}

/**
 * Build repair prompt for lint violations
 */
export function buildRepairPrompt(
  scaffold: string,
  violationsByScene: Array<{ sceneIndex: number; violations: unknown[] }>
): string {
  const violationSummary = violationsByScene
    .filter((v) => v.violations.length > 0)
    .map((v) => `Scene ${v.sceneIndex + 1}: ${JSON.stringify(v.violations)}`)
    .join("\n");

  return `${scaffold}

---

REPAIR NEEDED

The following violations were detected and must be fixed:

${violationSummary}

Please regenerate the scenes fixing all violations while maintaining the creative intent.`;
}

/**
 * Repair scenes with lint violations
 */
export async function repair(repairPrompt: string): Promise<BatchOutput> {
  return generateBatch(repairPrompt, [], {
    temperature: 0.8,
    maxTokens: 4000,
  });
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Build generation prompt with scaffold and assignments
 */
function buildGenerationPrompt(scaffold: string, assignments: ComboAssignment[]): string {
  if (assignments.length === 0) {
    return scaffold;
  }

  const assignmentText = assignments
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

  return `${scaffold}

---

SCENE ASSIGNMENTS

${assignmentText}

Generate ${assignments.length} scene(s) following these exact assignments.`;
}
