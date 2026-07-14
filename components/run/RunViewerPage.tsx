"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RunViewer, type Run } from "./RunViewer";
import type { RerollStage } from "./SceneCard";
import { mapApiRunToViewerRun, type ApiRun } from "@/lib/map-run";

interface RunViewerPageProps {
  runId: string;
}

export function RunViewerPage({ runId }: RunViewerPageProps) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${runId}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Run not found");
      }
      const data = (await response.json()) as ApiRun;
      setRun(mapApiRunToViewerRun(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run");
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Defer fetch so setState is not synchronous inside the effect body
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        void loadRun();
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loadRun]);

  const handleBackToCanvas = () => {
    router.push("/");
  };

  const handleReroll = async (displayIndex: number, stage?: RerollStage) => {
    // Viewer uses 1-based display index; API expects 0-based sceneIndex
    const sceneIndex = displayIndex - 1;
    try {
      const response = await fetch(`/api/runs/${runId}/reroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          stage ? { sceneIndex, stage } : { sceneIndex }
        ),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Reroll failed");
      }
      // Reload full run so lint/export stay consistent
      await loadRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reroll failed");
    }
  };

  if (loading) {
    return (
      <div
        className="pf-shell min-h-screen text-zinc-500 flex items-center justify-center"
        data-testid="run-viewer-loading"
      >
        Loading run...
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="pf-shell min-h-screen text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400" data-testid="run-viewer-error">
          {error || "Run not found"}
        </p>
        <button
          type="button"
          onClick={handleBackToCanvas}
          className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg"
        >
          Back to Canvas
        </button>
      </div>
    );
  }

  return (
    <RunViewer
      run={run}
      onReroll={handleReroll}
      onBackToCanvas={handleBackToCanvas}
    />
  );
}
