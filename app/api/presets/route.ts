/**
 * Presets API Routes
 *
 * GET /api/presets - List all presets (system + user)
 * POST /api/presets - Create a custom preset
 *
 * @module app/api/presets/route
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PresetCategorySchema } from "@/packages/domain/types";

// =============================================================================
// Schemas
// =============================================================================

const CreatePresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: PresetCategorySchema,
  canonOverrides: z.record(z.string(), z.unknown()).optional().default({}),
  defaultRunConfig: z.record(z.string(), z.unknown()).optional().default({}),
  defaultBlocks: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  thumbnailUrl: z.string().url().nullable().optional(),
  guidelines: z.array(z.string()).optional().default([]),
});

const QuerySchema = z.object({
  category: PresetCategorySchema.optional(),
  includeUser: z.enum(["true", "false"]).optional(),
});

// =============================================================================
// GET /api/presets
// =============================================================================

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const { category, includeUser } = QuerySchema.parse(queryParams);

    const where: Record<string, unknown> = {};

    // Filter by category if provided
    if (category) {
      where.category = category.toUpperCase();
    }

    // By default, only show system presets unless includeUser is true
    if (includeUser !== "true") {
      where.isSystem = true;
    }

    const presets = await prisma.templatePreset.findMany({
      where,
      orderBy: [
        { isSystem: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      data: presets,
      meta: {
        total: presets.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to list presets:", error);
    return NextResponse.json(
      { error: "Failed to list presets" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/presets
// =============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = CreatePresetSchema.parse(body);

    // Check for duplicate name
    const existing = await prisma.templatePreset.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A preset with this name already exists" },
        { status: 409 }
      );
    }

    const preset = await prisma.templatePreset.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category.toUpperCase() as "FESTIVAL" | "BRAINROT" | "EDUCATIONAL" | "DANCE" | "NARRATIVE" | "EXPERIMENTAL",
        canonOverrides: data.canonOverrides as object,
        defaultRunConfig: data.defaultRunConfig as object,
        defaultBlocks: data.defaultBlocks as object[],
        thumbnailUrl: data.thumbnailUrl,
        guidelines: data.guidelines,
        isSystem: false,
        // TODO: Add createdBy when auth is implemented
      },
    });

    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preset data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create preset:", error);
    return NextResponse.json(
      { error: "Failed to create preset" },
      { status: 500 }
    );
  }
}
