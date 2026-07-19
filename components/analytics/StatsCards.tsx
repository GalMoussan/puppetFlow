"use client";

/**
 * Stats Cards Component
 *
 * Displays summary statistics in a card grid.
 *
 * @module components/analytics/StatsCards
 */

import { Activity, DollarSign, Zap, Clock, Film, CheckCircle } from "lucide-react";

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

interface StatsCardsProps {
  summary: AnalyticsSummary;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(2)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
}

export function StatsCards({ summary }: StatsCardsProps) {
  const stats = [
    {
      label: "Total Runs",
      value: formatNumber(summary.totalRuns),
      subValue: `${summary.successfulRuns} successful`,
      icon: Activity,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Success Rate",
      value: `${summary.successRate.toFixed(1)}%`,
      subValue: `${summary.failedRuns} failed`,
      icon: CheckCircle,
      color: summary.successRate >= 90 ? "text-green-400" : "text-amber-400",
      bgColor: summary.successRate >= 90 ? "bg-green-500/10" : "bg-amber-500/10",
    },
    {
      label: "Total Tokens",
      value: formatNumber(summary.totalTokens),
      subValue: `${formatNumber(summary.inputTokens)} in / ${formatNumber(summary.outputTokens)} out`,
      icon: Zap,
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
    },
    {
      label: "Estimated Cost",
      value: formatCost(summary.estimatedCost),
      subValue: summary.totalRuns > 0
        ? `${formatCost(summary.estimatedCost / summary.totalRuns)} avg/run`
        : "No runs yet",
      icon: DollarSign,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Avg Duration",
      value: formatDuration(summary.avgDurationMs),
      subValue: "per run",
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Total Scenes",
      value: formatNumber(summary.totalScenes),
      subValue: summary.totalRuns > 0
        ? `${(summary.totalScenes / summary.totalRuns).toFixed(1)} avg/run`
        : "No runs yet",
      icon: Film,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-[#0a0a0b] rounded-xl border border-white/[0.08] p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-xl font-semibold text-white tracking-tight">
              {stat.value}
            </p>
            <p className="text-xs text-zinc-500">{stat.subValue}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
