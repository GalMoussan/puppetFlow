/**
 * Blocks API Routes
 *
 * GET  /api/blocks - List with filters
 * POST /api/blocks - Create new block
 *
 * @module app/api/blocks/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  PaginationSchema,
  BlockFilterSchema,
  CreateBlockSchema,
} from "@/lib/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * GET /api/blocks
 * List blocks with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;

    // Parse pagination params
    const paginationResult = PaginationSchema.safeParse({
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor"),
    });

    const { limit, cursor } = paginationResult.success
      ? paginationResult.data
      : { limit: 20, cursor: undefined };

    // Parse filter params
    const filterResult = BlockFilterSchema.safeParse({
      type: url.searchParams.get("type"),
      themePackId: url.searchParams.get("themePackId"),
      rotationGroup: url.searchParams.get("rotationGroup"),
      archived: url.searchParams.get("archived"),
    });

    const filters = filterResult.success
      ? filterResult.data
      : { archived: false };

    // Ensure limit is at least 1
    const effectiveLimit = Math.max(1, limit);

    // Build where clause
    const where: Prisma.BlockDefinitionWhereInput = {
      archived: filters.archived,
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.themePackId) {
      where.themePackId = filters.themePackId;
    }
    if (filters.rotationGroup) {
      where.rotationGroup = filters.rotationGroup;
    }

    // Execute query
    const [blocks, total] = await Promise.all([
      prisma.blockDefinition.findMany({
        where,
        take: effectiveLimit,
        orderBy: { createdAt: "desc" },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.blockDefinition.count({ where }),
    ]);

    // Determine if there are more results
    const hasMore = blocks.length === effectiveLimit && total > effectiveLimit;
    const nextCursor = hasMore && blocks.length > 0
      ? blocks[blocks.length - 1].id
      : null;

    return NextResponse.json({
      data: blocks,
      cursor: nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("GET /api/blocks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blocks
 * Create a new block
 */
export async function POST(request: NextRequest) {
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
    const parseResult = CreateBlockSchema.safeParse(body);
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

    // themePackId is required — blocks without a pack vanish from the palette filter
    const themePack = await prisma.themePack.findUnique({
      where: { id: data.themePackId },
    });

    if (!themePack) {
      return NextResponse.json(
        { error: "Theme pack not found" },
        { status: 404 }
      );
    }

    // Optional uniqueness within pack (friendly 409 for duplicate names)
    const duplicate = await prisma.blockDefinition.findFirst({
      where: {
        themePackId: data.themePackId,
        name: data.name,
        archived: false,
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Block name already exists" },
        { status: 409 }
      );
    }

    // Create block — always tied to theme pack so GET ?themePackId= returns it
    const block = await prisma.blockDefinition.create({
      data: {
        type: data.type,
        name: data.name,
        promptFragment: data.promptFragment,
        stageScope: data.stageScope,
        rotationGroup: data.rotationGroup,
        themePackId: data.themePackId,
        archived: false,
      },
    });

    return NextResponse.json(block, {
      status: 201,
      headers: {
        Location: `/api/blocks/${block.id}`,
      },
    });
  } catch (err) {
    console.error("POST /api/blocks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/blocks
 * Not supported at collection level
 */
export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed. Use /api/blocks/[id] for updates" },
    { status: 405 }
  );
}
