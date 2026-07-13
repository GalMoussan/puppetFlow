"use client";

import { useState, useMemo } from "react";
import { Play, Loader2 } from "lucide-react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useShallow } from "zustand/shallow";
import { RunModal, type RunConfig } from "./RunModal";

export function RunButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { hasBlocks, runStatus, templateId, templateName } = useCanvasStore(
    useShallow((state) => {
      const blockNodes = state.nodes.filter((n) => n.type === "block");
      return {
        hasBlocks: blockNodes.length > 0,
        runStatus: state.runStatus,
        templateId: state.templateId,
        templateName: state.templateName,
      };
    })
  );

  const isRunning = runStatus !== "idle" && runStatus !== "done" && runStatus !== "failed";
  const isDisabled = !hasBlocks || isRunning;

  const handleRun = async (config: RunConfig) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          ...config,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start run");
      }

      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          ${isDisabled
            ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-500 text-white"}
          transition-colors
        `}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" data-testid="run-button-loading" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run
          </>
        )}
      </button>

      <RunModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRun={handleRun}
        templateId={templateId || ""}
        templateName={templateName || ""}
        isLoading={isLoading}
        error={error}
      />
    </>
  );
}
