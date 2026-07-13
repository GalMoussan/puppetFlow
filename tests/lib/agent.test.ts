/**
 * Tests for Agent Orchestrator
 *
 * Per Phase 2 test specification section 4:
 * - Happy path: compile -> generate -> lint -> persist
 * - Lint failure -> repair pass -> persist
 * - Lint failure -> repair failure -> persist with warnings
 * - Variety engine error handling
 * - SSE event emission sequence
 *
 * Coverage target: >= 85% line coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  runBatch,
  AgentEventEmitter,
  VarietyError,
  type SSEEmitter,
  type RunResult,
} from "@/lib/agent";

import type { SSEEvent, RunConfigInput } from "@/lib/schemas";

// Type alias for test events (SSEEvent with optional extra fields for test assertions)
type TestEvent = SSEEvent & { timestamp?: number; preview?: string };

import { createMockPrisma, type MockPrismaClient } from "@/tests/mocks/prisma";
import {
  createMockBatchOutput,
  createMockBatchOutputWithViolations,
} from "@/tests/mocks/anthropic-responses";

import type { CanvasGraph, RunConfig, Violation } from "@/packages/domain/types";

// Mock dependencies - use async factory to ensure imports are available
vi.mock("@/lib/db", async () => {
  const { createMockPrisma } = await import("@/tests/mocks/prisma");
  return { prisma: createMockPrisma() };
});

vi.mock("@/lib/anthropic", () => ({
  generateBatch: vi.fn(),
  repair: vi.fn(),
  buildRepairPrompt: vi.fn().mockReturnValue("repair prompt"),
  hasAnthropicKey: vi.fn().mockReturnValue(true),
  getModelName: vi.fn().mockReturnValue("claude-sonnet-4-20250514"),
}));

// Mock variety module at top level - individual tests can override with mockImplementation
// assign returns ComboAssignment[] so default to empty array
vi.mock("@/packages/domain/variety", () => ({
  assign: vi.fn().mockImplementation(() => []),
  VarietyError: class VarietyError extends Error {
    constructor(public code: string, public axis: string, message: string, public details?: Record<string, unknown>) {
      super(message);
      this.name = "VarietyError";
    }
  },
}));

// Import mocked modules
import { prisma } from "@/lib/db";
import { generateBatch, repair } from "@/lib/anthropic";
import { assign as varietyAssign } from "@/packages/domain/variety";

const mockPrisma = prisma as unknown as MockPrismaClient;
const mockGenerateBatch = generateBatch as ReturnType<typeof vi.fn>;
const mockRepair = repair as ReturnType<typeof vi.fn>;
const mockVarietyAssign = varietyAssign as ReturnType<typeof vi.fn>;

describe("lib/agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create a valid template with graph
  const createMockTemplate = (id: string = "tpl-1") => ({
    id,
    name: "Test Template",
    graph: {
      version: 1,
      lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      nodes: [],
      edges: [],
      runConfig: {
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        batchSize: 5,
      },
    } as CanvasGraph,
    themePackId: "pack-1",
    themePack: {
      id: "pack-1",
      name: "Test Pack",
      active: true,
      canon: {
        hooks: ["surprise entrance", "dramatic lighting"],
        cameras: ["dolly", "pan", "crane up"],
        dynamics: ["synchronized", "call-response"],
        visuals: ["neon strings", "golden glow"],
        gags: ["tangled strings", "puppet falls"],
        payoffs: ["crowd sync", "confetti burst"],
        chaosThreads: ["rogue balloon", "lost phone"],
        stages: ["Main Stage", "Pyramid Stage"],
        moments: ["Sunset Arrival", "Peak Hour"],
        languages: ["hi", "ja"],
        subgenres: ["psycore", "techno"],
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ==========================================================================
  // 4.1 Happy Path: compile -> generate -> lint (clean) -> persist
  // ==========================================================================

  describe("happy path: compile -> generate -> lint -> persist", () => {
    it("successful batch generation end-to-end", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      // Setup mocks
      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({
        id: "run-1",
        templateId: template.id,
        status: "PENDING",
        scaffold: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      // Execute with mock emitter
      const mockEmitter: SSEEmitter = vi.fn();
      const result = await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Verify run was created
      expect(mockPrisma.run.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: template.id,
            status: "PENDING",
          }),
        })
      );

      // Verify status transitions
      expect(mockPrisma.run.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "COMPILING" }),
        })
      );
      expect(mockPrisma.run.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "GENERATING" }),
        })
      );
      expect(mockPrisma.run.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "LINTING" }),
        })
      );
      expect(mockPrisma.run.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DONE" }),
        })
      );

      // Verify scenes and usage logs persisted
      expect(mockPrisma.scene.createMany).toHaveBeenCalled();
      expect(mockPrisma.usageLog.createMany).toHaveBeenCalled();

      expect(result.status).toBe("DONE");
      expect(result.sceneCount).toBe(5);
    });

    it("handles single scene batch (batchSize: 1)", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 1);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({
        id: "run-1",
        status: "PENDING",
      });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 1 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const mockEmitter: SSEEmitter = vi.fn();
      const result = await runBatch(template.id, {
        batchSize: 1,
        loopMode: true,
        languages: { hi: 0, ja: 1 },
        historyStrictness: "warn",
      }, mockEmitter);

      expect(result.sceneCount).toBe(1);
    });

    it("handles loop mode off", async () => {
      const template = createMockTemplate();
      template.graph.runConfig.loopMode = false;
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const mockEmitter: SSEEmitter = vi.fn();
      const result = await runBatch(template.id, {
        loopMode: false,
        batchSize: 5,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Verify loopMode was passed correctly
      expect(mockGenerateBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          loopMode: false,
        })
      );
      expect(result.status).toBe("DONE");
    });

    it("emits SSE events in correct order", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      // Verify event sequence
      expect(events[0]).toEqual(
        expect.objectContaining({ type: "phase", phase: "COMPILING" })
      );
      expect(events[1]).toEqual(
        expect.objectContaining({ type: "phase", phase: "GENERATING" })
      );

      // Scene events (indices 0-4)
      const sceneEvents = events.filter((e) => e.type === "scene");
      expect(sceneEvents).toHaveLength(5);
      expect(sceneEvents[0]).toEqual(
        expect.objectContaining({ type: "scene", index: 0 })
      );

      // Linting phase
      expect(events.find((e) => e.type === "phase" && e.phase === "LINTING")).toBeDefined();

      // Done event
      const doneEvent = events.find((e) => e.type === "done");
      expect(doneEvent).toEqual(
        expect.objectContaining({
          type: "done",
          runId: "run-1",
          sceneCount: 5,
        })
      );
    });

    it("handles client disconnect mid-stream gracefully", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockImplementation(async () => {
        // Simulate some delay
        await new Promise((r) => setTimeout(r, 100));
        return batchOutput;
      });

      // Track if emitter is disconnected
      let disconnected = false;
      const emitter: SSEEmitter = (event) => {
        if (disconnected) return; // Don't emit if disconnected
      };

      // Start run but disconnect after first event
      const runPromise = runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      // Simulate disconnect
      setTimeout(() => { disconnected = true; }, 50);

      // Run should complete without throwing
      await expect(runPromise).resolves.toBeDefined();
    });
  });

  // ==========================================================================
  // 4.2 Lint Failure -> Repair Pass -> Persist
  // ==========================================================================

  describe("lint failure -> repair pass -> persist", () => {
    it("repair pass triggered on lint violations", async () => {
      const template = createMockTemplate();
      const initialOutput = createMockBatchOutputWithViolations("run-1");
      const repairedOutput = createMockBatchOutput("run-1", 5); // Clean after repair

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(initialOutput);
      mockRepair.mockResolvedValue(repairedOutput);

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      const result = await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      // Verify status transitions include REPAIRING
      const phaseEvents = events.filter((e) => e.type === "phase");
      const phases = phaseEvents.map((e) => e.phase);
      expect(phases).toContain("REPAIRING");

      // Verify repair was called with violations
      expect(mockRepair).toHaveBeenCalled();

      expect(result.status).toBe("DONE");
    });

    it("repair pass receives violation details", async () => {
      const template = createMockTemplate();
      const initialOutput = createMockBatchOutputWithViolations("run-1");
      const repairedOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(initialOutput);
      mockRepair.mockResolvedValue(repairedOutput);

      const mockEmitter: SSEEmitter = vi.fn();
      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Verify repair was called with violations array
      expect(mockRepair).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          violations: expect.arrayContaining([
            expect.objectContaining({
              rule: expect.any(String),
              evidence: expect.any(String),
            }),
          ]),
        })
      );
    });

    it("does not trigger repair for warn-only violations", async () => {
      const template = createMockTemplate();
      const output = createMockBatchOutput("run-1", 5);
      // Add only warn-level violations
      output.scenes[0].lintReport = [
        { rule: "R14", severity: "warn", evidence: "Minor variety concern" },
      ];

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(output);

      const mockEmitter: SSEEmitter = vi.fn();
      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Repair should NOT be called for warn-only violations
      expect(mockRepair).not.toHaveBeenCalled();
    });

    it("triggers repair for mix of hard and warn violations", async () => {
      const template = createMockTemplate();
      const output = createMockBatchOutput("run-1", 5);
      output.scenes[0].lintReport = [
        { rule: "R14", severity: "warn", evidence: "Minor variety concern" },
        { rule: "R2", severity: "hard", evidence: "No camera verb" },
      ];

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(output);
      mockRepair.mockResolvedValue(createMockBatchOutput("run-1", 5));

      const mockEmitter: SSEEmitter = vi.fn();
      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      expect(mockRepair).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 4.3 Lint Failure -> Repair Failure -> Persist with Warnings
  // ==========================================================================

  describe("lint failure -> repair failure -> persist with warnings", () => {
    it("persists with warnings after failed repair", async () => {
      const template = createMockTemplate();
      const outputWithViolations = createMockBatchOutputWithViolations("run-1");

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(outputWithViolations);
      // Repair returns still-invalid output
      mockRepair.mockResolvedValue(outputWithViolations);

      const mockEmitter: SSEEmitter = vi.fn();
      const result = await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Should complete as DONE (not FAILED)
      expect(result.status).toBe("DONE");

      // Verify scenes were persisted WITH lintReport
      expect(mockPrisma.scene.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              lintReport: expect.arrayContaining([
                expect.objectContaining({ severity: "hard" }),
              ]),
            }),
          ]),
        })
      );
    });

    it("does not attempt second repair (single retry limit)", async () => {
      const template = createMockTemplate();
      const outputWithViolations = createMockBatchOutputWithViolations("run-1");

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(outputWithViolations);
      mockRepair.mockResolvedValue(outputWithViolations);

      const mockEmitter: SSEEmitter = vi.fn();
      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Repair should be called exactly once
      expect(mockRepair).toHaveBeenCalledTimes(1);
    });

    it("persists lintReport per scene correctly", async () => {
      const template = createMockTemplate();
      const output = createMockBatchOutput("run-1", 5);

      // Scene 1 and 3 have violations
      output.scenes[1].lintReport = [
        { rule: "R2", severity: "hard", sceneIndex: 1, evidence: "violation1" },
      ];
      output.scenes[3].lintReport = [
        { rule: "R3", severity: "hard", sceneIndex: 3, evidence: "violation2" },
      ];

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(output);
      mockRepair.mockResolvedValue(output); // Repair doesn't fix

      const mockEmitter: SSEEmitter = vi.fn();
      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Verify createMany was called with correct per-scene violations
      const createManyCall = mockPrisma.scene.createMany.mock.calls[0][0];
      expect(createManyCall.data[0].lintReport).toEqual([]);
      expect(createManyCall.data[1].lintReport).toHaveLength(1);
      expect(createManyCall.data[2].lintReport).toEqual([]);
      expect(createManyCall.data[3].lintReport).toHaveLength(1);
      expect(createManyCall.data[4].lintReport).toEqual([]);
    });
  });

  // ==========================================================================
  // 4.4 Variety Engine Error Handling
  // ==========================================================================

  describe("variety engine error handling", () => {
    it("handles VarietyError when pool exhausted", async () => {
      const template = createMockTemplate();

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });

      // Mock variety engine throwing pool_exhausted error
      mockVarietyAssign.mockImplementation(() => {
        const error = new Error(
          "Variety constraint failed: pool_exhausted for axis 'hook' (need 5, have 3)"
        );
        error.name = "VarietyError";
        throw error;
      });

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      const result = await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      // Verify run failed
      expect(result.status).toBe("FAILED");
      expect(result.error).toContain("pool_exhausted");
      expect(result.error).toContain("hook");

      // Verify error event emitted
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
    });

    it("handles VarietyError when language constraint impossible", async () => {
      const template = createMockTemplate();
      // Language weights sum to 7, but batchSize is 5
      template.graph.runConfig.languages = { hi: 4, ja: 3 };
      template.graph.runConfig.batchSize = 5;

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });

      const mockEmitter: SSEEmitter = vi.fn();
      const result = await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 4, ja: 3 },
        historyStrictness: "warn",
      }, mockEmitter);

      expect(result.status).toBe("FAILED");
      expect(result.error).toContain("language");
    });

    it("handles history collision as warning in non-strict mode", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const mockEmitter: SSEEmitter = vi.fn();
      const result = await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, mockEmitter);

      // Should proceed with warning, not fail
      expect(result.status).toBe("DONE");
    });

    it("handles history collision as error in strict mode", async () => {
      const template = createMockTemplate();

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });

      // Mock history collision error
      mockVarietyAssign.mockImplementation(() => {
        const error = new Error("History collision detected");
        error.name = "VarietyError";
        throw error;
      });

      const mockEmitter: SSEEmitter = vi.fn();
      const result = await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "hard-fail",
      }, mockEmitter);

      expect(result.status).toBe("FAILED");
    });
  });

  // ==========================================================================
  // 4.5 SSE Event Emission Sequence
  // ==========================================================================

  describe("SSE event emission sequence", () => {
    it("emits all phases with correct event structure", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      // Verify complete event sequence
      const expectedSequence = [
        { type: "phase", phase: "COMPILING" },
        { type: "phase", phase: "GENERATING" },
        { type: "scene", index: 0 },
        { type: "scene", index: 1 },
        { type: "scene", index: 2 },
        { type: "scene", index: 3 },
        { type: "scene", index: 4 },
        { type: "phase", phase: "LINTING" },
        { type: "done" },
      ];

      // Check types and phases match
      expectedSequence.forEach((expected, i) => {
        expect(events[i]).toMatchObject(expected);
      });
    });

    it("includes timestamps that are monotonically increasing", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      // Verify timestamps are monotonically increasing
      for (let i = 1; i < events.length; i++) {
        if (events[i].timestamp && events[i - 1].timestamp) {
          expect(events[i].timestamp).toBeGreaterThanOrEqual(
            events[i - 1].timestamp!
          );
        }
      }
    });

    it("error events include context", async () => {
      const template = createMockTemplate();

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });

      // Make generation fail
      mockGenerateBatch.mockRejectedValue(new Error("Anthropic API error: timeout"));

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      // Find error event
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent).toMatchObject({
        type: "error",
        phase: "GENERATING",
        error: expect.stringContaining("Anthropic API error"),
        runId: "run-1",
      });
    });

    it("done event includes duration", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      const doneEvent = events.find((e) => e.type === "done");
      expect(doneEvent).toMatchObject({
        type: "done",
        duration: expect.any(Number),
        runId: "run-1",
        sceneCount: 5,
      });
    });

    it("scene events include preview data", async () => {
      const template = createMockTemplate();
      const batchOutput = createMockBatchOutput("run-1", 5);

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(template);
      mockPrisma.run.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
      mockPrisma.run.update.mockResolvedValue({ id: "run-1" });
      mockPrisma.scene.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.usageLog.createMany.mockResolvedValue({ count: 5 });

      mockGenerateBatch.mockResolvedValue(batchOutput);

      const events: TestEvent[] = [];
      const emitter: SSEEmitter = (event) => events.push(event as TestEvent);

      await runBatch(template.id, {
        batchSize: 5,
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
      }, emitter);

      const sceneEvents = events.filter((e) => e.type === "scene");
      sceneEvents.forEach((event, index) => {
        expect(event).toMatchObject({
          type: "scene",
          index,
          preview: expect.any(String),
        });
        // Preview should be truncated (first 100 chars)
        expect(event.preview!.length).toBeLessThanOrEqual(100);
      });
    });
  });
});
