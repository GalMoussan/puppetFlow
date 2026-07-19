/**
 * Create Template from Preset API
 *
 * POST /api/templates/from-preset - Create a new template based on a preset
 *
 * @module app/api/templates/from-preset/route
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { LANES_MUTABLE } from "@/packages/domain/types";

// =============================================================================
// Schemas
// =============================================================================

const CreateFromPresetSchema = z.object({
  presetId: z.string().min(1).nullable(),
  name: z.string().min(1).max(100),
  themePackId: z.string().min(1),
});

// =============================================================================
// POST /api/templates/from-preset
// =============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { presetId, name, themePackId } = CreateFromPresetSchema.parse(body);

    // Get the preset if provided
    let preset = null;
    if (presetId) {
      preset = await prisma.templatePreset.findUnique({
        where: { id: presetId },
      });

      if (!preset) {
        return NextResponse.json(
          { error: "Preset not found" },
          { status: 404 }
        );
      }
    }

    // Verify theme pack exists
    const themePack = await prisma.themePack.findUnique({
      where: { id: themePackId },
    });

    if (!themePack) {
      return NextResponse.json(
        { error: "Theme pack not found" },
        { status: 404 }
      );
    }

    // Build runConfig from preset defaults or use blank defaults
    const defaultRunConfig = (preset?.defaultRunConfig as Record<string, unknown>) ?? {};

    const runConfig: Record<string, unknown> = {
      loopMode: Boolean(defaultRunConfig.loopMode ?? true),
      languages: (defaultRunConfig.languages as object) ?? { hi: 0, ja: 0 },
      batchSize: Number(defaultRunConfig.batchSize ?? 5),
      pacingStyle: String(defaultRunConfig.pacingStyle ?? "normal"),
      styleConsistency: Boolean(defaultRunConfig.styleConsistency ?? true),
      beatInterval: Number(defaultRunConfig.beatInterval ?? 2),
      targetPlatform: String(defaultRunConfig.targetPlatform ?? "tiktok"),
    };

    // Only add hookStyle if defined
    if (defaultRunConfig.hookStyle !== undefined) {
      runConfig.hookStyle = String(defaultRunConfig.hookStyle);
    }

    const graph = {
      version: 1,
      lanes: LANES_MUTABLE as string[],
      nodes: [] as object[],
      edges: [] as object[],
      runConfig,
    };

    // Create the template with preset reference (null for blank)
    const template = await prisma.flowTemplate.create({
      data: {
        name,
        themePackId,
        presetId: presetId ?? undefined,
        graph: graph as object,
      },
    });

    // TODO: Auto-populate default blocks based on preset.defaultBlocks
    // This would require fetching block definitions that match the
    // specified types and rotation groups, then creating canvas nodes

    return NextResponse.json({
      template,
      preset: preset ? {
        id: preset.id,
        name: preset.name,
        category: preset.category,
        guidelines: preset.guidelines,
      } : null,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create template from preset:", error);
    return NextResponse.json(
      { error: "Failed to create template from preset" },
      { status: 500 }
    );
  }
}
