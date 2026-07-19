/**
 * Analytics API Routes
 *
 * GET /api/analytics - Get usage analytics with optional filters
 *
 * @module app/api/analytics/route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// =============================================================================
// Request Validation
// =============================================================================

const AnalyticsQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      // End of day for "to" date
      const d = new Date(v);
      d.setHours(23, 59, 59, 999);
      return d;
    }),
  templateId: z.string().optional(),
});

// =============================================================================
// Response Types
// =============================================================================

interface AnalyticsSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  avgDurationMs: number;
  totalScenes: number;
}

interface TimeSeriesEntry {
  date: string;
  runs: number;
  tokens: number;
  cost: number;
  scenes: number;
}

interface ModelBreakdown {
  model: string;
  runs: number;
  tokens: number;
  cost: number;
}

interface AnalyticsResponse {
  summary: AnalyticsSummary;
  timeSeries: TimeSeriesEntry[];
  modelBreakdown: ModelBreakdown[];
}

// =============================================================================
// Helpers
// =============================================================================

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  // Handle Prisma Decimal type (has toString method)
  if (typeof value === "object" && value !== null && "toString" in value) {
    return parseFloat(String(value));
  }
  return 0;
}

// =============================================================================
// GET /api/analytics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const queryResult = AnalyticsQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      templateId: searchParams.get("templateId") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { from, to, templateId } = queryResult.data;

    // Build where clause
    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      templateId?: string;
    } = {};

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    // Fetch runs with usage data
    const runs = await prisma.run.findMany({
      where,
      select: {
        id: true,
        status: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        estimatedCost: true,
        durationMs: true,
        createdAt: true,
        _count: {
          select: { scenes: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate summary
    const totalRuns = runs.length;
    const successfulRuns = runs.filter((r) => r.status === "DONE").length;
    const failedRuns = runs.filter((r) => r.status === "FAILED").length;
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let estimatedCost = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let totalScenes = 0;

    for (const run of runs) {
      if (run.totalTokens) totalTokens += run.totalTokens;
      if (run.inputTokens) inputTokens += run.inputTokens;
      if (run.outputTokens) outputTokens += run.outputTokens;
      if (run.estimatedCost) estimatedCost += toNumber(run.estimatedCost);
      if (run.durationMs) {
        totalDuration += run.durationMs;
        durationCount++;
      }
      totalScenes += run._count.scenes;
    }

    const avgDurationMs = durationCount > 0 ? totalDuration / durationCount : 0;

    const summary: AnalyticsSummary = {
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: Math.round(successRate * 100) / 100,
      totalTokens,
      inputTokens,
      outputTokens,
      estimatedCost: Math.round(estimatedCost * 1000000) / 1000000,
      avgDurationMs: Math.round(avgDurationMs),
      totalScenes,
    };

    // Build time series (group by date)
    const dateMap = new Map<string, TimeSeriesEntry>();
    for (const run of runs) {
      const date = run.createdAt.toISOString().split("T")[0];
      const existing = dateMap.get(date) ?? { date, runs: 0, tokens: 0, cost: 0, scenes: 0 };
      existing.runs++;
      existing.tokens += run.totalTokens ?? 0;
      existing.cost += toNumber(run.estimatedCost);
      existing.scenes += run._count.scenes;
      dateMap.set(date, existing);
    }

    const timeSeries = Array.from(dateMap.values()).map((entry) => ({
      ...entry,
      cost: Math.round(entry.cost * 1000000) / 1000000,
    }));

    // Build model breakdown
    const modelMap = new Map<string, ModelBreakdown>();
    for (const run of runs) {
      const model = run.model ?? "unknown";
      const existing = modelMap.get(model) ?? { model, runs: 0, tokens: 0, cost: 0 };
      existing.runs++;
      existing.tokens += run.totalTokens ?? 0;
      existing.cost += toNumber(run.estimatedCost);
      modelMap.set(model, existing);
    }

    const modelBreakdown = Array.from(modelMap.values())
      .map((entry) => ({
        ...entry,
        cost: Math.round(entry.cost * 1000000) / 1000000,
      }))
      .sort((a, b) => b.runs - a.runs);

    const response: AnalyticsResponse = {
      summary,
      timeSeries,
      modelBreakdown,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/analytics error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
