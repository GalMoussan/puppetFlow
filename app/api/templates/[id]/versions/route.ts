/**
 * Template Versions API Routes
 *
 * GET /api/templates/[id]/versions - List all versions for a template
 *
 * @module app/api/templates/[id]/versions/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/templates/[id]/versions
 * List all versions for a template
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
    const { id } = params;

    // Check if template exists
    const template = await prisma.flowTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        currentVersion: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Get all versions
    const versions = await prisma.templateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        currentVersion: template.currentVersion,
      },
      versions,
    });
  } catch (err) {
    console.error("GET /api/templates/[id]/versions error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
