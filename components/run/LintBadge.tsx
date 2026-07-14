"use client";

import { useState } from "react";
import { Check, AlertTriangle, X } from "lucide-react";

export interface Violation {
  rule: string;
  severity: "hard" | "soft";
  message: string;
}

interface LintBadgeProps {
  status: "pass" | "warn" | "fail";
  violations: Violation[];
}

export function LintBadge({ status, violations }: LintBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Group violations by rule
  const groupedViolations = violations.reduce(
    (acc, v) => {
      if (!acc[v.rule]) {
        acc[v.rule] = [];
      }
      acc[v.rule].push(v);
      return acc;
    },
    {} as Record<string, Violation[]>
  );

  const getStatusColor = () => {
    switch (status) {
      case "pass":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "warn":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "fail":
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "pass":
        return <Check className="w-3 h-3" />;
      case "warn":
        return <AlertTriangle className="w-3 h-3" />;
      case "fail":
        return <X className="w-3 h-3" />;
    }
  };

  const getAriaLabel = () => {
    switch (status) {
      case "pass":
        return "All rules pass";
      case "warn":
        return `${violations.length} warning${violations.length === 1 ? "" : "s"}`;
      case "fail":
        return `${violations.length} violation${violations.length === 1 ? "" : "s"}`;
    }
  };

  return (
    <div className="relative inline-block">
      <div
        data-testid="lint-badge"
        data-status={status}
        aria-label={getAriaLabel()}
        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${getStatusColor()} cursor-default`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {getIcon()}
        {violations.length > 0 && <span>{violations.length}</span>}
      </div>

      {showTooltip && violations.length > 0 && (
        <div
          data-testid="lint-tooltip"
          className="absolute z-50 top-full left-0 mt-1 w-64 bg-white/[0.04] border border-white/[0.1] rounded-lg p-3 shadow-lg"
        >
          <div className="text-sm space-y-2">
            {Object.entries(groupedViolations).map(([rule, vs]) => (
              <div key={rule}>
                <div className="font-medium text-zinc-300">
                  {rule} ({vs.length})
                </div>
                <ul className="ml-2 text-zinc-500 text-xs space-y-1">
                  {vs.map((v, i) => (
                    <li key={i}>{v.message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
