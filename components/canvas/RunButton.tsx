"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useShallow } from "zustand/shallow";
import { RunModal, type RunConfig } from "./RunModal";
import { RunProgress } from "./RunProgress";
import {
  consumeRunSSEStream,
  type RunUIState,
} from "@/lib/run-sse";

const initialUIState = (): RunUIState => ({
  runStatus: "idle",
  currentRunId: null,
  progress: null,
  duration: 0,
  errorMessage: null,
  finished: false,
});

export function RunButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showProgress, setShowProgress] = useState(false);
  const [progressState, setProgressState] = useState<RunUIState>(initialUIState);

  const {
    hasBlocks,
    runStatus,
    templateId,
    templateName,
    runConfig,
    setRunStatus,
    setCurrentRunId,
    setRunConfig,
  } = useCanvasStore(
    useShallow((state) => {
      const blockNodes = state.nodes.filter((n) => n.type === "block");
      return {
        hasBlocks: blockNodes.length > 0,
        runStatus: state.runStatus,
        templateId: state.templateId,
        templateName: state.templateName,
        runConfig: state.runConfig,
        setRunStatus: state.setRunStatus,
        setCurrentRunId: state.setCurrentRunId,
        setRunConfig: state.setRunConfig,
      };
    })
  );

  const isRunning =
    runStatus !== "idle" && runStatus !== "done" && runStatus !== "failed";
  const isDisabled = !hasBlocks || isRunning;

  const handleRun = async (config: RunConfig) => {
    setIsLoading(true);
    setError(undefined);

    try {
      // Keep canvas store runConfig in sync with modal choices
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
          },
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Failed to start run");
      }

      if (!response.body) {
        throw new Error("No response stream from run API");
      }

      // Close modal and show progress while SSE streams
      setIsModalOpen(false);
      setShowProgress(true);
      setIsLoading(false);

      const start: RunUIState = {
        ...initialUIState(),
        runStatus: "compiling",
      };
      setProgressState(start);
      setRunStatus("compiling");

      await consumeRunSSEStream(response.body, start, (next) => {
        setProgressState(next);
        setRunStatus(next.runStatus);
        if (next.currentRunId) {
          setCurrentRunId(next.currentRunId);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setRunStatus("failed");
      setIsLoading(false);
    }
  };

  const handleProgressComplete = () => {
    // Keep done state visible; user can dismiss later
  };

  const handleProgressCancel = () => {
    setShowProgress(false);
    setRunStatus("idle");
    setCurrentRunId(null);
    setProgressState(initialUIState());
  };

  const progressRunId =
    progressState.currentRunId ??
    (showProgress ? "pending" : "");

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
            progress={progressState.progress ?? undefined}
            duration={progressState.duration}
            errorMessage={progressState.errorMessage ?? undefined}
            onComplete={handleProgressComplete}
            onCancel={handleProgressCancel}
            onError={() => {
              setRunStatus("failed");
            }}
          />
        </div>
      )}
    </>
  );
}
