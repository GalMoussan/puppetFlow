/**
 * Run by ID API Routes
 *
 * GET /api/runs/[id] - Get run by ID with scenes
 *
 * @module app/api/runs/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/runs/[id]
 * Get run by ID with scenes
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
    const { id } = params;

    // Query with scenes
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            themePack: true,
          },
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

    return NextResponse.json(run);
  } catch (err) {
    console.error("GET /api/runs/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
