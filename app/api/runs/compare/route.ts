/**
 * Run Comparison API Routes
 *
 * GET /api/runs/compare?runA=xxx&runB=xxx - Compare two runs
 *
 * @module app/api/runs/compare/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// =============================================================================
// Request Validation
// =============================================================================

const CompareQuerySchema = z.object({
  runA: z.string().min(1),
  runB: z.string().min(1),
});

// =============================================================================
// Types
// =============================================================================

interface SceneComparison {
  index: number;
  a: {
    lyrics: string;
    imagePrompt: string;
    startPrompt: string;
    middlePrompt: string;
    endPrompt: string;
    boundaryFrame1: string;
    boundaryFrame2: string;
    finalFrame: string;
  } | null;
  b: {
    lyrics: string;
    imagePrompt: string;
    startPrompt: string;
    middlePrompt: string;
    endPrompt: string;
    boundaryFrame1: string;
    boundaryFrame2: string;
    finalFrame: string;
  } | null;
  differences: {
    field: string;
    hasChange: boolean;
  }[];
}

interface RunComparisonResponse {
  runA: {
    id: string;
    templateName: string;
    createdAt: Date;
    sceneCount: number;
  };
  runB: {
    id: string;
    templateName: string;
    createdAt: Date;
    sceneCount: number;
  };
  scenes: SceneComparison[];
  summary: {
    totalScenes: number;
    changedScenes: number;
    addedScenes: number;
    removedScenes: number;
  };
}

// =============================================================================
// Helpers
// =============================================================================

const COMPARISON_FIELDS = [
  "lyrics",
  "imagePrompt",
  "startPrompt",
  "middlePrompt",
  "endPrompt",
  "boundaryFrame1",
  "boundaryFrame2",
  "finalFrame",
] as const;

// =============================================================================
// GET /api/runs/compare
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const queryResult = CompareQuerySchema.safeParse({
      runA: searchParams.get("runA") ?? "",
      runB: searchParams.get("runB") ?? "",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Both runA and runB query parameters are required" },
        { status: 400 }
      );
    }

    const { runA: runAId, runB: runBId } = queryResult.data;

    // Fetch both runs with their scenes
    const [runA, runB] = await Promise.all([
      prisma.run.findUnique({
        where: { id: runAId },
        include: {
          template: { select: { name: true } },
          scenes: {
            orderBy: { index: "asc" },
            select: {
              index: true,
              lyrics: true,
              imagePrompt: true,
              startPrompt: true,
              middlePrompt: true,
              endPrompt: true,
              boundaryFrame1: true,
              boundaryFrame2: true,
              finalFrame: true,
            },
          },
        },
      }),
      prisma.run.findUnique({
        where: { id: runBId },
        include: {
          template: { select: { name: true } },
          scenes: {
            orderBy: { index: "asc" },
            select: {
              index: true,
              lyrics: true,
              imagePrompt: true,
              startPrompt: true,
              middlePrompt: true,
              endPrompt: true,
              boundaryFrame1: true,
              boundaryFrame2: true,
              finalFrame: true,
            },
          },
        },
      }),
    ]);

    if (!runA) {
      return NextResponse.json(
        { error: `Run A not found: ${runAId}` },
        { status: 404 }
      );
    }

    if (!runB) {
      return NextResponse.json(
        { error: `Run B not found: ${runBId}` },
        { status: 404 }
      );
    }

    // Build scene comparison
    const maxScenes = Math.max(runA.scenes.length, runB.scenes.length);
    const scenes: SceneComparison[] = [];
    let changedScenes = 0;
    let addedScenes = 0;
    let removedScenes = 0;

    for (let i = 0; i < maxScenes; i++) {
      const sceneA = runA.scenes.find((s) => s.index === i) ?? null;
      const sceneB = runB.scenes.find((s) => s.index === i) ?? null;

      const differences = COMPARISON_FIELDS.map((field) => ({
        field,
        hasChange: sceneA && sceneB
          ? sceneA[field] !== sceneB[field]
          : sceneA !== null || sceneB !== null,
      }));

      const hasAnyChange = differences.some((d) => d.hasChange);

      if (sceneA && !sceneB) {
        removedScenes++;
      } else if (!sceneA && sceneB) {
        addedScenes++;
      } else if (hasAnyChange) {
        changedScenes++;
      }

      scenes.push({
        index: i,
        a: sceneA,
        b: sceneB,
        differences,
      });
    }

    const response: RunComparisonResponse = {
      runA: {
        id: runA.id,
        templateName: runA.template.name,
        createdAt: runA.createdAt,
        sceneCount: runA.scenes.length,
      },
      runB: {
        id: runB.id,
        templateName: runB.template.name,
        createdAt: runB.createdAt,
        sceneCount: runB.scenes.length,
      },
      scenes,
      summary: {
        totalScenes: maxScenes,
        changedScenes,
        addedScenes,
        removedScenes,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/runs/compare error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
