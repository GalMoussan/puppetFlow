/**
 * POST /api/import/scene
 * Parse pasted scene markdown → create blocks → return canvas graph
 *
 * @module app/api/import/scene/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ImportSceneSchema } from "@/lib/schemas";
import { importSceneFromMarkdown } from "@/packages/domain/scene-import";
import type { CanvasGraph } from "@/packages/domain/types";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = ImportSceneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { raw, themePackId, pinCharacterLocks, namePrefix } = parsed.data;

    const themePack = await prisma.themePack.findUnique({
      where: { id: themePackId },
    });
    if (!themePack) {
      return NextResponse.json(
        { error: "Theme pack not found" },
        { status: 404 }
      );
    }

    const { plan } = importSceneFromMarkdown(raw, {
      pinCharacterLocks,
      namePrefix,
    });

    if (plan.blocks.length === 0) {
      return NextResponse.json(
        {
          error: "No blocks could be extracted from paste",
          warnings: plan.warnings,
        },
        { status: 422 }
      );
    }

    const created: Array<{
      id: string;
      type: string;
      name: string;
      promptFragment: string;
      stageScope: string[];
      rotationGroup: string | null;
      tempId: string;
      reused: boolean;
      lane: string;
      order: number;
      pinned?: boolean;
    }> = [];

    let createdCount = 0;
    let reusedCount = 0;

    for (const planned of plan.blocks) {
      const reusable =
        planned.type === "CHARACTER_LOCK" || planned.type === "STYLE_LOCK";

      let block = reusable
        ? await prisma.blockDefinition.findFirst({
            where: {
              themePackId,
              type: planned.type,
              promptFragment: planned.promptFragment,
              archived: false,
            },
          })
        : null;

      let reused = false;
      if (block) {
        reused = true;
        reusedCount++;
      } else {
        block = await prisma.blockDefinition.create({
          data: {
            type: planned.type,
            name: planned.name.slice(0, 255),
            promptFragment: planned.promptFragment,
            stageScope: planned.stageScope,
            rotationGroup: planned.rotationGroup ?? null,
            themePackId,
            archived: false,
          },
        });
        createdCount++;
      }

      created.push({
        id: block.id,
        type: block.type,
        name: block.name,
        promptFragment: block.promptFragment,
        stageScope: block.stageScope,
        rotationGroup: block.rotationGroup,
        tempId: planned.tempId,
        reused,
        lane: planned.lane,
        order: planned.order,
        pinned: planned.pinned,
      });
    }

    const graph: CanvasGraph = {
      version: 1,
      lanes: plan.graph.lanes,
      edges: plan.graph.edges,
      runConfig: plan.graph.runConfig,
      nodes: created.map((c) => ({
        id: `node-${c.id}`,
        blockDefId: c.id,
        lane: c.lane as CanvasGraph["nodes"][0]["lane"],
        order: c.order,
        pinned: c.pinned,
      })),
    };

    return NextResponse.json({
      blocks: created.map(
        ({ tempId: _t, reused: _r, lane: _l, order: _o, pinned: _p, ...rest }) =>
          rest
      ),
      planned: plan.blocks.map((b) => ({
        tempId: b.tempId,
        type: b.type,
        name: b.name,
        lane: b.lane,
        fragmentPreview: b.promptFragment.slice(0, 160),
      })),
      graph,
      warnings: plan.warnings,
      stats: {
        ...plan.stats,
        created: createdCount,
        reused: reusedCount,
      },
    });
  } catch (err) {
    console.error("POST /api/import/scene error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
