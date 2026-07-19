/**
 * Template Version by Version Number API Routes
 *
 * GET  /api/templates/[id]/versions/[version] - Get specific version
 * POST /api/templates/[id]/versions/[version] - Restore this version
 *
 * @module app/api/templates/[id]/versions/[version]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: Promise<{ id: string; version: string }> | { id: string; version: string };
};

/**
 * GET /api/templates/[id]/versions/[version]
 * Get a specific version with full graph
 */
export async function GET(
  _request: NextRequest,
  context: RouteParams
) {
  try {
    // Handle both Promise and direct params
    const params = "then" in context.params
      ? await context.params
      : context.params;
    const { id, version: versionStr } = params;
    const version = parseInt(versionStr, 10);

    if (isNaN(version)) {
      return NextResponse.json(
        { error: "Invalid version number" },
        { status: 400 }
      );
    }

    const templateVersion = await prisma.templateVersion.findUnique({
      where: {
        templateId_version: {
          templateId: id,
          version,
        },
      },
    });

    if (!templateVersion) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(templateVersion);
  } catch (err) {
    console.error("GET /api/templates/[id]/versions/[version] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates/[id]/versions/[version]
 * Restore this version (creates a new version with the old graph)
 */
export async function POST(
  _request: NextRequest,
  context: RouteParams
) {
  try {
    // Handle both Promise and direct params
    const params = "then" in context.params
      ? await context.params
      : context.params;
    const { id, version: versionStr } = params;
    const version = parseInt(versionStr, 10);

    if (isNaN(version)) {
      return NextResponse.json(
        { error: "Invalid version number" },
        { status: 400 }
      );
    }

    // Get the version to restore
    const versionToRestore = await prisma.templateVersion.findUnique({
      where: {
        templateId_version: {
          templateId: id,
          version,
        },
      },
    });

    if (!versionToRestore) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Get current template
    const template = await prisma.flowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Snapshot current state before restoring
    if (template.graph !== null) {
      await prisma.templateVersion.create({
        data: {
          templateId: id,
          version: template.currentVersion,
          // Cast to satisfy Prisma's stricter input type (graph is never null in practice)
          graph: template.graph as object,
        },
      });
    }

    // Update template with restored graph
    const updated = await prisma.flowTemplate.update({
      where: { id },
      data: {
        // Cast to satisfy Prisma's stricter input type
        graph: versionToRestore.graph as object,
        currentVersion: template.currentVersion + 1,
      },
    });

    return NextResponse.json({
      message: `Restored to version ${version}`,
      template: updated,
    });
  } catch (err) {
    console.error("POST /api/templates/[id]/versions/[version] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
