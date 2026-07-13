/**
 * Templates API Routes
 *
 * GET  /api/templates - List with pagination and filters
 * POST /api/templates - Create new template
 *
 * @module app/api/templates/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  PaginationSchema,
  CreateTemplateSchema,
} from "@/lib/schemas";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * GET /api/templates
 * List templates with pagination and themePack includes
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
    const themePackId = url.searchParams.get("themePackId");

    // Ensure limit is at least 1
    const effectiveLimit = Math.max(1, limit);

    // Build where clause
    const where: Prisma.FlowTemplateWhereInput = {};
    if (themePackId) {
      where.themePackId = themePackId;
    }

    // Execute query - always include themePack for listing
    const [templates, total] = await Promise.all([
      prisma.flowTemplate.findMany({
        where,
        take: effectiveLimit,
        orderBy: { createdAt: "desc" },
        include: {
          themePack: true,
        },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.flowTemplate.count({ where }),
    ]);

    // Determine if there are more results
    const hasMore = templates.length === effectiveLimit && total > effectiveLimit;
    const nextCursor = hasMore && templates.length > 0
      ? templates[templates.length - 1].id
      : null;

    return NextResponse.json({
      data: templates,
      cursor: nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("GET /api/templates error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new template
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
    const parseResult = CreateTemplateSchema.safeParse(body);
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

    // Verify theme pack exists
    const themePack = await prisma.themePack.findUnique({
      where: { id: data.themePackId },
    });

    if (!themePack) {
      return NextResponse.json(
        { error: "Theme pack not found" },
        { status: 404 }
      );
    }

    // Create template
    const template = await prisma.flowTemplate.create({
      data: {
        name: data.name,
        graph: data.graph as Prisma.InputJsonValue,
        themePackId: data.themePackId,
      },
    });

    return NextResponse.json(template, {
      status: 201,
      headers: {
        Location: `/api/templates/${template.id}`,
      },
    });
  } catch (err) {
    console.error("POST /api/templates error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/templates
 * Not supported at collection level
 */
export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed. Use /api/templates/[id] for updates" },
    { status: 405 }
  );
}
