/**
 * DeepSeek client tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateBatchDeepseek,
  hasDeepseekKey,
  getDeepseekModel,
  buildDeepseekGenerationPrompt,
} from "@/lib/deepseek";
import { getLlmProvider, hasLlmKey } from "@/lib/llm-provider";
import { generateBatch, hasAnthropicKey, getModelName } from "@/lib/anthropic";
import type { ComboAssignment } from "@/packages/domain/types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const sampleCombo: ComboAssignment = {
  stageArea: "Main Stage",
  festivalMoment: "Sunset",
  dynamic: "synchronized",
  visual: "neon strings",
  hook: "surprise entrance",
  gag: "tangled strings",
  camera: { start: "dolly", middle: "pan", end: "crane up" },
  payoff: "crowd sync",
  chaosThread: "rogue balloon",
  language: "hi",
  subgenre: "techno",
};

const validBatch = {
  scenes: [
    {
      lyrics: "Shika!",
      imagePrompt: "Festival stage",
      startPrompt: "Camera dollies in",
      middlePrompt: "Camera pans",
      endPrompt: "Camera cranes [DROP]",
      boundaryFrame1: "Frame A",
      boundaryFrame2: "Frame B",
      finalFrame: "Final",
    },
  ],
};

describe("lib/deepseek + provider routing", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.LLM_PROVIDER;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("hasDeepseekKey reflects DEEPSEEK_API_KEY", () => {
    expect(hasDeepseekKey()).toBe(false);
    process.env.DEEPSEEK_API_KEY = "sk-test";
    expect(hasDeepseekKey()).toBe(true);
  });

  it("getLlmProvider prefers deepseek when only DeepSeek key is set", () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    expect(getLlmProvider()).toBe("deepseek");
    expect(hasLlmKey()).toBe(true);
    expect(hasAnthropicKey()).toBe(true); // facade: any LLM key
    expect(getModelName()).toBe("deepseek-chat");
  });

  it("getLlmProvider respects LLM_PROVIDER=deepseek", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant";
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    process.env.LLM_PROVIDER = "deepseek";
    expect(getLlmProvider()).toBe("deepseek");
  });

  it("buildDeepseekGenerationPrompt asks for JSON scenes", () => {
    const prompt = buildDeepseekGenerationPrompt("scaffold", [sampleCombo]);
    expect(prompt).toContain("scaffold");
    expect(prompt).toContain('"scenes"');
    expect(prompt).toContain("Main Stage");
  });

  it("generateBatchDeepseek parses OpenAI-style chat completion JSON", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(validBatch),
            },
          },
        ],
      }),
    });

    const result = await generateBatchDeepseek("scaffold", [sampleCombo]);
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].imagePrompt).toBe("Festival stage");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-ds",
        }),
      })
    );
  });

  it("generateBatch facade routes to DeepSeek when provider is deepseek", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    process.env.LLM_PROVIDER = "deepseek";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(validBatch) } }],
      }),
    });

    const result = await generateBatch("scaffold", [sampleCombo]);
    expect(result.scenes[0].lyrics).toBe("Shika!");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("deepseek.com");
  });

  it("throws when no LLM keys configured", async () => {
    await expect(generateBatch("scaffold", [sampleCombo])).rejects.toThrow(
      /No LLM API key/
    );
  });
});
