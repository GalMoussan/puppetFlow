/**
 * Template by ID API Routes
 *
 * GET   /api/templates/[id] - Get by ID with full graph
 * PATCH /api/templates/[id] - Update template (autosave with versioning)
 *
 * @module app/api/templates/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UpdateTemplateSchema } from "@/lib/schemas";

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/templates/[id]
 * Get template by ID with full graph
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
    const include: { themePack?: boolean; runs?: boolean } = {};
    if (includeParam) {
      const includes = includeParam.split(",");
      if (includes.includes("themePack")) {
        include.themePack = true;
      }
      if (includes.includes("runs")) {
        include.runs = true;
      }
    }

    // Query
    const template = await prisma.flowTemplate.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (err) {
    console.error("GET /api/templates/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/templates/[id]
 * Update template (for autosave)
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
    const existing = await prisma.flowTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
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
    const parseResult = UpdateTemplateSchema.safeParse(body);
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

    // Auto-snapshot: create a version entry for the current graph before updating
    if (data.graph && existing.graph !== null) {
      await prisma.templateVersion.create({
        data: {
          templateId: id,
          version: existing.currentVersion,
          // Cast to satisfy Prisma's stricter input type (graph is never null in practice)
          graph: existing.graph as object,
        },
      });
    }

    // Update template with incremented version
    const updated = await prisma.flowTemplate.update({
      where: { id },
      data: {
        ...data,
        currentVersion: data.graph ? existing.currentVersion + 1 : existing.currentVersion,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/templates/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
