"use client";

/**
 * Cost Chart Component
 *
 * Area chart showing cost over time.
 *
 * @module components/analytics/CostChart
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TimeSeriesEntry {
  date: string;
  runs: number;
  tokens: number;
  cost: number;
  scenes: number;
}

interface CostChartProps {
  data: TimeSeriesEntry[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function CostChart({ data }: CostChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  // Calculate cumulative cost
  const cumulativeData = data.reduce(
    (acc, entry) => {
      const prevCost = acc.length > 0 ? acc[acc.length - 1].cumulativeCost : 0;
      acc.push({
        ...entry,
        cumulativeCost: prevCost + entry.cost,
      });
      return acc;
    },
    [] as (TimeSeriesEntry & { cumulativeCost: number })[]
  );

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={cumulativeData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCost}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#f4f4f5" }}
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => {
              const label = name === "cumulativeCost" ? "Total Cost" : "Daily Cost";
              return [formatCost(value), label];
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulativeCost"
            stroke="#4ade80"
            strokeWidth={2}
            fill="url(#costGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
