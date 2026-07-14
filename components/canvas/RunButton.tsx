"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useRunStore } from "@/lib/store/run-store";
import { useShallow } from "zustand/shallow";
import { RunModal, type RunConfig } from "./RunModal";
import { RunProgress } from "./RunProgress";
import { useRunStream } from "@/lib/hooks/useRunStream";

export function RunButton() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showProgress, setShowProgress] = useState(false);

  const { hasBlocks, templateId, templateName, runConfig, setRunConfig } =
    useCanvasStore(
      useShallow((state) => {
        const blockNodes = state.nodes.filter((n) => n.type === "block");
        return {
          hasBlocks: blockNodes.length > 0,
          templateId: state.templateId,
          templateName: state.templateName,
          runConfig: state.runConfig,
          setRunConfig: state.setRunConfig,
        };
      })
    );

  const { status, currentRunId, progress, duration, errorMessage } =
    useRunStore(
      useShallow((s) => ({
        status: s.status,
        currentRunId: s.currentRunId,
        progress: s.progress,
        duration: s.duration,
        errorMessage: s.errorMessage,
      }))
    );

  const { consumeStream, reset: resetRun, fail } = useRunStream();

  const isRunning =
    status !== "idle" && status !== "done" && status !== "failed";
  const isDisabled = !hasBlocks || isRunning;

  const handleRun = async (config: RunConfig) => {
    setIsLoading(true);
    setError(undefined);

    try {
      if (!templateId) {
        throw new Error(
          "No template loaded. Wait for workspace bootstrap or create a template first."
        );
      }

      // Keep canvas runConfig (saved with template graph) in sync with modal
      setRunConfig({
        batchSize: config.sceneCount,
        loopMode: config.loopMode,
        languages: config.languages,
      });

      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          runConfig: {
            batchSize: config.sceneCount,
            loopMode: config.loopMode,
            languages: config.languages,
            historyStrictness: config.historyStrictness,
            model: config.model,
          },
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: {
            fieldErrors?: Record<string, string[]>;
            formErrors?: string[];
          };
        };
        const detailParts: string[] = [];
        if (data.details?.formErrors?.length) {
          detailParts.push(...data.details.formErrors);
        }
        if (data.details?.fieldErrors) {
          for (const [field, msgs] of Object.entries(data.details.fieldErrors)) {
            if (msgs?.length) detailParts.push(`${field}: ${msgs.join(", ")}`);
          }
        }
        const message = detailParts.length
          ? `${data.error || "Validation failed"} — ${detailParts.join("; ")}`
          : data.error || "Failed to start run";
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("No response stream from run API");
      }

      setIsModalOpen(false);
      setShowProgress(true);
      setIsLoading(false);

      const finalState = await consumeStream(response);

      if (finalState.runStatus === "done" && finalState.currentRunId) {
        router.push(`/runs/${finalState.currentRunId}`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start run";
      setError(message);
      // Keep modal open for pre-stream validation/API errors
      fail(message);
      setIsLoading(false);
      // Only show progress overlay if we already started streaming
      // (showProgress true means stream had begun)
    }
  };

  const handleProgressComplete = () => {
    if (currentRunId) {
      router.push(`/runs/${currentRunId}`);
    }
  };

  const handleProgressCancel = () => {
    setShowProgress(false);
    resetRun();
  };

  const progressRunId = currentRunId ?? (showProgress ? "pending" : "");

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          ${
            isDisabled
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-500 text-white"
          }
          transition-colors
        `}
      >
        {isRunning ? (
          <>
            <Loader2
              className="w-4 h-4 animate-spin"
              data-testid="run-button-loading"
            />
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
        defaults={{
          sceneCount: runConfig.batchSize,
          loopMode: runConfig.loopMode,
          languages: runConfig.languages,
        }}
      />

      {showProgress && progressRunId && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-md shadow-2xl">
          <RunProgress
            runId={progressRunId}
            progress={progress ?? undefined}
            duration={duration}
            errorMessage={errorMessage ?? undefined}
            onComplete={handleProgressComplete}
            onCancel={handleProgressCancel}
            onError={() => {
              fail(errorMessage ?? "Run failed");
            }}
          />
        </div>
      )}
    </>
  );
}
