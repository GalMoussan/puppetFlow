/**
 * Tests for Reroll API
 *
 * Per Phase 2 test specification section 6:
 * - Reroll full scene
 * - Reroll single stage
 * - Invalid scene index/stage
 * - Run not found / incomplete
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockScene } from "@/tests/mocks/anthropic-responses";
import { type MockPrismaClient } from "@/tests/mocks/prisma";

// Create hoisted mocks - must be before vi.mock
const mockPrisma = vi.hoisted(() => ({
  themePack: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  blockDefinition: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  flowTemplate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  run: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  scene: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  usageLog: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn: (client: MockPrismaClient) => unknown) => fn({} as MockPrismaClient)),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
})) as unknown as MockPrismaClient;

const mockRerollScene = vi.hoisted(() => vi.fn());
const mockRerollStage = vi.hoisted(() => vi.fn());

// Mock Prisma with hoisted value
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock agent reroll function with hoisted values
vi.mock("@/lib/agent", () => ({
  rerollScene: mockRerollScene,
  rerollStage: mockRerollStage,
}));

// These imports will fail until implementation exists - that's expected (RED phase)
import { POST } from "@/app/api/runs/[id]/reroll/route";

// Helper to create a mock request
// Next.js 16 has different RequestInit type - use eslint-disable to bypass
function createRequest(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any = {}
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

// Sample fixtures
const sampleRun = {
  id: "run-001",
  templateId: "tpl-001",
  status: "DONE",
  scaffold: "# Scaffold content",
  error: null,
  createdAt: new Date("2026-07-05"),
  updatedAt: new Date("2026-07-05"),
};

const sampleScenes = Array.from({ length: 5 }, (_, i) => ({
  ...createMockScene(i, "run-001"),
  id: `scene-${i}`,
}));

describe("api/runs/[id]/reroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 6.1 Reroll Full Scene
  // ==========================================================================

  describe("reroll full scene", () => {
    it("regenerates entire scene", async () => {
      const newScene = createMockScene(2, "run-001");
      newScene.id = "scene-2";
      newScene.combo.hook = "New hook"; // Different from siblings

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });
      mockRerollScene.mockResolvedValue(newScene);
      mockPrisma.scene.update.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.index).toBe(2);
      expect(body.combo.hook).toBe("New hook");
    });

    it("calls rerollScene with correct parameters", async () => {
      const newScene = createMockScene(2, "run-001");
      newScene.id = "scene-2";

      mockRerollScene.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2 }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request, { params: { id: "run-001" } });

      // Verify rerollScene was called with correct params
      expect(mockRerollScene).toHaveBeenCalledWith("run-001", 2, undefined);
    });

    it("returns the rerolled scene data", async () => {
      const newScene = createMockScene(2, "run-001");
      newScene.id = "scene-2";
      newScene.lyrics = "Updated lyrics for scene 2";

      mockRerollScene.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.lyrics).toBe("Updated lyrics for scene 2");
    });

    it("rerolls first scene (index 0)", async () => {
      const newScene = createMockScene(0, "run-001");
      newScene.id = "scene-0";

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });
      mockRerollScene.mockResolvedValue(newScene);
      mockPrisma.scene.update.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 0 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      expect(response.status).toBe(200);
    });

    it("rerolls last scene (index 4)", async () => {
      const newScene = createMockScene(4, "run-001");
      newScene.id = "scene-4";

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });
      mockRerollScene.mockResolvedValue(newScene);
      mockPrisma.scene.update.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 4 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      expect(response.status).toBe(200);
    });

    it("preserves scene ID in response", async () => {
      const newScene = createMockScene(2, "run-001");
      newScene.id = "scene-2"; // Same ID

      mockRerollScene.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe("scene-2");
    });

    it("resets lintReport on reroll", async () => {
      const originalScene = sampleScenes[2];
      originalScene.lintReport = [
        { rule: "R2", severity: "hard", evidence: "violation" },
      ];

      const newScene = createMockScene(2, "run-001");
      newScene.lintReport = []; // Reset

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });
      mockRerollScene.mockResolvedValue(newScene);
      mockPrisma.scene.update.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(body.lintReport).toEqual([]);
    });

    it("returns error when pool exhausted with exclusions", async () => {
      // Import BadRequestError to throw proper error type that route catches as 400
      const { BadRequestError } = await import("@/lib/errors");
      mockRerollScene.mockRejectedValue(new BadRequestError("Pool exhausted with exclusions"));

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("exhausted");
    });
  });

  // ==========================================================================
  // 6.2 Reroll Single Stage
  // ==========================================================================

  describe("reroll single stage", () => {
    it("regenerates single stage prompt (VIDEO_START)", async () => {
      const originalScene = sampleScenes[2];
      const updatedScene = {
        ...originalScene,
        startPrompt: "New start prompt content",
      };

      // Route uses rerollScene, not rerollStage
      mockRerollScene.mockResolvedValue(updatedScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "VIDEO_START" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.startPrompt).toBe("New start prompt content");
    });

    it("passes stage parameter to rerollScene", async () => {
      const originalScene = sampleScenes[2];
      const updatedScene = {
        ...originalScene,
        imagePrompt: "New image prompt",
      };

      mockRerollScene.mockResolvedValue(updatedScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "IMAGE" }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request, { params: { id: "run-001" } });

      // Verify rerollScene was called with stage parameter
      expect(mockRerollScene).toHaveBeenCalledWith("run-001", 2, "IMAGE");
    });

    it("regenerates EXTEND_END with finalFrame", async () => {
      const originalScene = sampleScenes[2];
      const updatedScene = {
        ...originalScene,
        endPrompt: "New end prompt",
        finalFrame: "New final frame",
      };

      mockRerollScene.mockResolvedValue(updatedScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "EXTEND_END" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(body.endPrompt).toBe("New end prompt");
      expect(body.finalFrame).toBe("New final frame");
    });

    it("keeps lyrics unchanged", async () => {
      const originalScene = sampleScenes[2];
      const originalLyrics = originalScene.lyrics;

      const updatedScene = {
        ...originalScene,
        startPrompt: "New start prompt",
        lyrics: originalLyrics, // Unchanged
      };

      mockRerollScene.mockResolvedValue(updatedScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "VIDEO_START" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(body.lyrics).toBe(originalLyrics);
    });

    it("updates boundary frames for EXTEND_MIDDLE", async () => {
      const originalScene = sampleScenes[2];
      const updatedScene = {
        ...originalScene,
        middlePrompt: "New middle prompt",
        boundaryFrame1: "New boundary frame 1",
        boundaryFrame2: "New boundary frame 2",
      };

      mockRerollScene.mockResolvedValue(updatedScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "EXTEND_MIDDLE" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(body.boundaryFrame1).toBe("New boundary frame 1");
      expect(body.boundaryFrame2).toBe("New boundary frame 2");
    });

    it("freezes other stages during regeneration", async () => {
      const originalScene = sampleScenes[2];
      const originalMiddle = originalScene.middlePrompt;
      const originalEnd = originalScene.endPrompt;

      mockRerollScene.mockResolvedValue({
        ...originalScene,
        startPrompt: "New start prompt",
        // middlePrompt and endPrompt unchanged
      });

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "VIDEO_START" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(body.middlePrompt).toBe(originalMiddle);
      expect(body.endPrompt).toBe(originalEnd);
    });
  });

  // ==========================================================================
  // 6.3 Invalid Scene Index
  // ==========================================================================

  describe("invalid scene index", () => {
    it("returns 400 for out-of-range index (exceeds max of 9)", async () => {
      // Schema allows 0-9, so 10 should fail validation
      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 10 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 for negative index", async () => {
      // Schema requires min 0
      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: -1 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      expect(response.status).toBe(400);
    });

    it("returns 400 for non-integer index", async () => {
      // Schema requires integer
      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2.5 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid stage enum value", async () => {
      // Schema rejects invalid enum values
      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "INVALID" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Validation failed");
    });

    it("accepts GLOBAL stage (valid Lane value)", async () => {
      // GLOBAL is a valid Lane in the schema - route passes it to rerollScene
      const newScene = createMockScene(2, "run-001");
      mockRerollScene.mockResolvedValue(newScene);

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "GLOBAL" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      // Should succeed because GLOBAL is valid in LaneSchema
      expect(response.status).toBe(200);
    });

    it("returns 400 for lowercase stage (case-sensitive)", async () => {
      // Enum is case-sensitive
      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 2, stage: "video_start" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      expect(response.status).toBe(400);
    });
  });

  // ==========================================================================
  // 6.4 Run Not Found / Incomplete
  // ==========================================================================

  describe("run not found / incomplete", () => {
    it("returns 404 for nonexistent run", async () => {
      // Route calls rerollScene, which throws NotFoundError when run not found
      const { NotFoundError } = await import("@/lib/errors");
      mockRerollScene.mockRejectedValue(new NotFoundError("Run not found"));

      const request = createRequest("/api/runs/nonexistent/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 0 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Run not found");
    });

    it("returns 409 for incomplete run (GENERATING)", async () => {
      // Route calls rerollScene, which throws ConflictError when run status is not DONE
      const { ConflictError } = await import("@/lib/errors");
      mockRerollScene.mockRejectedValue(new ConflictError("Run not complete"));

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 0 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe("Run not complete");
    });

    it("returns 409 for PENDING run", async () => {
      // Route calls rerollScene, which throws ConflictError when run status is not DONE
      const { ConflictError } = await import("@/lib/errors");
      mockRerollScene.mockRejectedValue(new ConflictError("Run not complete"));

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 0 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      expect(response.status).toBe(409);
    });

    it("returns 409 for FAILED run", async () => {
      // Route calls rerollScene, which throws ConflictError when run status is not DONE
      const { ConflictError } = await import("@/lib/errors");
      mockRerollScene.mockRejectedValue(new ConflictError("Run not complete"));

      const request = createRequest("/api/runs/run-001/reroll", {
        method: "POST",
        body: JSON.stringify({ sceneIndex: 0 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: { id: "run-001" } });

      expect(response.status).toBe(409);
    });
  });
});
