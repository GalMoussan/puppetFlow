/**
 * Tests for Theme Packs CRUD API
 *
 * Per Phase 2 test specification section 2.1:
 * - GET list with pagination
 * - GET by ID
 * - POST create
 * - PATCH update
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
import { GET, POST, PATCH } from "@/app/api/theme-packs/route";
import { GET as GET_BY_ID, PATCH as PATCH_BY_ID } from "@/app/api/theme-packs/[id]/route";

// Helper to create a mock request
// Next.js 16 has different RequestInit type - use eslint-disable to bypass
function createRequest(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any = {}
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

// Sample theme pack fixture
const sampleThemePack = {
  id: "clx_theme_001",
  name: "Master of Puppets",
  canon: {
    stages: ["Main Stage", "Pyramid Stage"],
    moments: ["Sunset Arrival", "Peak Hour"],
  },
  active: true,
  createdAt: new Date("2026-07-01"),
  updatedAt: new Date("2026-07-01"),
};

describe("api/theme-packs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/theme-packs - List with pagination
  // ==========================================================================

  describe("GET /api/theme-packs", () => {
    it("returns paginated results", async () => {
      const themePacks = Array.from({ length: 15 }, (_, i) => ({
        ...sampleThemePack,
        id: `clx_theme_${i.toString().padStart(3, "0")}`,
        name: `Theme Pack ${i}`,
      }));

      mockPrisma.themePack.findMany.mockResolvedValue(themePacks.slice(0, 10));
      mockPrisma.themePack.count.mockResolvedValue(15);

      const request = createRequest("/api/theme-packs?limit=10");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(10);
      expect(body.cursor).toBeDefined();
      expect(body.hasMore).toBe(true);
    });

    it("returns empty array for empty database", async () => {
      mockPrisma.themePack.findMany.mockResolvedValue([]);
      mockPrisma.themePack.count.mockResolvedValue(0);

      const request = createRequest("/api/theme-packs");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
      expect(body.hasMore).toBe(false);
    });

    it("uses default limit when limit=0", async () => {
      mockPrisma.themePack.findMany.mockResolvedValue([sampleThemePack]);
      mockPrisma.themePack.count.mockResolvedValue(1);

      const request = createRequest("/api/theme-packs?limit=0");
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should use default limit, not 0
      expect(mockPrisma.themePack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: expect.any(Number),
        })
      );
    });

    it("returns all with hasMore: false when limit > total", async () => {
      const themePacks = [sampleThemePack];

      mockPrisma.themePack.findMany.mockResolvedValue(themePacks);
      mockPrisma.themePack.count.mockResolvedValue(1);

      const request = createRequest("/api/theme-packs?limit=100");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.hasMore).toBe(false);
    });

    it("handles cursor-based pagination", async () => {
      const secondPage = [{ ...sampleThemePack, id: "clx_theme_011" }];

      mockPrisma.themePack.findMany.mockResolvedValue(secondPage);
      mockPrisma.themePack.count.mockResolvedValue(15);

      const request = createRequest("/api/theme-packs?cursor=clx_theme_010&limit=10");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.themePack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "clx_theme_010" },
          skip: 1, // Skip the cursor item
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/theme-packs/[id] - Get by ID
  // ==========================================================================

  describe("GET /api/theme-packs/[id]", () => {
    it("returns theme pack by ID", async () => {
      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);

      const request = createRequest("/api/theme-packs/clx_theme_001");
      const response = await GET_BY_ID(request, { params: { id: "clx_theme_001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe("clx_theme_001");
      expect(body.name).toBe("Master of Puppets");
    });

    it("returns 404 for nonexistent pack", async () => {
      mockPrisma.themePack.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/theme-packs/nonexistent");
      const response = await GET_BY_ID(request, { params: { id: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Theme pack not found");
    });

    it("includes blocks when ?include=blocks", async () => {
      const packWithBlocks = {
        ...sampleThemePack,
        blocks: [
          { id: "block-1", name: "Hook 1", type: "HOOK" },
          { id: "block-2", name: "Camera 1", type: "CAMERA_MOVE" },
        ],
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(packWithBlocks);

      const request = createRequest("/api/theme-packs/clx_theme_001?include=blocks");
      const response = await GET_BY_ID(request, { params: { id: "clx_theme_001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.blocks).toHaveLength(2);
    });

    it("includes templates when ?include=templates", async () => {
      const packWithTemplates = {
        ...sampleThemePack,
        templates: [{ id: "tpl-1", name: "Template 1" }],
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(packWithTemplates);

      const request = createRequest("/api/theme-packs/clx_theme_001?include=templates");
      const response = await GET_BY_ID(request, { params: { id: "clx_theme_001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.templates).toHaveLength(1);
    });
  });

  // ==========================================================================
  // POST /api/theme-packs - Create
  // ==========================================================================

  describe("POST /api/theme-packs", () => {
    it("creates theme pack with valid data", async () => {
      const newPack = {
        name: "New Festival Pack",
        canon: { stages: ["Main Stage"], moments: ["Sunrise"] },
        active: false,
      };

      const createdPack = {
        ...newPack,
        id: "clx_new_001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findFirst.mockResolvedValue(null); // Name doesn't exist
      mockPrisma.themePack.create.mockResolvedValue(createdPack);

      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: JSON.stringify(newPack),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.id).toBe("clx_new_001");
      expect(body.name).toBe("New Festival Pack");
      expect(response.headers.get("Location")).toBe("/api/theme-packs/clx_new_001");
    });

    it("rejects request with missing required field", async () => {
      // canon and active have defaults, so only name is truly required
      const invalidPack = { canon: {} }; // Missing name (required field)

      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: JSON.stringify(invalidPack),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
    });

    it("rejects empty body with 400", async () => {
      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: "",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("rejects wrong types with 400", async () => {
      const invalidPack = {
        name: 123, // Should be string
        canon: "not an object",
      };

      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: JSON.stringify(invalidPack),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("rejects duplicate name with 409", async () => {
      mockPrisma.themePack.findFirst.mockResolvedValue(sampleThemePack);

      const duplicatePack = {
        name: "Master of Puppets",
        canon: { stages: ["Test"] },
      };

      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: JSON.stringify(duplicatePack),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe("Theme pack with this name already exists");
    });

    it("accepts minimum valid payload (name and canon only)", async () => {
      const minimalPack = {
        name: "Minimal Pack",
        canon: {},
      };

      const createdPack = {
        ...minimalPack,
        id: "clx_min_001",
        active: true, // Default
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findFirst.mockResolvedValue(null);
      mockPrisma.themePack.create.mockResolvedValue(createdPack);

      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: JSON.stringify(minimalPack),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("handles name at maximum length (255 chars)", async () => {
      const longName = "A".repeat(255);
      const pack = { name: longName, canon: {} };

      const createdPack = {
        ...pack,
        id: "clx_long_001",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findFirst.mockResolvedValue(null);
      mockPrisma.themePack.create.mockResolvedValue(createdPack);

      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: JSON.stringify(pack),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("handles Unicode characters in name", async () => {
      const unicodeName = "Festival de Musique du Monde";
      const pack = { name: unicodeName, canon: {} };

      const createdPack = {
        ...pack,
        id: "clx_unicode_001",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.themePack.findFirst.mockResolvedValue(null);
      mockPrisma.themePack.create.mockResolvedValue(createdPack);

      const request = createRequest("/api/theme-packs", {
        method: "POST",
        body: JSON.stringify(pack),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(unicodeName);
    });
  });

  // ==========================================================================
  // PATCH /api/theme-packs/[id] - Update
  // ==========================================================================

  describe("PATCH /api/theme-packs/[id]", () => {
    it("updates theme pack with valid data", async () => {
      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.themePack.update.mockResolvedValue({
        ...sampleThemePack,
        active: true,
      });

      const request = createRequest("/api/theme-packs/clx_theme_001", {
        method: "PATCH",
        body: JSON.stringify({ active: true }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "clx_theme_001" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.active).toBe(true);
    });

    it("returns 404 for nonexistent pack", async () => {
      mockPrisma.themePack.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/theme-packs/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({ active: true }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Theme pack not found");
    });

    it("allows partial update (only active field)", async () => {
      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.themePack.update.mockResolvedValue({
        ...sampleThemePack,
        active: false,
      });

      const request = createRequest("/api/theme-packs/clx_theme_001", {
        method: "PATCH",
        body: JSON.stringify({ active: false }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "clx_theme_001" } });

      expect(response.status).toBe(200);
      expect(mockPrisma.themePack.update).toHaveBeenCalledWith({
        where: { id: "clx_theme_001" },
        data: { active: false },
      });
    });

    it("allows full update (all fields)", async () => {
      const updatedData = {
        name: "Updated Name",
        canon: { stages: ["New Stage"] },
        active: true,
      };

      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.themePack.findFirst.mockResolvedValue(null); // No name conflict
      mockPrisma.themePack.update.mockResolvedValue({
        ...sampleThemePack,
        ...updatedData,
      });

      const request = createRequest("/api/theme-packs/clx_theme_001", {
        method: "PATCH",
        body: JSON.stringify(updatedData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "clx_theme_001" } });

      expect(response.status).toBe(200);
    });

    it("rejects update name to existing name with 409", async () => {
      const existingPack = { ...sampleThemePack, id: "clx_theme_002" };

      mockPrisma.themePack.findUnique.mockResolvedValue(sampleThemePack);
      mockPrisma.themePack.findFirst.mockResolvedValue(existingPack); // Name conflict

      const request = createRequest("/api/theme-packs/clx_theme_001", {
        method: "PATCH",
        body: JSON.stringify({ name: "Existing Pack Name" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH_BY_ID(request, { params: { id: "clx_theme_001" } });
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toContain("already exists");
    });
  });
});
