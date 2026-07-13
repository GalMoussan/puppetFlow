/**
 * Export API Routes
 *
 * GET /api/export/[runId] - Export run as markdown
 *
 * @module app/api/export/[runId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exportBatch } from "@/packages/domain/exporter";
import { ExportFormatSchema } from "@/lib/schemas";
import type { ComboAssignment, Violation } from "@/packages/domain/types";

type RouteParams = { params: Promise<{ runId: string }> | { runId: string } };

/**
 * GET /api/export/[runId]
 * Export run as markdown (scenes or scaffold format)
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

    // Load run with scenes
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
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

    // Generate content based on format
    let content: string;
    let filename: string;
    const dateStr = new Date(run.createdAt).toISOString().split("T")[0];

    if (format === "scaffold") {
      // Return scaffold markdown
      if (!run.scaffold) {
        return NextResponse.json(
          { error: "Run has no scaffold (may have failed before compilation)" },
          { status: 404 }
        );
      }
      content = run.scaffold;
      filename = `scaffold/${dateStr}.md`;
    } else {
      // Return scenes markdown
      if (run.scenes.length === 0) {
        return NextResponse.json(
          { error: "Run has no scenes" },
          { status: 404 }
        );
      }

      // Convert DB scenes to domain format
      const domainScenes = run.scenes.map((s) => ({
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
      }));

      content = exportBatch(domainScenes, run.createdAt);
      filename = `scenes/${dateStr}.md`;
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/[runId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
