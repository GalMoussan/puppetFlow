/**
 * Theme Packs API Routes
 *
 * GET  /api/theme-packs - List with pagination
 * POST /api/theme-packs - Create new theme pack
 *
 * @module app/api/theme-packs/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  PaginationSchema,
  CreateThemePackSchema,
} from "@/lib/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * GET /api/theme-packs
 * List theme packs with pagination
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

    // Ensure limit is at least 1
    const effectiveLimit = Math.max(1, limit);

    // Execute query
    const [themePacks, total] = await Promise.all([
      prisma.themePack.findMany({
        take: effectiveLimit,
        orderBy: { createdAt: "desc" },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.themePack.count(),
    ]);

    // Determine if there are more results
    const hasMore = themePacks.length === effectiveLimit && total > effectiveLimit;
    const nextCursor = hasMore && themePacks.length > 0
      ? themePacks[themePacks.length - 1].id
      : null;

    return NextResponse.json({
      data: themePacks,
      cursor: nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("GET /api/theme-packs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/theme-packs
 * Create a new theme pack
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
    const parseResult = CreateThemePackSchema.safeParse(body);
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

    // Check for duplicate name
    const existing = await prisma.themePack.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Theme pack with this name already exists" },
        { status: 409 }
      );
    }

    // Create theme pack
    const themePack = await prisma.themePack.create({
      data: {
        name: data.name,
        canon: data.canon as Prisma.InputJsonValue,
        active: data.active,
      },
    });

    return NextResponse.json(themePack, {
      status: 201,
      headers: {
        Location: `/api/theme-packs/${themePack.id}`,
      },
    });
  } catch (err) {
    console.error("POST /api/theme-packs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/theme-packs
 * Not supported at collection level - use /api/theme-packs/[id]
 */
export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed. Use /api/theme-packs/[id] for updates" },
    { status: 405 }
  );
}
