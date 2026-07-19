/**
 * Individual Preset API Routes
 *
 * GET /api/presets/[id] - Get preset details
 * PATCH /api/presets/[id] - Update preset (user presets only)
 * DELETE /api/presets/[id] - Delete preset (user presets only)
 *
 * @module app/api/presets/[id]/route
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PresetCategorySchema } from "@/packages/domain/types";

// =============================================================================
// Schemas
// =============================================================================

const UpdatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  category: PresetCategorySchema.optional(),
  canonOverrides: z.record(z.string(), z.unknown()).optional(),
  defaultRunConfig: z.record(z.string(), z.unknown()).optional(),
  defaultBlocks: z.array(z.record(z.string(), z.unknown())).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  guidelines: z.array(z.string()).optional(),
});

// =============================================================================
// GET /api/presets/[id]
// =============================================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const preset = await prisma.templatePreset.findUnique({
      where: { id },
      include: {
        _count: {
          select: { templates: true },
        },
      },
    });

    if (!preset) {
      return NextResponse.json(
        { error: "Preset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(preset);
  } catch (error) {
    console.error("Failed to get preset:", error);
    return NextResponse.json(
      { error: "Failed to get preset" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/presets/[id]
// =============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdatePresetSchema.parse(body);

    // Check if preset exists
    const existing = await prisma.templatePreset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Preset not found" },
        { status: 404 }
      );
    }

    // System presets cannot be modified
    if (existing.isSystem) {
      return NextResponse.json(
        { error: "System presets cannot be modified" },
        { status: 403 }
      );
    }

    // TODO: Check ownership when auth is implemented

    // Check for name conflict if name is being changed
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.templatePreset.findFirst({
        where: { name: data.name, id: { not: id } },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "A preset with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.category) updateData.category = data.category.toUpperCase();
    if (data.canonOverrides) updateData.canonOverrides = data.canonOverrides;
    if (data.defaultRunConfig) updateData.defaultRunConfig = data.defaultRunConfig;
    if (data.defaultBlocks) updateData.defaultBlocks = data.defaultBlocks;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.guidelines) updateData.guidelines = data.guidelines;

    const preset = await prisma.templatePreset.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(preset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preset data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update preset:", error);
    return NextResponse.json(
      { error: "Failed to update preset" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/presets/[id]
// =============================================================================

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if preset exists
    const existing = await prisma.templatePreset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Preset not found" },
        { status: 404 }
      );
    }

    // System presets cannot be deleted
    if (existing.isSystem) {
      return NextResponse.json(
        { error: "System presets cannot be deleted" },
        { status: 403 }
      );
    }

    // TODO: Check ownership when auth is implemented

    await prisma.templatePreset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete preset:", error);
    return NextResponse.json(
      { error: "Failed to delete preset" },
      { status: 500 }
    );
  }
}
