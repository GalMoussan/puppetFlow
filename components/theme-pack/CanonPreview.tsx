/**
 * Canon Preview Component
 *
 * Summary panel showing pool sizes with warnings for insufficient variety.
 *
 * @module components/theme-pack/CanonPreview
 */

"use client";

import { AlertTriangle, Check, Info } from "lucide-react";
import { type FullCanon, CANON_POOL_KEYS } from "@/packages/domain/types";

interface CanonPreviewProps {
  canon: FullCanon;
}

// Minimum recommended pool sizes for variety
const MIN_POOL_SIZES: Partial<Record<string, number>> = {
  stageAreas: 5,
  festivalMoments: 5,
  dynamics: 4,
  visuals: 4,
  hooks: 5,
  gags: 6,
  payoffs: 4,
  chaosThreads: 4,
  subgenres: 3,
  languages: 1,
};

const CAMERA_MIN = 4;

export function CanonPreview({ canon }: CanonPreviewProps) {
  // Calculate total combinations for variety engine
  const poolSizes = CANON_POOL_KEYS.map((key) => (canon[key] as string[]).length);
  const cameraPoolSizes = [
    canon.cameraMoves.start.length,
    canon.cameraMoves.middle.length,
    canon.cameraMoves.end.length,
  ];

  const totalCombinations = poolSizes.reduce((acc, size) => acc * Math.max(size, 1), 1) *
    cameraPoolSizes.reduce((acc, size) => acc * Math.max(size, 1), 1);

  // Count warnings
  const poolWarnings = CANON_POOL_KEYS.filter((key) => {
    const size = (canon[key] as string[]).length;
    const min = MIN_POOL_SIZES[key] || 1;
    return size < min;
  }).length;

  const cameraWarnings = cameraPoolSizes.filter((size) => size < CAMERA_MIN).length;
  const totalWarnings = poolWarnings + cameraWarnings;

  const characterCount = canon.characters.length;
  const hasRules = canon.universeRules.trim().length > 0;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Preview
      </h3>

      {/* Summary Stats */}
      <div className="space-y-3 mb-6">
        <StatRow
          label="Total Combinations"
          value={formatNumber(totalCombinations)}
          status={totalCombinations >= 1000 ? "good" : totalCombinations >= 100 ? "ok" : "warning"}
        />
        <StatRow
          label="Pool Warnings"
          value={`${totalWarnings}`}
          status={totalWarnings === 0 ? "good" : "warning"}
        />
        <StatRow
          label="Characters"
          value={`${characterCount}`}
          status={characterCount > 0 ? "good" : "info"}
        />
        <StatRow
          label="Universe Rules"
          value={hasRules ? "Defined" : "Empty"}
          status={hasRules ? "good" : "info"}
        />
      </div>

      {/* Pool Details */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Pool Sizes
        </h4>
        <div className="space-y-2">
          {CANON_POOL_KEYS.map((key) => {
            const size = (canon[key] as string[]).length;
            const min = MIN_POOL_SIZES[key] || 1;
            const status = size >= min ? "good" : size > 0 ? "warning" : "empty";
            return (
              <PoolRow
                key={key}
                label={formatPoolName(key)}
                count={size}
                min={min}
                status={status}
              />
            );
          })}
        </div>
      </div>

      {/* Camera Moves */}
      <div className="border-t border-zinc-800 pt-4 mt-4">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Camera Moves
        </h4>
        <div className="space-y-2">
          {(["start", "middle", "end"] as const).map((stage) => {
            const size = canon.cameraMoves[stage].length;
            const status = size >= CAMERA_MIN ? "good" : size > 0 ? "warning" : "empty";
            return (
              <PoolRow
                key={stage}
                label={stage.toUpperCase()}
                count={size}
                min={CAMERA_MIN}
                status={status}
              />
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      {totalWarnings > 0 && (
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-400">
              <strong>Low variety warning</strong>
              <p className="text-yellow-400/80 mt-1">
                {totalWarnings} pool{totalWarnings > 1 ? "s have" : " has"} fewer items than
                recommended. This may cause repetition in generated content.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "good" | "ok" | "warning" | "info";
}) {
  const statusColors = {
    good: "text-green-400",
    ok: "text-yellow-400",
    warning: "text-red-400",
    info: "text-zinc-400",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm font-medium ${statusColors[status]}`}>{value}</span>
    </div>
  );
}

function PoolRow({
  label,
  count,
  min,
  status,
}: {
  label: string;
  count: number;
  min: number;
  status: "good" | "warning" | "empty";
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={
            status === "good"
              ? "text-zinc-300"
              : status === "warning"
              ? "text-yellow-400"
              : "text-zinc-600"
          }
        >
          {count}
        </span>
        {status === "good" && <Check className="w-3 h-3 text-green-400" />}
        {status === "warning" && (
          <span className="text-zinc-600">/ {min}</span>
        )}
        {status === "empty" && <Info className="w-3 h-3 text-zinc-600" />}
      </div>
    </div>
  );
}

function formatPoolName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}
