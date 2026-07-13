/**
 * Tests for Blocks CRUD API
 *
 * Per Phase 2 test specification section 2.2:
 * - GET list with filters (type, themePackId, rotationGroup, archived)
 * - GET by ID with includes
 * - POST create with stageScope validation
 * - PATCH archive/unarchive
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
  $transaction: vi.fn((fn: (client: MockPrismaClient) => unknown) => fn({} as MockPrismaClient)),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
})) as unknown as MockPrismaClient;

// Mock Prisma with hoisted value
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// These imports will fail until implementation exists - that's expected (RED phase)
import { GET, POST, PATCH } from "@/app/api/blocks/route";
import { GET as GET_BY_ID, PATCH as PATCH_BY_ID } from "@/app/api/blocks/[id]/route";

// Helper to create a mock request
// Next.js 16 has different RequestInit type - use eslint-disable to bypass
function createRequest(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any = {}
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

// Sample block fixture
const sampleBlock = {
  id: "block-001",
  type: "CAMERA_MOVE",
  name: "Dolly In",
  promptFragment: "Camera dollies in smoothly toward the subject",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
  rotationGroup: "camera",
  themePackId: "pack-1",
  archived: false,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

const sampleThemePack = {
  id: "pack-1",
  name: "Master of Puppets",
  active: true,
};

describe("api/blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/blocks - List with filters
  // ==========================================================================

  describe("GET /api/blocks", () => {
    it("returns all blocks without filters", async () => {
      const blocks = Array.from({ length: 20 }, (_, i) => ({
        ...sampleBlock,
        id: `block-${i.toString().padStart(3, "0")}`,
        name: `Block ${i}`,
      }));

      mockPrisma.blockDefinition.findMany.mockResolvedValue(blocks.slice(0, 10));
      mockPrisma.blockDefinition.count.mockResolvedValue(20);

      const request = createRequest("/api/blocks?limit=10");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(10);
      expect(body.hasMore).toBe(true);
    });

    it("filters by type", async () => {
      const cameraBlocks = Array.from({ length: 5 }, (_, i) => ({
        ...sampleBlock,
        id: `camera-${i}`,
        type: "CAMERA_MOVE",
      }));

      mockPrisma.blockDefinition.findMany.mockResolvedValue(cameraBlocks);
      mockPrisma.blockDefinition.count.mockResolvedValue(5);

      const request = createRequest("/api/blocks?type=CAMERA_MOVE&limit=5");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(5);
      expect(mockPrisma.blockDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "CAMERA_MOVE",
          }),
        })
      );
    });

    it("filters by themePackId", async () => {
      mockPrisma.blockDefinition.findMany.mockResolvedValue([sampleBlock]);
      mockPrisma.blockDefinition.count.mockResolvedValue(1);

      const request = createRequest("/api/blocks?themePackId=pack-1");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.blockDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            themePackId: "pack-1",
          }),
        })
      );
    });

    it("filters by rotationGroup", async () => {
      mockPrisma.blockDefinition.findMany.mockResolvedValue([sampleBlock]);
      mockPrisma.blockDefinition.count.mockResolvedValue(1);

      const request = createRequest("/api/blocks?rotationGroup=camera");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.blockDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rotationGroup: "camera",
          }),
        })
      );
    });

    it("filters by archived=false by default", async () => {
      mockPrisma.blockDefinition.findMany.mockResolvedValue([sampleBlock]);
      mockPrisma.blockDefinition.count.mockResolvedValue(1);

      const request = createRequest("/api/blocks");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.blockDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archived: false,
          }),
        })
      );
    });

    it("includes archived blocks when archived=true", async () => {
      const archivedBlock = { ...sampleBlock, archived: true };
      mockPrisma.blockDefinition.findMany.mockResolvedValue([archivedBlock]);
      mockPrisma.blockDefinition.count.mockResolvedValue(1);

      const request = createRequest("/api/blocks?archived=true");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.blockDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archived: true,
          }),
        })
      );
    });

    it("combines multiple filters", async () => {
      mockPrisma.blockDefinition.findMany.mockResolvedValue([sampleBlock]);
      mockPrisma.blockDefinition.count.mockResolvedValue(1);

      const request = createRequest(
        "/api/blocks?type=CAMERA_MOVE&themePackId=pack-1&rotationGroup=camera&limit=5"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.blockDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "CAMERA_MOVE",
            themePackId: "pack-1",
            rotationGroup: "camera",
            archived: false,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/blocks/[id] - Get by ID
  // ==========================================================================

  describe("GET /api/blocks/[id]", () => {
    it("returns block by ID", async () => {
      mockPrisma.blockDefinition.findUnique.mockResolvedValue(sampleBlock);

      const request = createRequest("/api/blocks/block-001");
      const response = await GET_BY_ID(request, { params: { id: "block-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe("block-001");
      expect(body.type).toBe("CAMERA_MOVE");
    });

    it("returns 404 for nonexistent block", async () => {
      mockPrisma.blockDefinition.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/blocks/nonexistent");
      const response = await GET_BY_ID(request, { params: { id: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Block not found");
    });

    it("includes themePack when ?include=themePack", async () => {
      const blockWithThemePack = {
        ...sampleBlock,
        themePack: sampleThemePack,
      };

      mockPrisma.blockDefinition.findUnique.mockResolvedValue(blockWithThemePack);

      const request = createRequest("/api/blocks/block-001?include=themePack");
      const response = await GET_BY_ID(request, { params: { id: "block-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.themePack).toBeDefined();
      expect(body.themePack.name).toBe("Master of Puppets");
    });
  });

  // ==========================================================================
  // POST /api/blocks - Create
  // ==========================================================================

  describe("POST /api/blocks", () => {
    it("creates block with valid stageScope", async () => {
      const newBlock = {
        type: "CAMERA_MOVE",
        name: "Pan Left",
        promptFragment: "Camera pans smoothly left",
        stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
        rotationGroup: "camera",
        themePackId: "pack-1",
      };

      const createdBlock = {
        ...newBlock,
        id: "block-new-001",
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.blockDefinition.create.mockResolvedValue(createdBlock);

      const request = createRequest("/api/blocks", {
        method: "POST",
        body: JSON.stringify(newBlock),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.id).toBe("block-new-001");
      expect(body.stageScope).toEqual(["VIDEO_START", "EXTEND_MIDDLE"]);
    });

    it("rejects invalid lane in stageScope with 400", async () => {
      const invalidBlock = {
        type: "CAMERA_MOVE",
        name: "Invalid",
        promptFragment: "Test",
        stageScope: ["INVALID_LANE"],
        themePackId: "pack-1",
      };

      const request = createRequest("/api/blocks", {
        method: "POST",
        body: JSON.stringify(invalidBlock),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Validation failed");
    });

    it("accepts empty stageScope (block applies nowhere)", async () => {
      const blockWithEmptyScope = {
        type: "CUSTOM",
        name: "Disabled Block",
        promptFragment: "Test",
        stageScope: [],
        themePackId: "pack-1",
      };

      const createdBlock = {
        ...blockWithEmptyScope,
        id: "block-empty-001",
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.blockDefinition.create.mockResolvedValue(createdBlock);

      const request = createRequest("/api/blocks", {
        method: "POST",
        body: JSON.stringify(blockWithEmptyScope),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("handles GLOBAL in stageScope", async () => {
      const globalBlock = {
        type: "CHARACTER_LOCK",
        name: "Lock Shika",
        promptFragment: "Lock Shika character throughout",
        stageScope: ["GLOBAL"],
        themePackId: "pack-1",
      };

      const createdBlock = {
        ...globalBlock,
        id: "block-global-001",
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.blockDefinition.create.mockResolvedValue(createdBlock);

      const request = createRequest("/api/blocks", {
        method: "POST",
        body: JSON.stringify(globalBlock),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("creates global block (null themePackId)", async () => {
      const globalBlock = {
        type: "STYLE_LOCK",
        name: "Global Style",
        promptFragment: "Apply global style",
        stageScope: ["GLOBAL"],
        themePackId: null,
      };

      const createdBlock = {
        ...globalBlock,
        id: "block-global-002",
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.blockDefinition.create.mockResolvedValue(createdBlock);

      const request = createRequest("/api/blocks", {
        method: "POST",
        body: JSON.stringify(globalBlock),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("rejects invalid block type with 400", async () => {
      const invalidTypeBlock = {
        type: "INVALID_TYPE",
        name: "Test",
        promptFragment: "Test",
        stageScope: ["IMAGE"],
      };

      const request = createRequest("/api/blocks", {
        method: "POST",
        body: JSON.stringify(invalidTypeBlock),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  // ==========================================================================
  // PATCH /api/blocks/[id] - Archive/Unarchive
  // ==========================================================================

  describe("PATCH /api/blocks/[id]", () => {
    it("archives block", async () => {
      mockPrisma.blockDefinition.findUnique.mockResolvedValue(sampleBlock);
      mockPrisma.blockDefinition.update.mockResolvedValue({
        ...sampleBlock,
        archived: true,
      });

      const request = createRequest("/api/blocks/block-001", {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "block-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.archived).toBe(true);
    });

    it("unarchives block", async () => {
      const archivedBlock = { ...sampleBlock, archived: true };

      mockPrisma.blockDefinition.findUnique.mockResolvedValue(archivedBlock);
      mockPrisma.blockDefinition.update.mockResolvedValue({
        ...archivedBlock,
        archived: false,
      });

      const request = createRequest("/api/blocks/block-001", {
        method: "PATCH",
        body: JSON.stringify({ archived: false }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "block-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.archived).toBe(false);
    });

    it("returns 404 for nonexistent block", async () => {
      mockPrisma.blockDefinition.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/blocks/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Block not found");
    });

    it("updates other fields", async () => {
      mockPrisma.blockDefinition.findUnique.mockResolvedValue(sampleBlock);
      mockPrisma.blockDefinition.update.mockResolvedValue({
        ...sampleBlock,
        name: "Updated Name",
        promptFragment: "Updated fragment",
      });

      const request = createRequest("/api/blocks/block-001", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Name",
          promptFragment: "Updated fragment",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "block-001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe("Updated Name");
    });
  });
});
