/**
 * Runs API Routes
 *
 * GET  /api/runs - List with pagination and filters
 * POST /api/runs - Create run with SSE streaming
 *
 * @module app/api/runs/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runBatch } from "@/lib/agent";
import {
  PaginationSchema,
  RunFilterSchema,
  CreateRunSchema,
  type SSEEvent,
} from "@/lib/schemas";
import { NotFoundError, ConflictError } from "@/lib/errors";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * GET /api/runs
 * List runs with pagination and filters
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
    const filterResult = RunFilterSchema.safeParse({
      templateId: url.searchParams.get("templateId"),
      status: url.searchParams.get("status"),
    });

    const filters = filterResult.success ? filterResult.data : {};

    // Check if groupBy=template is requested
    const groupBy = url.searchParams.get("groupBy");

    // Ensure limit is at least 1
    const effectiveLimit = Math.max(1, limit);

    // Build where clause
    const where: Prisma.RunWhereInput = {};
    if (filters.templateId) {
      where.templateId = filters.templateId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    // List payload: template name + scene count + first-scene preview.
    // Full scenes load on GET /api/runs/[id] (run viewer). Library needs every
    // historical run forever as the DB grows — keep list light and paginated.
    const [runs, total] = await Promise.all([
      prisma.run.findMany({
        where,
        take: effectiveLimit,
        orderBy: { createdAt: "desc" },
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          scenes: {
            orderBy: { index: "asc" },
            take: 1,
            select: {
              id: true,
              index: true,
              lyrics: true,
              imagePrompt: true,
            },
          },
          _count: {
            select: { scenes: true },
          },
        },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.run.count({ where }),
    ]);

    // Determine if there are more results (cursor pagination)
    const hasMore = runs.length === effectiveLimit;
    const nextCursor =
      hasMore && runs.length > 0 ? runs[runs.length - 1].id : null;

    // If groupBy=template, aggregate runs by template
    if (groupBy === "template") {
      const grouped = new Map<string, {
        templateId: string;
        templateName: string;
        runs: typeof runs;
        totalRuns: number;
        latestRun: Date;
      }>();

      for (const run of runs) {
        const key = run.templateId;
        const existing = grouped.get(key);
        if (existing) {
          existing.runs.push(run);
          existing.totalRuns++;
          if (run.createdAt > existing.latestRun) {
            existing.latestRun = run.createdAt;
          }
        } else {
          grouped.set(key, {
            templateId: run.templateId,
            templateName: run.template.name,
            runs: [run],
            totalRuns: 1,
            latestRun: run.createdAt,
          });
        }
      }

      const groupedData = Array.from(grouped.values())
        .sort((a, b) => b.latestRun.getTime() - a.latestRun.getTime());

      return NextResponse.json({
        data: groupedData,
        cursor: nextCursor,
        hasMore,
        total,
        groupedBy: "template",
      });
    }

    return NextResponse.json({
      data: runs,
      cursor: nextCursor,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("GET /api/runs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/runs
 * Create a new run with SSE streaming
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
    const parseResult = CreateRunSchema.safeParse(body);
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

    // Verify template exists
    const template = await prisma.flowTemplate.findUnique({
      where: { id: data.templateId },
      include: { themePack: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check for active runs
    const activeRun = await prisma.run.findFirst({
      where: {
        status: {
          in: ["PENDING", "COMPILING", "GENERATING", "LINTING", "REPAIRING"],
        },
      },
    });

    if (activeRun) {
      return NextResponse.json(
        { error: "A batch is already running" },
        { status: 409 }
      );
    }

    // Set up SSE stream
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const customReadable = new ReadableStream({
      start(c) {
        controller = c;
      },
    });

    // Emit function for agent
    const emitter = (event: SSEEvent) => {
      const sseLine = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(encoder.encode(sseLine));

      // Close stream on done or error
      if (event.type === "done" || event.type === "error") {
        controller.close();
      }
    };

    // Run batch in background
    runBatch(data.templateId, data.runConfig, emitter).catch((err) => {
      console.error("runBatch error:", err);

      const message =
        err instanceof Error ? err.message : "Unknown error";

      if (err instanceof NotFoundError || err instanceof ConflictError) {
        emitter({ type: "error", error: message });
      } else {
        emitter({ type: "error", error: message });
      }
    });

    return new NextResponse(customReadable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("POST /api/runs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
