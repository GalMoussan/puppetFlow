/**
 * Tests for Templates CRUD API
 *
 * Per Phase 2 test specification section 2.3:
 * - GET list with themePack name
 * - GET by ID with full graph
 * - POST create with graph validation
 * - PATCH update graph (autosave)
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { CanvasGraph } from "@/packages/domain/types";
import { type MockPrismaClient } from "@/tests/mocks/prisma";

// Create hoisted mock for Prisma - must be before vi.mock
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
  templateVersion: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn: (client: MockPrismaClient) => unknown) => fn({} as MockPrismaClient)),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
})) as unknown as MockPrismaClient;

// Mock Prisma with hoisted value
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// These imports will fail until implementation exists - that's expected (RED phase)
import { GET, POST } from "@/app/api/templates/route";
import { GET as GET_BY_ID, PATCH as PATCH_BY_ID } from "@/app/api/templates/[id]/route";

// Helper to create a mock request
// Next.js 16 has different RequestInit type - use eslint-disable to bypass
function createRequest(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any = {}
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

// Sample graph fixture
const sampleGraph: CanvasGraph = {
  version: 1,
  lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  nodes: [],
  edges: [],
  runConfig: {
    loopMode: true,
    languages: { hi: 3, ja: 2 },
    batchSize: 5,
  },
};

// Sample template fixture
const sampleTemplate = {
  id: "tpl-001",
  name: "Festival Template v1",
  graph: sampleGraph,
  themePackId: "pack-1",
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

const sampleThemePack = {
  id: "pack-1",
  name: "Master of Puppets",
  active: true,
};

describe("api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/templates - List with themePack name
  // ==========================================================================

  describe("GET /api/templates", () => {
    it("returns templates with themePack name", async () => {
      const templates = [
        { ...sampleTemplate, themePack: sampleThemePack },
        {
          ...sampleTemplate,
          id: "tpl-002",
          name: "Template 2",
          themePack: sampleThemePack,
        },
      ];

      mockPrisma.flowTemplate.findMany.mockResolvedValue(templates);
      mockPrisma.flowTemplate.count.mockResolvedValue(2);

      const request = createRequest("/api/templates");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].themePack.name).toBe("Master of Puppets");
    });

    it("returns paginated results", async () => {
      const templates = Array.from({ length: 5 }, (_, i) => ({
        ...sampleTemplate,
        id: `tpl-${i.toString().padStart(3, "0")}`,
        themePack: sampleThemePack,
      }));

      mockPrisma.flowTemplate.findMany.mockResolvedValue(templates);
      mockPrisma.flowTemplate.count.mockResolvedValue(10);

      const request = createRequest("/api/templates?limit=5");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(5);
      expect(body.hasMore).toBe(true);
    });

    it("filters by themePackId", async () => {
      mockPrisma.flowTemplate.findMany.mockResolvedValue([
        { ...sampleTemplate, themePack: sampleThemePack },
      ]);
      mockPrisma.flowTemplate.count.mockResolvedValue(1);

      const request = createRequest("/api/templates?themePackId=pack-1");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.flowTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            themePackId: "pack-1",
          }),
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/templates/[id] - Get by ID with full graph
  // ==========================================================================

  describe("GET /api/templates/[id]", () => {
    it("returns template with full graph", async () => {
      mockPrisma.flowTemplate.findUnique.mockResolvedValue(sampleTemplate);

      const request = createRequest("/api/templates/tpl-001");
      const response = await GET_BY_ID(request, { params: { id: "tpl-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe("tpl-001");
      expect(body.graph).toBeDefined();
      expect(body.graph.version).toBe(1);
      expect(body.graph.lanes).toHaveLength(5);
    });

    it("returns 404 for nonexistent template", async () => {
      mockPrisma.flowTemplate.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/templates/nonexistent");
      const response = await GET_BY_ID(request, { params: { id: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Template not found");
    });

    it("returns template with complex graph (50+ nodes)", async () => {
      const complexGraph: CanvasGraph = {
        ...sampleGraph,
        nodes: Array.from({ length: 50 }, (_, i) => ({
          id: `node-${i}`,
          blockDefId: `block-${i}`,
          lane: "VIDEO_START" as const,
          order: i,
        })),
        edges: Array.from({ length: 10 }, () => ({
          from: "VIDEO_START" as const,
          to: "EXTEND_MIDDLE" as const,
          handshake: { strictness: "verbatim" as const, trackCrowdMembers: 2 },
        })),
      };

      const templateWithComplexGraph = {
        ...sampleTemplate,
        graph: complexGraph,
      };

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(templateWithComplexGraph);

      const request = createRequest("/api/templates/tpl-001");
      const response = await GET_BY_ID(request, { params: { id: "tpl-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.graph.nodes).toHaveLength(50);
    });
  });

  // ==========================================================================
  // POST /api/templates - Create with graph validation
  // ==========================================================================

  describe("POST /api/templates", () => {
    it("creates template with valid graph", async () => {
      const newTemplate = {
        name: "New Template",
        graph: sampleGraph,
        themePackId: "pack-1",
      };

      const createdTemplate = {
        ...newTemplate,
        id: "tpl-new-001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.flowTemplate.create.mockResolvedValue(createdTemplate);

      const request = createRequest("/api/templates", {
        method: "POST",
        body: JSON.stringify(newTemplate),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.id).toBe("tpl-new-001");
      expect(body.graph.version).toBe(1);
    });

    it("rejects graph with invalid version (not 1) with 400", async () => {
      const invalidTemplate = {
        name: "Invalid Template",
        graph: {
          ...sampleGraph,
          version: 2,
        },
        themePackId: "pack-1",
      };

      const request = createRequest("/api/templates", {
        method: "POST",
        body: JSON.stringify(invalidTemplate),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Validation failed");
      // Zod includes version in the detailed error path
      expect(body.details).toBeDefined();
    });

    it("rejects graph with invalid lane in nodes with 400", async () => {
      const invalidTemplate = {
        name: "Invalid Template",
        graph: {
          ...sampleGraph,
          nodes: [
            {
              id: "node-1",
              blockDefId: "block-1",
              lane: "INVALID_LANE",
              order: 0,
            },
          ],
        },
        themePackId: "pack-1",
      };

      const request = createRequest("/api/templates", {
        method: "POST",
        body: JSON.stringify(invalidTemplate),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("rejects graph with missing runConfig with 400", async () => {
      const invalidTemplate = {
        name: "Invalid Template",
        graph: {
          version: 1,
          lanes: sampleGraph.lanes,
          nodes: [],
          edges: [],
          // Missing runConfig
        },
        themePackId: "pack-1",
      };

      const request = createRequest("/api/templates", {
        method: "POST",
        body: JSON.stringify(invalidTemplate),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("accepts graph with empty nodes and edges arrays", async () => {
      const emptyGraphTemplate = {
        name: "Empty Canvas",
        graph: sampleGraph, // Has empty nodes and edges
        themePackId: "pack-1",
      };

      const createdTemplate = {
        ...emptyGraphTemplate,
        id: "tpl-empty-001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.flowTemplate.create.mockResolvedValue(createdTemplate);

      const request = createRequest("/api/templates", {
        method: "POST",
        body: JSON.stringify(emptyGraphTemplate),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("returns 404 if themePack does not exist", async () => {
      mockPrisma.themePack.findUnique.mockResolvedValue(null);

      const template = {
        name: "Orphan Template",
        graph: sampleGraph,
        themePackId: "nonexistent-pack",
      };

      const request = createRequest("/api/templates", {
        method: "POST",
        body: JSON.stringify(template),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toContain("Theme pack not found");
    });
  });

  // ==========================================================================
  // PATCH /api/templates/[id] - Update graph (autosave)
  // ==========================================================================

  describe("PATCH /api/templates/[id]", () => {
    it("updates graph (autosave pattern)", async () => {
      const updatedGraph: CanvasGraph = {
        ...sampleGraph,
        nodes: [
          {
            id: "node-1",
            blockDefId: "block-1",
            lane: "IMAGE",
            order: 0,
          },
        ],
      };

      mockPrisma.flowTemplate.findUnique.mockResolvedValue({
        ...sampleTemplate,
        currentVersion: 1,
      });
      mockPrisma.templateVersion.create.mockResolvedValue({
        id: "ver-1",
        templateId: "tpl-001",
        version: 1,
        graph: sampleGraph,
        createdAt: new Date(),
      });
      mockPrisma.flowTemplate.update.mockResolvedValue({
        ...sampleTemplate,
        graph: updatedGraph,
        currentVersion: 2,
        updatedAt: new Date(),
      });

      const request = createRequest("/api/templates/tpl-001", {
        method: "PATCH",
        body: JSON.stringify({ graph: updatedGraph }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "tpl-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.graph.nodes).toHaveLength(1);
    });

    it("refreshes updatedAt on update", async () => {
      const originalDate = new Date("2026-07-01");
      const newDate = new Date("2026-07-10");

      mockPrisma.flowTemplate.findUnique.mockResolvedValue({
        ...sampleTemplate,
        updatedAt: originalDate,
      });
      mockPrisma.flowTemplate.update.mockResolvedValue({
        ...sampleTemplate,
        updatedAt: newDate,
      });

      const request = createRequest("/api/templates/tpl-001", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "tpl-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
        originalDate.getTime()
      );
    });

    it("returns 404 for nonexistent template", async () => {
      mockPrisma.flowTemplate.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/templates/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Template not found");
    });

    it("handles concurrent updates (last write wins)", async () => {
      // Simulate two concurrent updates
      const update1 = { name: "Update 1" };
      const update2 = { name: "Update 2" };

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(sampleTemplate);
      mockPrisma.flowTemplate.update
        .mockResolvedValueOnce({ ...sampleTemplate, name: "Update 1" })
        .mockResolvedValueOnce({ ...sampleTemplate, name: "Update 2" });

      const request1 = createRequest("/api/templates/tpl-001", {
        method: "PATCH",
        body: JSON.stringify(update1),
        headers: { "Content-Type": "application/json" },
      });

      const request2 = createRequest("/api/templates/tpl-001", {
        method: "PATCH",
        body: JSON.stringify(update2),
        headers: { "Content-Type": "application/json" },
      });

      // Execute both updates
      await PATCH_BY_ID(request1, { params: { id: "tpl-001" } });
      const response2 = await PATCH_BY_ID(request2, { params: { id: "tpl-001" } });
      const body2 = await response2.json();

      // Last write wins
      expect(body2.name).toBe("Update 2");
    });

    it("validates graph on partial update", async () => {
      const invalidGraph = {
        version: 2, // Invalid
        lanes: sampleGraph.lanes,
        nodes: [],
        edges: [],
        runConfig: sampleGraph.runConfig,
      };

      mockPrisma.flowTemplate.findUnique.mockResolvedValue(sampleTemplate);

      const request = createRequest("/api/templates/tpl-001", {
        method: "PATCH",
        body: JSON.stringify({ graph: invalidGraph }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "tpl-001" } });

      expect(response.status).toBe(400);
    });
  });
});
