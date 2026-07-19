"use client";

/**
 * Version History Panel Component
 *
 * Shows template version history and allows restoring previous versions.
 *
 * @module components/canvas/VersionHistoryPanel
 */

import { useCallback, useEffect, useState } from "react";
import { History, RotateCcw, X, Loader2, Clock, ChevronRight } from "lucide-react";

interface TemplateVersion {
  id: string;
  version: number;
  createdAt: string;
}

interface VersionHistoryPanelProps {
  templateId: string;
  currentVersion: number;
  onRestore: () => void;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function VersionHistoryPanel({
  templateId,
  currentVersion,
  onRestore,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/templates/${templateId}/versions`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load versions");
      }

      const data = await res.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchVersions();
  }, [fetchVersions]);

  const handleRestore = async (version: number) => {
    setRestoring(version);
    setError(null);

    try {
      const res = await fetch(`/api/templates/${templateId}/versions/${version}`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to restore version");
      }

      onRestore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore version");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[#0a0a0b] border-l border-white/[0.08] shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Version History</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
          aria-label="Close version history"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Current Version Badge */}
      <div className="px-4 py-3 bg-cyan-500/10 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-cyan-400">Current Version</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono">
            v{currentVersion}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : versions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <Clock className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400 text-sm">No previous versions</p>
          <p className="text-zinc-500 text-xs mt-1">
            Versions are created automatically when you save changes.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-white/[0.04]">
            {versions.map((version) => {
              const isSelected = selectedVersion === version.version;
              const isRestoring = restoring === version.version;

              return (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedVersion(isSelected ? null : version.version)}
                    className={`
                      w-full px-4 py-3 text-left transition-colors
                      ${isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono">
                          v{version.version}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatRelativeTime(version.createdAt)}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-zinc-500 transition-transform ${
                          isSelected ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                      {formatDate(version.createdAt)}
                    </p>
                  </button>

                  {/* Expanded Actions */}
                  {isSelected && (
                    <div className="px-4 pb-3 bg-white/[0.02]">
                      <button
                        type="button"
                        onClick={() => void handleRestore(version.version)}
                        disabled={isRestoring}
                        className="
                          w-full flex items-center justify-center gap-2 px-3 py-2
                          rounded-lg bg-violet-500/20 text-violet-300 text-sm font-medium
                          hover:bg-violet-500/30 transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                      >
                        {isRestoring ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        {isRestoring ? "Restoring..." : "Restore this version"}
                      </button>
                      <p className="text-xs text-zinc-500 text-center mt-2">
                        This will create a new version with the old graph.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
