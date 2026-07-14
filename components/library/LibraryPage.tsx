"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Library, Loader2, RefreshCw, Film } from "lucide-react";
import { RunLibraryCard } from "./RunLibraryCard";
import {
  mapApiRunToLibraryItem,
  type ApiRun,
  type LibraryRunItem,
} from "@/lib/map-run";

type StatusFilter = "ALL" | "DONE" | "FAILED" | "ACTIVE";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DONE", label: "Done" },
  { value: "FAILED", label: "Failed" },
  { value: "ACTIVE", label: "In progress" },
];

/** Map UI filter to API status query (ACTIVE is client-side multi-status). */
function apiStatusParam(filter: StatusFilter): string | null {
  if (filter === "DONE" || filter === "FAILED") return filter;
  return null;
}

function isActiveStatus(status: string): boolean {
  return ["PENDING", "COMPILING", "GENERATING", "LINTING", "REPAIRING"].includes(
    status.toUpperCase()
  );
}

interface ListResponse {
  data: ApiRun[];
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

export function LibraryPage() {
  const [runs, setRuns] = useState<LibraryRunItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (opts: { cursor?: string | null; append: boolean; filter: StatusFilter }) => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (opts.cursor) params.set("cursor", opts.cursor);

      const status = apiStatusParam(opts.filter);
      if (status) params.set("status", status);

      const res = await fetch(`/api/runs?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load library");
      }

      const json = (await res.json()) as ListResponse;
      let items = (json.data ?? []).map(mapApiRunToLibraryItem);

      // ACTIVE filter: API only supports one status; filter client-side from ALL
      if (opts.filter === "ACTIVE") {
        items = items.filter((r) => isActiveStatus(r.status));
      }

      return {
        items,
        cursor: json.cursor,
        hasMore: json.hasMore,
        total: typeof json.total === "number" ? json.total : null,
      };
    },
    []
  );

  const loadInitial = useCallback(
    async (nextFilter: StatusFilter) => {
      setLoading(true);
      setError(null);
      try {
        // For ACTIVE, pull a wider ALL page then filter (in-progress runs are rare)
        const result = await fetchPage({
          append: false,
          filter: nextFilter === "ACTIVE" ? "ALL" : nextFilter,
        });
        let items = result.items;
        if (nextFilter === "ACTIVE") {
          items = items.filter((r) => isActiveStatus(r.status));
        }
        setRuns(items);
        setCursor(result.cursor);
        setHasMore(nextFilter === "ACTIVE" ? false : result.hasMore);
        setTotal(
          nextFilter === "ACTIVE" ? items.length : result.total
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load library");
        setRuns([]);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage]
  );

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) void loadInitial(filter);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [filter, loadInitial]);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await fetchPage({
        cursor,
        append: true,
        filter,
      });
      setRuns((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const item of result.items) {
          if (!seen.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setCursor(result.cursor);
      setHasMore(result.hasMore);
      if (typeof result.total === "number") setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    void loadInitial(filter);
  };

  return (
    <div className="pf-shell min-h-screen text-white" data-testid="library-page">
      <header className="pf-header sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="pf-logo-mark shrink-0 flex items-center justify-center">
              <Library className="w-3.5 h-3.5 text-black" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight truncate text-white">
                Generation Library
              </h1>
              <p className="text-xs text-zinc-500 tracking-wide">
                {total === null
                  ? "All runs saved in the database"
                  : `${total} generation${total === 1 ? "" : "s"} stored`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="pf-btn pf-btn-ghost p-2 disabled:opacity-50"
              aria-label="Refresh library"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/" className="pf-btn pf-btn-primary px-3.5 py-1.5">
              Canvas
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(opt.value)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium tracking-tight transition-all
                  ${
                    active
                      ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                      : "bg-white/[0.03] text-zinc-500 hover:text-white border border-white/[0.08]"
                  }
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-3"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3"
            data-testid="library-loading"
          >
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm">Loading generations…</p>
          </div>
        ) : runs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center gap-4"
            data-testid="library-empty"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#0a0a0b] border border-white/[0.08] flex items-center justify-center">
              <Film className="w-7 h-7 text-zinc-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-zinc-200">
                {filter === "ALL"
                  ? "No generations yet"
                  : `No ${STATUS_OPTIONS.find((o) => o.value === filter)?.label.toLowerCase() ?? "matching"} generations`}
              </p>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                {filter === "ALL"
                  ? "Every Run from the canvas is saved here permanently. Generate a batch to start building your library."
                  : "Try another status filter, or run a new batch from the canvas."}
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors"
            >
              Go to canvas
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3" data-testid="library-run-list">
              {runs.map((run) => (
                <li key={run.id}>
                  <RunLibraryCard run={run} />
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                  className="
                    px-4 py-2 rounded-lg text-sm font-medium
                    bg-[#0a0a0b] border border-white/[0.1] text-zinc-200
                    hover:border-cyan-500/40 hover:text-white
                    disabled:opacity-50 transition-colors
                  "
                  data-testid="library-load-more"
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
