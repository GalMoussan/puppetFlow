/**
 * Reroll API Routes
 *
 * POST /api/runs/[id]/reroll - Reroll a scene
 *
 * @module app/api/runs/[id]/reroll/route
 */

import { NextRequest, NextResponse } from "next/server";
import { rerollScene } from "@/lib/agent";
import { RerollSchema } from "@/lib/schemas";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/runs/[id]/reroll
 * Reroll a single scene
 */
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Handle both Promise and direct params
    const params = "then" in context.params
      ? await context.params
      : context.params;
    const { id } = params;

    // Parse body
    let body: unknown;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          { error: "Empty request body" },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    // Validate
    const parseResult = RerollSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { sceneIndex, stage } = parseResult.data;

    // Execute reroll
    const updatedScene = await rerollScene(id, sceneIndex, stage);

    return NextResponse.json(updatedScene);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: err.message },
        { status: 404 }
      );
    }

    if (err instanceof ConflictError) {
      return NextResponse.json(
        { error: err.message },
        { status: 409 }
      );
    }

    if (err instanceof BadRequestError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }

    console.error("POST /api/runs/[id]/reroll error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
