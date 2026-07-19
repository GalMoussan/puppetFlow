/**
 * Block Bulk Operations API Routes
 *
 * PATCH /api/blocks/bulk - Bulk archive/restore/delete blocks
 *
 * @module app/api/blocks/bulk/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// =============================================================================
// Request Validation
// =============================================================================

const BulkActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(["archive", "restore", "delete"]),
});

// =============================================================================
// PATCH /api/blocks/bulk
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
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
    const parseResult = BulkActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { ids, action } = parseResult.data;

    // Verify all blocks exist
    const existingBlocks = await prisma.blockDefinition.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const existingIds = new Set(existingBlocks.map((b) => b.id));
    const missingIds = ids.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          error: "Some blocks not found",
          missingIds,
        },
        { status: 404 }
      );
    }

    // Perform action
    let result: { count: number };

    switch (action) {
      case "archive":
        result = await prisma.blockDefinition.updateMany({
          where: { id: { in: ids } },
          data: { archived: true },
        });
        break;

      case "restore":
        result = await prisma.blockDefinition.updateMany({
          where: { id: { in: ids } },
          data: { archived: false },
        });
        break;

      case "delete":
        // In practice, blocks should be archived, not deleted.
        // We'll just delete and let FK constraints handle it.
        result = await prisma.blockDefinition.deleteMany({
          where: { id: { in: ids } },
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      affected: result.count,
    });
  } catch (err) {
    console.error("PATCH /api/blocks/bulk error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
