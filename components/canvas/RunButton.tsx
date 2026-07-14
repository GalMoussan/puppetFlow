"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useRunStore } from "@/lib/store/run-store";
import { toast } from "@/lib/store/toast-store";
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

  const {
    hasBlocks,
    templateId,
    templateName,
    runConfig,
    setRunConfig,
    isDirty,
    saveTemplate,
  } = useCanvasStore(
    useShallow((state) => {
      const blockNodes = state.nodes.filter((n) => n.type === "block");
      return {
        hasBlocks: blockNodes.length > 0,
        templateId: state.templateId,
        templateName: state.templateName,
        runConfig: state.runConfig,
        setRunConfig: state.setRunConfig,
        isDirty: state.isDirty,
        saveTemplate: state.saveTemplate,
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
  // Only disable when there is nothing to run. Mid-flight status must NOT
  // permanently disable the button — otherwise resetRun() on click never fires
  // and the user is stuck. Concurrent runs are rejected by the API (409).
  const isDisabled = !hasBlocks;
  const showRunningLabel = showProgress || isRunning;

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

      // Server runs the *saved* template graph — persist dirty import/canvas first.
      // setRunConfig marks dirty on the real store; read via getState when available.
      const getState = (
        useCanvasStore as typeof useCanvasStore & {
          getState?: () => { isDirty: boolean; saveState: string };
        }
      ).getState;
      const snap = typeof getState === "function" ? getState() : null;
      if (isDirty || snap?.isDirty) {
        await saveTemplate();
        const after = typeof getState === "function" ? getState() : null;
        if (after?.saveState === "error") {
          throw new Error(
            "Could not save template before run. Fix save errors and try again."
          );
        }
        toast.success("Template saved before run");
      }

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
      } else if (finalState.runStatus === "failed") {
        // Keep progress host open with error so user can read + dismiss
        setShowProgress(true);
        toast.error(finalState.errorMessage ?? "Run failed");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start run";
      setError(message);
      fail(message);
      toast.error(message);
      setIsLoading(false);
      // If we already closed the modal for streaming, show progress error card
      setShowProgress((was) => {
        if (was) return true;
        // Pre-stream errors: leave modal open with error
        return false;
      });
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
        type="button"
        data-testid="run-button"
        onClick={() => {
          // Always clear stuck status + progress host before opening config
          resetRun();
          setShowProgress(false);
          setError(undefined);
          setIsLoading(false);
          setIsModalOpen(true);
        }}
        disabled={isDisabled}
        title={
          !hasBlocks
            ? "Add blocks to the canvas before running"
            : "Configure and start a generation run"
        }
        className={`
          pf-btn px-4 py-1.5 font-semibold tracking-tight
          ${
            isDisabled
              ? "bg-white/[0.06] text-zinc-600 cursor-not-allowed border border-white/[0.06]"
              : "pf-btn-primary"
          }
        `}
      >
        {showRunningLabel ? (
          <>
            <Loader2
              className="w-4 h-4 animate-spin"
              data-testid="run-button-loading"
            />
            Running…
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
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
        <div
          className="fixed bottom-4 right-4 z-[110] w-full max-w-md shadow-2xl pointer-events-auto"
          data-testid="run-progress-host"
        >
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
