"use client";

/**
 * Analytics Dashboard Component
 *
 * Main dashboard showing usage statistics, cost tracking, and charts.
 *
 * @module components/analytics/AnalyticsDashboard
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Loader2, RefreshCw, Calendar, ChevronLeft } from "lucide-react";
import { StatsCards } from "./StatsCards";
import { RunsChart } from "./RunsChart";
import { CostChart } from "./CostChart";
import { ModelBreakdown } from "./ModelBreakdown";

// =============================================================================
// Types
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

interface ModelBreakdownEntry {
  model: string;
  runs: number;
  tokens: number;
  cost: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  timeSeries: TimeSeriesEntry[];
  modelBreakdown: ModelBreakdownEntry[];
}

type DateRange = "7d" | "30d" | "90d" | "all";

// =============================================================================
// Helpers
// =============================================================================

function getDateRange(range: DateRange): { from?: string; to?: string } {
  if (range === "all") return {};

  const to = new Date();
  const from = new Date();

  switch (range) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
  }

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// =============================================================================
// Component
// =============================================================================

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const fetchAnalytics = useCallback(async (range: DateRange) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const { from, to } = getDateRange(range);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load analytics");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAnalytics(dateRange);
  }, [dateRange, fetchAnalytics]);

  const handleRefresh = () => {
    void fetchAnalytics(dateRange);
  };

  return (
    <div className="pf-shell min-h-screen text-white" data-testid="analytics-page">
      {/* Header */}
      <header className="pf-header sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="pf-btn pf-btn-ghost p-2 shrink-0"
              aria-label="Back to canvas"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="pf-logo-mark shrink-0 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-black" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight truncate text-white">
                Usage Analytics
              </h1>
              <p className="text-xs text-zinc-500 tracking-wide">
                Token usage and cost tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="pf-btn pf-btn-ghost p-2 disabled:opacity-50"
              aria-label="Refresh analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <div className="flex gap-1" role="tablist" aria-label="Date range">
            {(["7d", "30d", "90d", "all"] as DateRange[]).map((range) => (
              <button
                key={range}
                type="button"
                role="tab"
                aria-selected={dateRange === range}
                onClick={() => setDateRange(range)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${
                    dateRange === range
                      ? "bg-cyan-500 text-black"
                      : "bg-white/[0.03] text-zinc-500 hover:text-white border border-white/[0.08]"
                  }
                `}
              >
                {range === "all" ? "All time" : range}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-3"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm">Loading analytics...</p>
          </div>
        ) : data ? (
          <>
            {/* Stats Cards */}
            <StatsCards summary={data.summary} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Runs Over Time */}
              <div className="bg-[#0a0a0b] rounded-xl border border-white/[0.08] p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">
                  Runs Over Time
                </h3>
                <RunsChart data={data.timeSeries} />
              </div>

              {/* Cost Over Time */}
              <div className="bg-[#0a0a0b] rounded-xl border border-white/[0.08] p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">
                  Cost Over Time
                </h3>
                <CostChart data={data.timeSeries} />
              </div>
            </div>

            {/* Model Breakdown */}
            <div className="bg-[#0a0a0b] rounded-xl border border-white/[0.08] p-5">
              <h3 className="text-sm font-medium text-zinc-300 mb-4">
                Usage by Model
              </h3>
              <ModelBreakdown data={data.modelBreakdown} />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
