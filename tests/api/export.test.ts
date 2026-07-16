/**
 * Tests for Export API
 *
 * Per Phase 2 test specification section 7:
 * - Export scenes format (matches scheduled task output)
 * - Export scaffold format (byte-identical for Claude Code)
 * - Content-Type and Content-Disposition headers
 * - Run not found / incomplete run handling
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockScene } from "@/tests/mocks/anthropic-responses";
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
import { GET } from "@/app/api/export/[runId]/route";

// Helper to create a mock request
// Next.js 16 has different RequestInit type - use eslint-disable to bypass
function createRequest(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any = {}
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

// Helper to extract markdown content from response
async function getMarkdownContent(response: Response): Promise<string> {
  return response.text();
}

// Sample fixtures
const sampleRun = {
  id: "run-001",
  templateId: "tpl-001",
  status: "DONE" as const,
  scaffold: `# Festival Generation Scaffold

## Combo Assignments
- Scene 1: stage=Main Stage, moment=Sunset Arrival, dynamic=Synchronized puppetry
- Scene 2: stage=Main Stage, moment=Sunrise Opening, dynamic=Solo puppetry

## Rule Directives
- Max 2 generic verbs per stage
- Handshake at 80% confidence minimum`,
  error: null,
  createdAt: new Date("2026-07-05"),
  updatedAt: new Date("2026-07-05"),
};

const sampleScenes = Array.from({ length: 5 }, (_, i) =>
  createMockScene(i, "run-001")
);

describe("api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 7.1 Export Scenes Format
  // ==========================================================================

  describe("export scenes format", () => {
    it("exports scenes as markdown", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");

      const content = await getMarkdownContent(response);
      expect(content).toContain("# Scenes for 2026-07-05");
      expect(content).toContain("Main Stage");
      expect(content).toContain("Sunset Arrival");
    });

    it("exports all 5 scenes", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);

      // Each scene should have a header (no colon after number)
      expect(content).toContain("## Scene 1");
      expect(content).toContain("## Scene 2");
      expect(content).toContain("## Scene 3");
      expect(content).toContain("## Scene 4");
      expect(content).toContain("## Scene 5");
    });

    it("scenes format matches expected structure with combo, lyrics, and prompts", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);

      // Verify structure for scene 1 (matches actual exporter.ts format)
      expect(content).toMatch(/\*\*Stage:\*\*.*Main Stage/);
      expect(content).toMatch(/### Lyrics\n\n```lyrics\n[\s\S]*?Shika!/);
      expect(content).toMatch(/### IMAGE Prompt\n\n[\s\S]*?festival stage/i);
      expect(content).toMatch(/### VIDEO_START Prompt\n\n[\s\S]*?\[00:00\]/);
      expect(content).toMatch(/### EXTEND_MIDDLE Prompt\n\n[\s\S]*?Continue directly/);
    });

    it("includes boundary frames in scenes export", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);

      // Boundary frames use the exporter.ts format: "Boundary Frame (TRANSITION)"
      expect(content).toMatch(/\*\*Boundary Frame \(START -> MIDDLE\)\*\*/);
      expect(content).toMatch(/\*\*Boundary Frame \(MIDDLE -> END\)\*\*/);
      expect(content).toMatch(/ENDING FRAME \[EXACT\]/);
    });

    it("exports scenes even when lint reports are present", async () => {
      // The exporter does not render lint warnings inline - they are stored separately
      // This test verifies that scenes with lint reports still export successfully
      const scenesWithWarnings = sampleScenes.map((scene, i) => ({
        ...scene,
        lintReport:
          i === 1
            ? [
                {
                  rule: "R2",
                  severity: "warn" as const,
                  sceneIndex: 1,
                  stage: "VIDEO_START" as const,
                  evidence: "Generic verb detected",
                },
              ]
            : [],
      }));

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: scenesWithWarnings,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);

      // Scene with lint warnings should still be exported
      expect(response.status).toBe(200);
      expect(content).toContain("## Scene 2");
    });

    it("exports run with single scene", async () => {
      const singleScene = [sampleScenes[0]];

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: singleScene,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      expect(response.status).toBe(200);

      const content = await getMarkdownContent(response);
      expect(content).toContain("## Scene 1");
      expect(content).not.toContain("## Scene 2");
    });

    it("preserves Unicode in scene content", async () => {
      const scenesWithUnicode = [
        {
          ...sampleScenes[0],
          lyrics: "Shika! Shika! Shilshul! Shilshul!\nストリングオブライト",
          combo: { ...sampleScenes[0].combo, language: "ja" },
        },
      ];

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: scenesWithUnicode,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);
      expect(content).toContain("Shilshul");
      expect(content).toContain("ストリングオブライト");
    });

    it("does not truncate long prompts", async () => {
      const longPromptScene = {
        ...sampleScenes[0],
        imagePrompt: "A".repeat(5000), // Very long prompt
      };

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: [longPromptScene],
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);

      // Should preserve full length
      expect(content).toContain("A".repeat(1000));
      expect(content.includes("A".repeat(5000))).toBe(true);
    });
  });

  // ==========================================================================
  // 7.2 Export Scaffold Format
  // ==========================================================================

  describe("export scaffold format", () => {
    it("exports scaffold as markdown", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");

      const content = await getMarkdownContent(response);
      expect(content).toBe(sampleRun.scaffold);
    });

    it("scaffold identical to stored Run.scaffold (byte-identical)", async () => {
      const specificScaffold = `# Exact Scaffold Content
## Section 1
- Item 1: value
- Item 2: value with special chars: %^&*()

## Section 2
Line with whitespace:     preserved
Tab\there
Line endings preserved\n`;

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scaffold: specificScaffold,
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);

      // Exact byte match
      expect(content).toBe(specificScaffold);
      expect(content.length).toBe(specificScaffold.length);
    });

    it("preserves whitespace exactly", async () => {
      const scaffoldWithWhitespace = `# Title

First paragraph with double space at end.
Second line with tab:\there

  Indented line
    Double indented
`;

      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scaffold: scaffoldWithWhitespace,
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);
      expect(content).toBe(scaffoldWithWhitespace);
    });

    it("includes combo assignments from scaffold", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });

      const content = await getMarkdownContent(response);
      expect(content).toContain("Combo Assignments");
      expect(content).toContain("Main Stage");
    });
  });

  // ==========================================================================
  // 7.3 Content-Type Headers
  // ==========================================================================

  describe("content-type headers", () => {
    it("sets correct Content-Type header for markdown", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    });

    it("includes charset=utf-8 in Content-Type", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });

      const contentType = response.headers.get("Content-Type");
      expect(contentType).toContain("text/markdown");
      expect(contentType).toContain("charset=utf-8");
    });

    it("ignores Accept header and always returns markdown", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes", {
        headers: { Accept: "application/json" },
      });
      const response = await GET(request, { params: { runId: "run-001" } });

      // Still returns markdown regardless of Accept header
      expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    });
  });

  // ==========================================================================
  // 7.4 Content-Disposition Headers (Filenames)
  // ==========================================================================

  describe("content-disposition headers", () => {
    it("sets Content-Disposition with filename for scenes format", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const disposition = response.headers.get("Content-Disposition");
      expect(disposition).toContain('attachment');
      // Filename includes path format: scenes/{date}.md
      expect(disposition).toContain('filename="scenes/2026-07-05.md"');
    });

    it("sets Content-Disposition with different filename for scaffold format", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });

      const disposition = response.headers.get("Content-Disposition");
      expect(disposition).toContain('attachment');
      // Filename includes path format: scaffold/{date}.md
      expect(disposition).toContain('filename="scaffold/2026-07-05.md"');
    });

    it("filename uses run createdAt date", async () => {
      const runWithOtherDate = {
        ...sampleRun,
        createdAt: new Date("2026-12-25"),
      };

      mockPrisma.run.findUnique.mockResolvedValue({
        ...runWithOtherDate,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      const disposition = response.headers.get("Content-Disposition");
      // Filename includes path format: scenes/{date}.md
      expect(disposition).toContain('filename="scenes/2026-12-25.md"');
    });

    it("defaults to scenes format if format not specified", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001");
      const response = await GET(request, { params: { runId: "run-001" } });

      const disposition = response.headers.get("Content-Disposition");
      // Filename includes path format: scenes/{date}.md
      expect(disposition).toContain('filename="scenes/2026-07-05.md"');
    });
  });

  // ==========================================================================
  // 7.5 Run Not Found / Incomplete Run
  // ==========================================================================

  describe("run not found / incomplete run", () => {
    it("returns 404 for nonexistent run", async () => {
      mockPrisma.run.findUnique.mockResolvedValue(null);

      const request = createRequest("/api/export/nonexistent?format=scenes");
      const response = await GET(request, { params: { runId: "nonexistent" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Run not found");
    });

    it("returns 404 for run with no scenes (scenes format)", async () => {
      // The implementation checks for empty scenes, not status
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        status: "GENERATING",
        scenes: [],
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Run has no scenes");
    });

    it("returns 404 for run with no scaffold (scaffold format)", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        status: "PENDING",
        scaffold: null,
        scenes: [],
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toContain("no scaffold");
    });

    it("exports successfully even for COMPILING status if scenes exist", async () => {
      // Implementation allows export if data exists, regardless of status
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        status: "COMPILING",
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      // Should succeed if scenes exist
      expect(response.status).toBe(200);
    });

    it("exports successfully even for LINTING status if scaffold exists", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        status: "LINTING",
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });

      // Should succeed if scaffold exists
      expect(response.status).toBe(200);
    });

    it("exports successfully even for REPAIRING status if scenes exist", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        status: "REPAIRING",
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      // Should succeed if scenes exist
      expect(response.status).toBe(200);
    });

    it("allows export of DONE run", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        status: "DONE",
        scenes: sampleScenes,
      });

      const request = createRequest("/api/export/run-001?format=scenes");
      const response = await GET(request, { params: { runId: "run-001" } });

      expect(response.status).toBe(200);
    });

    it("returns 404 for FAILED run with no scaffold", async () => {
      // Implementation checks for data existence, not status
      mockPrisma.run.findUnique.mockResolvedValue({
        ...sampleRun,
        status: "FAILED",
        error: "Generation timeout",
        scaffold: null,
        scenes: [],
      });

      const request = createRequest("/api/export/run-001?format=scaffold");
      const response = await GET(request, { params: { runId: "run-001" } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toContain("no scaffold");
    });
  });
});
