"use client";

import Link from "next/link";
import { ChevronRight, AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { LibraryRunItem } from "@/lib/map-run";

export interface RunLibraryCardProps {
  run: LibraryRunItem;
}

function statusMeta(status: string): {
  label: string;
  className: string;
  Icon: typeof CheckCircle2;
} {
  const upper = status.toUpperCase();
  switch (upper) {
    case "DONE":
      return {
        label: "Done",
        className: "bg-green-500/15 text-green-400 border-green-500/30",
        Icon: CheckCircle2,
      };
    case "FAILED":
      return {
        label: "Failed",
        className: "bg-red-500/15 text-red-400 border-red-500/30",
        Icon: XCircle,
      };
    case "PENDING":
    case "COMPILING":
    case "GENERATING":
    case "LINTING":
    case "REPAIRING":
      return {
        label: upper.charAt(0) + upper.slice(1).toLowerCase(),
        className: "bg-violet-500/15 text-violet-300 border-violet-500/30",
        Icon: Loader2,
      };
    default:
      return {
        label: status,
        className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
        Icon: AlertCircle,
      };
  }
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunLibraryCard({ run }: RunLibraryCardProps) {
  const { label, className, Icon } = statusMeta(run.status);
  const spinning = ["PENDING", "COMPILING", "GENERATING", "LINTING", "REPAIRING"].includes(
    run.status.toUpperCase()
  );
  const preview =
    run.previewLyrics ||
    run.previewImage ||
    (run.error ? run.error : "No scene preview yet");

  return (
    <Link
      href={`/runs/${run.id}`}
      data-testid="library-run-card"
      data-run-id={run.id}
      className="
        group block rounded-xl border border-zinc-800 bg-zinc-900/80
        hover:border-violet-500/50 hover:bg-zinc-900
        transition-colors p-4
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-white truncate">
              {run.templateName}
            </h2>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${className}`}
              data-testid="library-run-status"
            >
              <Icon
                className={`w-3 h-3 ${spinning ? "animate-spin" : ""}`}
                aria-hidden
              />
              {label}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-2">
            {formatWhen(run.createdAt)}
            <span className="mx-1.5 text-zinc-700">·</span>
            {run.sceneCount} scene{run.sceneCount === 1 ? "" : "s"}
            <span className="mx-1.5 text-zinc-700">·</span>
            <span className="font-mono text-zinc-400">{run.model}</span>
          </p>
          <p
            className="text-sm text-zinc-400 line-clamp-2 font-mono"
            data-testid="library-run-preview"
          >
            {preview}
          </p>
        </div>
        <ChevronRight
          className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 shrink-0 mt-1 transition-colors"
          aria-hidden
        />
      </div>
    </Link>
  );
}
