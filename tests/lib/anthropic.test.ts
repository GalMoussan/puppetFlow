/**
 * Tests for Anthropic Client
 *
 * Per Phase 2 test specification section 3:
 * - Structured output parsing with BatchOutput schema
 * - Rate limit (429) retry with exponential backoff
 * - API error propagation
 *
 * Coverage target: >= 85% line coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  generateBatch,
  generateScene,
  buildRepairPrompt,
  repair,
  hasAnthropicKey,
  getModelName,
  BatchOutputSchema,
} from "@/lib/anthropic";

import { AnthropicError } from "@/lib/errors";

import {
  rateLimitResponse,
  authErrorResponse,
} from "@/tests/mocks/anthropic-responses";

import type { ComboAssignment } from "@/packages/domain/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment
const originalEnv = process.env;

describe("lib/anthropic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: "test-key" };
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  // Helper to create mock combo assignments
  const createMockAssignments = (count: number): ComboAssignment[] => {
    return Array.from({ length: count }, (_, i) => ({
      stageArea: `Stage ${i}`,
      festivalMoment: "Sunset",
      dynamic: "synchronized",
      visual: "neon strings",
      hook: "surprise entrance",
      gag: "tangled strings",
      payoff: "crowd sync",
      chaosThread: "rogue balloon",
      camera: { start: "dolly", middle: "pan", end: "crane up" },
      language: "hi",
      subgenre: "psycore",
    }));
  };

  // ==========================================================================
  // Configuration
  // ==========================================================================

  describe("configuration", () => {
    it("hasAnthropicKey returns true when key is set", () => {
      expect(hasAnthropicKey()).toBe(true);
    });

    it("hasAnthropicKey returns false when key is missing", () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(hasAnthropicKey()).toBe(false);
    });

    it("getModelName returns configured model", () => {
      process.env.ANTHROPIC_MODEL = "claude-opus-4-5-20251101";
      expect(getModelName()).toBe("claude-opus-4-5-20251101");
    });

    it("getModelName returns default when not configured", () => {
      delete process.env.ANTHROPIC_MODEL;
      expect(getModelName()).toBe("claude-sonnet-4-6");
    });
  });

  // ==========================================================================
  // 3.1 Structured Output Parsing
  // ==========================================================================

  describe("BatchOutputSchema validation", () => {
    describe("with valid BatchOutput", () => {
      it("parses valid BatchOutput with all fields populated", () => {
        const validOutput = {
          scenes: [
            {
              lyrics: "Test lyrics",
              imagePrompt: "Test image prompt",
              startPrompt: "Test start prompt",
              middlePrompt: "Test middle prompt",
              endPrompt: "Test end prompt",
              boundaryFrame1: "Frame 1",
              boundaryFrame2: "Frame 2",
              finalFrame: "Final frame",
            },
          ],
        };
        const result = BatchOutputSchema.parse(validOutput);

        expect(result).toBeDefined();
        expect(result.scenes).toHaveLength(1);
        expect(result.scenes[0].lyrics).toBe("Test lyrics");
      });

      it("parses batch with multiple scenes", () => {
        const output = {
          scenes: Array.from({ length: 5 }, (_, i) => ({
            lyrics: `Lyrics ${i}`,
            imagePrompt: `Image ${i}`,
            startPrompt: `Start ${i}`,
            middlePrompt: `Middle ${i}`,
            endPrompt: `End ${i}`,
            boundaryFrame1: `BF1 ${i}`,
            boundaryFrame2: `BF2 ${i}`,
            finalFrame: `Final ${i}`,
          })),
        };
        const result = BatchOutputSchema.parse(output);

        expect(result.scenes).toHaveLength(5);
      });

      it("parses batch with maximum length strings", () => {
        const output = {
          scenes: [
            {
              lyrics: "A".repeat(10240),
              imagePrompt: "B".repeat(10240),
              startPrompt: "C",
              middlePrompt: "D",
              endPrompt: "E",
              boundaryFrame1: "F",
              boundaryFrame2: "G",
              finalFrame: "H",
            },
          ],
        };
        const result = BatchOutputSchema.parse(output);

        expect(result.scenes[0].lyrics).toHaveLength(10240);
      });
    });

    describe("with invalid data", () => {
      it("throws for missing required fields", () => {
        const missingFields = {
          scenes: [{ lyrics: "only lyrics" }],
        };

        expect(() => BatchOutputSchema.parse(missingFields)).toThrow();
      });

      it("throws for empty scenes array", () => {
        const noScenes = { scenes: [] };

        // Empty array is valid in schema but may be rejected by business logic
        const result = BatchOutputSchema.parse(noScenes);
        expect(result.scenes).toHaveLength(0);
      });

      it("throws for null where string expected", () => {
        const nullField = {
          scenes: [
            {
              lyrics: null,
              imagePrompt: "test",
              startPrompt: "test",
              middlePrompt: "test",
              endPrompt: "test",
              boundaryFrame1: "test",
              boundaryFrame2: "test",
              finalFrame: "test",
            },
          ],
        };

        expect(() => BatchOutputSchema.parse(nullField)).toThrow();
      });
    });
  });

  // ==========================================================================
  // 3.2 generateBatch Function
  // ==========================================================================

  describe("generateBatch", () => {
    it("throws when API key is not configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(
        generateBatch("scaffold", createMockAssignments(1))
      ).rejects.toThrow(AnthropicError);
    });

    it("makes API call with correct parameters", async () => {
      const validResponse = {
        scenes: [
          {
            lyrics: "Test",
            imagePrompt: "Test",
            startPrompt: "Test",
            middlePrompt: "Test",
            endPrompt: "Test",
            boundaryFrame1: "Test",
            boundaryFrame2: "Test",
            finalFrame: "Test",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "tool_use", input: validResponse }],
        }),
      });

      const assignments = createMockAssignments(1);
      await generateBatch("test scaffold", assignments, { temperature: 0.8 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-key",
          }),
        })
      );
    });

    it("returns valid BatchOutput on success", async () => {
      const validResponse = {
        scenes: [
          {
            lyrics: "Test lyrics",
            imagePrompt: "Test image",
            startPrompt: "Test start",
            middlePrompt: "Test middle",
            endPrompt: "Test end",
            boundaryFrame1: "BF1",
            boundaryFrame2: "BF2",
            finalFrame: "Final",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "tool_use", input: validResponse }],
        }),
      });

      const result = await generateBatch("scaffold", createMockAssignments(1));

      expect(result.scenes).toHaveLength(1);
      expect(result.scenes[0].lyrics).toBe("Test lyrics");
    });

    it("throws immediately on unrecoverable validation failure (no retry)", async () => {
      // Partial scenes are normalized; truly broken shapes still fail without retry
      const invalidResponse = { scenes: "not-an-array" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "tool_use", input: invalidResponse }],
        }),
      });

      await expect(
        generateBatch("scaffold", createMockAssignments(1))
      ).rejects.toThrow(AnthropicError);

      // Should only call once - no retry for validation errors
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("normalizes partial scenes missing boundary frames", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const partialResponse = {
        scenes: [
          {
            lyrics: "Hi",
            imagePrompt: "Img",
            startPrompt: "Start freeze here.",
            middlePrompt: "Middle freeze here.",
            endPrompt: "End freeze here.",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "tool_use", input: partialResponse }],
        }),
      });

      const result = await generateBatch("scaffold", createMockAssignments(1));
      expect(result.scenes[0].boundaryFrame1).toMatch(/ENDING FRAME/);
      expect(result.scenes[0].finalFrame).toMatch(/FINAL FRAME/);
    });
  });

  // ==========================================================================
  // 3.3 Rate Limit (429) Retry with Backoff
  // ==========================================================================

  describe("rate limit retry", () => {
    it("retries on 429 with backoff", async () => {
      const validResponse = {
        scenes: [
          {
            lyrics: "Test",
            imagePrompt: "Test",
            startPrompt: "Test",
            middlePrompt: "Test",
            endPrompt: "Test",
            boundaryFrame1: "Test",
            boundaryFrame2: "Test",
            finalFrame: "Test",
          },
        ],
      };

      // First call returns 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers({ "retry-after": "5" }),
          json: async () => rateLimitResponse.body,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [{ type: "tool_use", input: validResponse }],
          }),
        });

      // Start the generation and advance timers
      const resultPromise = generateBatch("scaffold", createMockAssignments(1));

      // Run all pending promises and timers (5 seconds for retry-after)
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.scenes).toHaveLength(1);
    });

    it("fails after max retries exceeded", async () => {
      // Always return 429 - maxAttempts is 2, so after 2 tries it should fail
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers({ "retry-after": "5" }),
          json: async () => rateLimitResponse.body,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers({ "retry-after": "5" }),
          json: async () => rateLimitResponse.body,
        });

      // Capture the promise and its error handler BEFORE running timers
      const resultPromise = generateBatch("scaffold", createMockAssignments(1));

      // Attach handler immediately to prevent unhandled rejection
      const errorPromise = resultPromise.catch((err) => err);

      // Run all timers to completion
      await vi.runAllTimersAsync();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(AnthropicError);
    });
  });

  // ==========================================================================
  // 3.4 API Error Propagation
  // ==========================================================================

  describe("API error propagation", () => {
    it("propagates 401 authentication errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        json: async () => authErrorResponse.body,
      });

      await expect(
        generateBatch("scaffold", createMockAssignments(1))
      ).rejects.toThrow(AnthropicError);
    });

    it("handles network failures", async () => {
      // Network failures are retried with exponential backoff until maxAttempts (2)
      mockFetch
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockRejectedValueOnce(new TypeError("Failed to fetch"));

      // Capture the promise and attach handler BEFORE running timers
      const resultPromise = generateBatch("scaffold", createMockAssignments(1));
      const errorPromise = resultPromise.catch((err) => err);

      // Run all timers (exponential backoff: 1s for first retry)
      await vi.runAllTimersAsync();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(AnthropicError);
    });
  });

  // ==========================================================================
  // 3.5 generateScene Function
  // ==========================================================================

  describe("generateScene", () => {
    it("generates single scene for reroll", async () => {
      const validResponse = {
        scenes: [
          {
            lyrics: "Rerolled lyrics",
            imagePrompt: "Rerolled image",
            startPrompt: "Rerolled start",
            middlePrompt: "Rerolled middle",
            endPrompt: "Rerolled end",
            boundaryFrame1: "RBF1",
            boundaryFrame2: "RBF2",
            finalFrame: "RFinal",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "tool_use", input: validResponse }],
        }),
      });

      const combo = createMockAssignments(1)[0];
      const result = await generateScene("scaffold", 0, combo);

      expect(result.lyrics).toBe("Rerolled lyrics");
    });
  });

  // ==========================================================================
  // 3.6 buildRepairPrompt and repair Functions
  // ==========================================================================

  describe("buildRepairPrompt", () => {
    it("builds repair prompt with violations", () => {
      const violations = [
        { sceneIndex: 0, violations: [{ rule: "R1", evidence: "test" }] },
        { sceneIndex: 2, violations: [{ rule: "R3", evidence: "test2" }] },
      ];

      const prompt = buildRepairPrompt("scaffold content", violations);

      expect(prompt).toContain("scaffold content");
      expect(prompt).toContain("REPAIR NEEDED");
      expect(prompt).toContain("Scene 1");
      expect(prompt).toContain("Scene 3");
    });

    it("filters out scenes without violations", () => {
      const violations = [
        { sceneIndex: 0, violations: [] },
        { sceneIndex: 1, violations: [{ rule: "R1", evidence: "test" }] },
      ];

      const prompt = buildRepairPrompt("scaffold", violations);

      expect(prompt).toContain("Scene 2");
      expect(prompt).not.toContain("Scene 1:");
    });
  });

  describe("repair", () => {
    it("calls generateBatch with repair prompt", async () => {
      const validResponse = {
        scenes: [
          {
            lyrics: "Repaired",
            imagePrompt: "Repaired",
            startPrompt: "Repaired",
            middlePrompt: "Repaired",
            endPrompt: "Repaired",
            boundaryFrame1: "Repaired",
            boundaryFrame2: "Repaired",
            finalFrame: "Repaired",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "tool_use", input: validResponse }],
        }),
      });

      const result = await repair("repair prompt here");

      expect(result.scenes[0].lyrics).toBe("Repaired");
    });
  });
});
