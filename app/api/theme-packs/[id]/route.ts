/**
 * Theme Pack by ID API Routes
 *
 * GET   /api/theme-packs/[id] - Get by ID with optional includes
 * PATCH /api/theme-packs/[id] - Update theme pack
 *
 * @module app/api/theme-packs/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UpdateThemePackSchema } from "@/lib/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/theme-packs/[id]
 * Get theme pack by ID with optional includes
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Handle both Promise and direct params (Next.js 15 compatibility)
    const params = "then" in context.params
      ? await context.params
      : context.params;
    const { id } = params;

    const url = request.nextUrl;
    const includeParam = url.searchParams.get("include");

    // Build include options
    const include: { blocks?: boolean; templates?: boolean } = {};
    if (includeParam) {
      const includes = includeParam.split(",");
      if (includes.includes("blocks")) {
        include.blocks = true;
      }
      if (includes.includes("templates")) {
        include.templates = true;
      }
    }

    // Query
    const themePack = await prisma.themePack.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });

    if (!themePack) {
      return NextResponse.json(
        { error: "Theme pack not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(themePack);
  } catch (err) {
    console.error("GET /api/theme-packs/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/theme-packs/[id]
 * Update theme pack
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
    const existing = await prisma.themePack.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Theme pack not found" },
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
    const parseResult = UpdateThemePackSchema.safeParse(body);
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

    // Check for name conflict if name is being updated
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.themePack.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "Theme pack with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.ThemePackUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.canon !== undefined) updateData.canon = data.canon as Prisma.InputJsonValue;

    // Update
    const updated = await prisma.themePack.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/theme-packs/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
