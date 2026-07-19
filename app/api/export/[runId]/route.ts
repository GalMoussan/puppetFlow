/**
 * Export API Routes
 *
 * GET /api/export/[runId] - Export run as markdown, PDF, or DOCX
 *
 * @module app/api/export/[runId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exportBatch } from "@/packages/domain/exporter";
import { exportToPdf } from "@/packages/domain/exporter-pdf";
import { exportToDocx } from "@/packages/domain/exporter-docx";
import { ExportFormatSchema } from "@/lib/schemas";
import type { ComboAssignment, Violation, Scene } from "@/packages/domain/types";

type RouteParams = { params: Promise<{ runId: string }> | { runId: string } };

/**
 * Convert DB scene to domain Scene format
 */
function toDomainScene(s: {
  id: string;
  runId: string;
  index: number;
  combo: unknown;
  lyrics: string;
  imagePrompt: string;
  startPrompt: string;
  middlePrompt: string;
  endPrompt: string;
  boundaryFrame1: string;
  boundaryFrame2: string;
  finalFrame: string;
  lintReport: unknown;
  notes: string | null;
}): Scene {
  return {
    id: s.id,
    runId: s.runId,
    index: s.index,
    combo: s.combo as ComboAssignment,
    lyrics: s.lyrics,
    imagePrompt: s.imagePrompt,
    startPrompt: s.startPrompt,
    middlePrompt: s.middlePrompt,
    endPrompt: s.endPrompt,
    boundaryFrame1: s.boundaryFrame1,
    boundaryFrame2: s.boundaryFrame2,
    finalFrame: s.finalFrame,
    lintReport: s.lintReport as Violation[],
    notes: s.notes,
  };
}

/**
 * GET /api/export/[runId]
 * Export run as markdown (scenes or scaffold), PDF, or DOCX
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Handle both Promise and direct params
    const params = "then" in context.params
      ? await context.params
      : context.params;
    const { runId } = params;

    // Parse format query param
    const url = request.nextUrl;
    const formatParam = url.searchParams.get("format");
    const formatResult = ExportFormatSchema.safeParse(formatParam);
    const format = formatResult.success ? formatResult.data : "scenes";

    // Load run with scenes and template name
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        template: {
          select: { name: true },
        },
        scenes: {
          orderBy: { index: "asc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    const dateStr = new Date(run.createdAt).toISOString().split("T")[0];

    // Handle scaffold format (markdown only)
    if (format === "scaffold") {
      if (!run.scaffold) {
        return NextResponse.json(
          { error: "Run has no scaffold (may have failed before compilation)" },
          { status: 404 }
        );
      }
      return new NextResponse(run.scaffold, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="scaffold-${dateStr}.md"`,
        },
      });
    }

    // All other formats require scenes
    if (run.scenes.length === 0) {
      return NextResponse.json(
        { error: "Run has no scenes" },
        { status: 404 }
      );
    }

    const domainScenes = run.scenes.map(toDomainScene);

    // Handle scenes format (markdown)
    if (format === "scenes") {
      const content = exportBatch(domainScenes, run.createdAt);
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="scenes-${dateStr}.md"`,
        },
      });
    }

    // Handle PDF format
    if (format === "pdf") {
      const metadata = {
        runId: run.id,
        model: run.model ?? "unknown",
        loopMode: true,
        generatedAt: run.createdAt,
        templateName: run.template.name,
      };
      const pdfBuffer = exportToPdf(domainScenes, metadata);
      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="puppetflow-${dateStr}.pdf"`,
        },
      });
    }

    // Handle DOCX format
    if (format === "docx") {
      const metadata = {
        runId: run.id,
        model: run.model ?? "unknown",
        loopMode: true,
        generatedAt: run.createdAt,
        templateName: run.template.name,
      };
      const docxBuffer = await exportToDocx(domainScenes, metadata);
      return new NextResponse(Buffer.from(docxBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="puppetflow-${dateStr}.docx"`,
        },
      });
    }

    // Fallback (shouldn't reach here due to schema validation)
    return NextResponse.json(
      { error: "Invalid export format" },
      { status: 400 }
    );
  } catch (err) {
    console.error("GET /api/export/[runId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
