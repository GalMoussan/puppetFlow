"use client";

/**
 * Model Breakdown Component
 *
 * Table showing usage statistics by model.
 *
 * @module components/analytics/ModelBreakdown
 */

interface ModelBreakdownEntry {
  model: string;
  runs: number;
  tokens: number;
  cost: number;
}

interface ModelBreakdownProps {
  data: ModelBreakdownEntry[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatModelName(model: string): string {
  // Clean up model names for display
  const cleanName = model
    .replace("claude-", "Claude ")
    .replace("-20250514", " (May 25)")
    .replace("-20251101", " (Nov 25)")
    .replace("-20241022", " (Oct 24)")
    .replace("-20240620", " (Jun 24)")
    .replace("-20240307", " (Mar 24)")
    .replace("sonnet-4-6", "Sonnet 4.6")
    .replace("sonnet-4-5", "Sonnet 4.5")
    .replace("opus-4-5", "Opus 4.5")
    .replace("haiku", "Haiku");

  return cleanName;
}

export function ModelBreakdown({ data }: ModelBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-zinc-500 text-sm">
        No model usage data available
      </div>
    );
  }

  const totalRuns = data.reduce((sum, m) => sum + m.runs, 0);
  const totalTokens = data.reduce((sum, m) => sum + m.tokens, 0);
  const totalCost = data.reduce((sum, m) => sum + m.cost, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            <th className="text-left py-3 px-4 text-zinc-400 font-medium">Model</th>
            <th className="text-right py-3 px-4 text-zinc-400 font-medium">Runs</th>
            <th className="text-right py-3 px-4 text-zinc-400 font-medium">Tokens</th>
            <th className="text-right py-3 px-4 text-zinc-400 font-medium">Cost</th>
            <th className="text-right py-3 px-4 text-zinc-400 font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((model) => {
            const share = totalRuns > 0 ? (model.runs / totalRuns) * 100 : 0;
            return (
              <tr
                key={model.model}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="text-zinc-200 font-medium">
                    {formatModelName(model.model)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-zinc-300 tabular-nums">
                  {formatNumber(model.runs)}
                </td>
                <td className="py-3 px-4 text-right text-zinc-300 tabular-nums">
                  {formatNumber(model.tokens)}
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 tabular-nums">
                  {formatCost(model.cost)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="text-zinc-400 w-12 text-right tabular-nums">
                      {share.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-white/[0.02]">
            <td className="py-3 px-4 text-zinc-300 font-medium">Total</td>
            <td className="py-3 px-4 text-right text-zinc-200 font-medium tabular-nums">
              {formatNumber(totalRuns)}
            </td>
            <td className="py-3 px-4 text-right text-zinc-200 font-medium tabular-nums">
              {formatNumber(totalTokens)}
            </td>
            <td className="py-3 px-4 text-right text-emerald-400 font-medium tabular-nums">
              {formatCost(totalCost)}
            </td>
            <td className="py-3 px-4 text-right text-zinc-400 tabular-nums">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
