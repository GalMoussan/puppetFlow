/**
 * LLM client facade (Anthropic + DeepSeek)
 *
 * Public API used by the agent. Routes to the active provider.
 *
 * @module lib/anthropic
 */

import { z } from "zod";
import { AnthropicError } from "./errors";
import type { ComboAssignment } from "@/packages/domain/types";
import {
  BatchOutputSchema,
  type BatchOutput,
  type GenerationOptions,
  type GeneratedScene,
  type UsageStats,
} from "./anthropic-types";
import { parseBatchOutput } from "./llm-batch-output";
import { apiConfig, generationLimits } from "./config";

// =============================================================================
// Cost estimation (per million tokens)
// =============================================================================

/**
 * Pricing per model (per million tokens)
 * https://www.anthropic.com/pricing
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5-20250514": { input: 3.0, output: 15.0 },
  "claude-opus-4-5-20251101": { input: 15.0, output: 75.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20240620": { input: 3.0, output: 15.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  // Default fallback for unknown models
  default: { input: 3.0, output: 15.0 },
};

/**
 * Estimate cost in USD based on token usage
 */
function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING.default;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Extract usage stats from Anthropic API response
 */
function extractUsageStats(
  data: { usage?: { input_tokens?: number; output_tokens?: number } },
  model: string
): UsageStats | undefined {
  if (!data.usage) return undefined;

  const inputTokens = data.usage.input_tokens ?? 0;
  const outputTokens = data.usage.output_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = estimateCost(inputTokens, outputTokens, model);

  return { inputTokens, outputTokens, totalTokens, estimatedCost };
}
import { getLlmProvider, hasLlmKey } from "./llm-provider";
import {
  generateBatchDeepseek,
  generateSceneDeepseek,
  hasDeepseekKey,
  getDeepseekModel,
} from "./deepseek";

export type { BatchOutput, GenerationOptions, GeneratedScene };
export { BatchOutputSchema };

// =============================================================================
// Provider helpers (names kept for agent/back-compat)
// =============================================================================

/**
 * True if any supported LLM key is configured.
 * (Name kept as hasAnthropicKey for existing agent/tests.)
 */
export function hasAnthropicKey(): boolean {
  return hasLlmKey();
}

/**
 * Active model name for the selected provider.
 * Note: Reads from process.env directly to allow dynamic configuration in tests
 */
export function getModelName(): string {
  if (getLlmProvider() === "deepseek") {
    return getDeepseekModel();
  }
  return process.env.ANTHROPIC_MODEL || apiConfig.anthropicModel;
}

// =============================================================================
// Anthropic implementation
// =============================================================================

function hasAnthropicOnlyKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function generateBatchAnthropic(
  scaffold: string,
  assignments: ComboAssignment[],
  options: GenerationOptions = {}
): Promise<BatchOutput> {
  if (!hasAnthropicOnlyKey()) {
    throw new AnthropicError("ANTHROPIC_API_KEY not configured");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = options.model || apiConfig.anthropicModel;
  const maxAttempts = apiConfig.maxRetryAttempts;
  const timeoutMs = apiConfig.anthropicTimeoutMs;

  const prompt = buildGenerationPrompt(scaffold, assignments);

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
              imagePrompt: { type: "string", description: "IMAGE stage prompt - MUST be 250-400 words with: (1) Technical frame (ARRI Alexa, lens, aperture, color grade), (2) Detailed character descriptions with poses/expressions, (3) Puppet visual showing invisible control dynamic, (4) Rich setting with 5+ environmental details, (5) Negative constraints, (6) Background chaos thread, (7) Crowd activities, (8) Mood line, (9) CRITICAL CHARACTER LOCKS verbatim. Follow the IMAGE Prompt Style Guide exactly." },
              startPrompt: { type: "string", description: "VIDEO_START stage prompt" },
              middlePrompt: { type: "string", description: "EXTEND_MIDDLE stage prompt" },
              endPrompt: { type: "string", description: "EXTEND_END stage prompt" },
              boundaryFrame1: {
                type: "string",
                description: "START->MIDDLE handshake frame",
              },
              boundaryFrame2: {
                type: "string",
                description: "MIDDLE->END handshake frame",
              },
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
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
          max_tokens: options.maxTokens || generationLimits.defaultMaxTokens,
          temperature: options.temperature || generationLimits.defaultTemperature,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          tools: [toolSchema],
          tool_choice: { type: "tool", name: "return_batch_output" },
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("retry-after") || "5",
            10
          );
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

      const toolUseBlock = data.content?.find(
        (block: { type: string }) => block.type === "tool_use"
      );

      if (!toolUseBlock) {
        throw new AnthropicError("No tool use in response");
      }

      // Extract usage stats from the response
      const usage = extractUsageStats(data, model);

      // Normalize then parse (shared path with DeepSeek for partial fields)
      const result = parseBatchOutput(toolUseBlock.input);
      return { ...result, usage };
    } catch (err) {
      attempt++;

      // Handle timeout (AbortError)
      if (err instanceof Error && err.name === "AbortError") {
        throw new AnthropicError(
          `Request timed out after ${timeoutMs}ms`,
          "timeout_error"
        );
      }

      if (err instanceof AnthropicError) {
        if (err.code === "authentication_error") {
          throw err;
        }
        if (err.code === "timeout_error") {
          throw err;
        }
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

      await new Promise((r) => setTimeout(r, apiConfig.retryDelayMs * attempt));
    }
  }

  throw new AnthropicError("Max retry attempts exceeded");
}

// =============================================================================
// Public API (provider-routed)
// =============================================================================

/**
 * Generate a batch of scenes from scaffold and combo assignments
 */
export async function generateBatch(
  scaffold: string,
  assignments: ComboAssignment[],
  options: GenerationOptions = {}
): Promise<BatchOutput> {
  if (!hasLlmKey()) {
    throw new AnthropicError(
      "No LLM API key configured. Set DEEPSEEK_API_KEY or ANTHROPIC_API_KEY.",
      "authentication_error"
    );
  }

  if (getLlmProvider() === "deepseek") {
    return generateBatchDeepseek(scaffold, assignments, options);
  }

  return generateBatchAnthropic(scaffold, assignments, options);
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
  void sceneIndex;
  void stage;

  if (getLlmProvider() === "deepseek" && hasDeepseekKey()) {
    return generateSceneDeepseek(scaffold, combo);
  }

  const result = await generateBatch(scaffold, [combo], {
    maxTokens: generationLimits.defaultMaxTokens / 2,
    temperature: generationLimits.defaultTemperature,
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
 * Options for the repair pass
 */
export interface RepairOptions {
  violations?: Array<{
    rule?: string;
    evidence?: string;
    sceneIndex?: number;
    stage?: string;
    severity?: string;
    [key: string]: unknown;
  }>;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Repair scenes with lint violations.
 */
export async function repair(
  scaffoldOrPrompt: string,
  options: RepairOptions = {}
): Promise<BatchOutput> {
  let prompt = scaffoldOrPrompt;

  if (options.violations && options.violations.length > 0) {
    const byScene = new Map<number, unknown[]>();
    for (const v of options.violations) {
      const idx = typeof v.sceneIndex === "number" ? v.sceneIndex : 0;
      const list = byScene.get(idx) ?? [];
      list.push(v);
      byScene.set(idx, list);
    }
    const violationsByScene = Array.from(byScene.entries()).map(
      ([sceneIndex, violations]) => ({ sceneIndex, violations })
    );
    prompt = buildRepairPrompt(scaffoldOrPrompt, violationsByScene);
  }

  return generateBatch(prompt, [], {
    temperature: options.temperature ?? generationLimits.repairTemperature,
    maxTokens: options.maxTokens ?? generationLimits.defaultMaxTokens,
  });
}

// =============================================================================
// Internal Helpers
// =============================================================================

function buildGenerationPrompt(
  scaffold: string,
  assignments: ComboAssignment[]
): string {
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
