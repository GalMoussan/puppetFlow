/**
 * Block by ID API Routes
 *
 * GET   /api/blocks/[id] - Get by ID with optional includes
 * PATCH /api/blocks/[id] - Update/archive block
 *
 * @module app/api/blocks/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UpdateBlockSchema } from "@/lib/schemas";

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/blocks/[id]
 * Get block by ID with optional includes
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

    const url = request.nextUrl;
    const includeParam = url.searchParams.get("include");

    // Build include options
    const include: { themePack?: boolean } = {};
    if (includeParam) {
      const includes = includeParam.split(",");
      if (includes.includes("themePack")) {
        include.themePack = true;
      }
    }

    // Query
    const block = await prisma.blockDefinition.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });

    if (!block) {
      return NextResponse.json(
        { error: "Block not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(block);
  } catch (err) {
    console.error("GET /api/blocks/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/blocks/[id]
 * Update or archive block
 */
export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Handle both Promise and direct params
    const params = "then" in context.params
      ? await context.params
      : context.params;
    const { id } = params;

    // Check if exists
    const existing = await prisma.blockDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Block not found" },
        { status: 404 }
      );
    }

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
    const parseResult = UpdateBlockSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Update
    const updated = await prisma.blockDefinition.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/blocks/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
