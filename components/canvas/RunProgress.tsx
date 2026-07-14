"use client";

import { useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { useRunStore } from "@/lib/store/run-store";
import type { RunStatus } from "@/lib/types/canvas";

interface Progress {
  sceneIndex?: number;
  sceneCount?: number;
  percent: number;
}

interface RunProgressProps {
  runId: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  /** Optional overrides for tests; defaults to useRunStore */
  progress?: Progress;
  duration?: number;
  errorMessage?: string;
  /** Optional status override for tests */
  status?: RunStatus;
}

const STEPS: { id: string; label: string; status: RunStatus[] }[] = [
  { id: "compile", label: "Compile", status: ["compiling"] },
  { id: "generate", label: "Generate", status: ["generating"] },
  { id: "lint", label: "Lint", status: ["linting", "repairing"] },
];

function getStepState(
  stepStatus: RunStatus[],
  currentStatus: RunStatus
): "pending" | "active" | "completed" {
  const statusOrder: RunStatus[] = [
    "idle",
    "compiling",
    "generating",
    "linting",
    "repairing",
    "done",
    "failed",
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);
  const stepFirstIndex = statusOrder.indexOf(stepStatus[0]);

  // Find the highest index for this step
  const stepLastIndex = Math.max(
    ...stepStatus.map((s) => statusOrder.indexOf(s))
  );

  if (stepStatus.includes(currentStatus)) {
    return "active";
  }
  if (currentIndex > stepLastIndex) {
    return "completed";
  }
  return "pending";
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function estimateRemaining(
  sceneIndex: number,
  sceneCount: number,
  durationMs: number
): string | null {
  if (sceneIndex === 0 || sceneCount === 0) return null;

  const avgPerScene = durationMs / sceneIndex;
  const remaining = avgPerScene * (sceneCount - sceneIndex);
  return formatDuration(remaining);
}

export function RunProgress({
  runId: _runId,
  onComplete: _onComplete,
  onError: _onError,
  onCancel,
  progress: progressProp,
  duration: durationProp,
  errorMessage: errorMessageProp,
  status: statusProp,
}: RunProgressProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const storeStatus = useRunStore((s) => s.status);
  const storeProgress = useRunStore((s) => s.progress);
  const storeDuration = useRunStore((s) => s.duration);
  const storeError = useRunStore((s) => s.errorMessage);

  const runStatus = statusProp ?? storeStatus;
  const progress = progressProp ?? storeProgress ?? undefined;
  const duration = durationProp ?? storeDuration;
  const errorMessage = errorMessageProp ?? storeError ?? undefined;

  const isIndeterminate = runStatus === "compiling";
  const isDone = runStatus === "done";
  const isFailed = runStatus === "failed";
  const showCancelButton = !isDone && !isFailed;

  const handleCancelClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
    onCancel?.();
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  const getStatusLabel = () => {
    switch (runStatus) {
      case "compiling":
        return "Compiling template...";
      case "generating":
        return "Generating scenes...";
      case "linting":
        return "Linting output...";
      case "repairing":
        return "Repairing issues...";
      case "done":
        return "Complete!";
      case "failed":
        return "Failed";
      default:
        return "Starting...";
    }
  };

  return (
    <div
      className="bg-[#0a0a0b] rounded-xl p-6 border border-white/[0.1] space-y-4"
      data-testid="run-progress"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Run Progress</h3>
        {showCancelButton && (
          <button
            onClick={handleCancelClick}
            className="text-zinc-500 hover:text-white transition-colors text-sm"
            aria-label="Cancel"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        {isDone ? (
          <Check className="w-5 h-5 text-green-500" />
        ) : isFailed ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        )}
        <span className="text-white">{getStatusLabel()}</span>
        {progress?.sceneIndex !== undefined &&
          progress?.sceneCount !== undefined && (
            <span className="text-zinc-500 text-sm">
              {progress.sceneIndex} of {progress.sceneCount}
            </span>
          )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div
          role="progressbar"
          aria-valuenow={progress?.percent ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          data-indeterminate={isIndeterminate ? "true" : undefined}
          className="h-2 bg-white/[0.04] rounded-full overflow-hidden"
        >
          <div
            className={`h-full transition-all duration-300 ${
              isIndeterminate
                ? "bg-blue-500 animate-pulse w-full"
                : isFailed
                  ? "bg-red-500"
                  : isDone
                    ? "bg-green-500"
                    : "bg-blue-500"
            }`}
            style={
              isIndeterminate ? undefined : { width: `${progress?.percent ?? 0}%` }
            }
          />
        </div>
        {progress?.percent !== undefined && !isIndeterminate && (
          <div className="text-right text-sm text-zinc-500">
            {progress.percent}%
          </div>
        )}
      </div>

      {/* Time Info */}
      <div className="flex justify-between text-sm text-zinc-500">
        <span>Elapsed: {formatDuration(duration)}</span>
        {progress?.sceneIndex !== undefined &&
          progress?.sceneCount !== undefined &&
          progress.sceneIndex > 0 && (
            <span>
              ~{estimateRemaining(progress.sceneIndex, progress.sceneCount, duration)}{" "}
              remaining
            </span>
          )}
      </div>

      {/* Step Indicator */}
      <div
        className="flex items-center gap-2"
        data-testid="step-indicator"
        data-step={runStatus}
      >
        {STEPS.map((step, index) => {
          const state = getStepState(step.status, runStatus);
          return (
            <div key={step.id} className="flex items-center gap-2">
              {index > 0 && (
                <div
                  className={`w-8 h-0.5 ${
                    state === "completed" ? "bg-green-500" : "bg-white/[0.08]"
                  }`}
                />
              )}
              <div
                data-testid={`step-${step.id}`}
                data-completed={state === "completed" ? "true" : undefined}
                data-active={state === "active" ? "true" : undefined}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  state === "completed"
                    ? "text-green-500"
                    : state === "active"
                      ? "text-blue-500"
                      : "text-zinc-500"
                }`}
              >
                {state === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : state === "active" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-zinc-500" />
                )}
                <span>{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {isFailed && errorMessage && (
        <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Cancel Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0a0b] rounded-xl p-6 max-w-sm border border-white/[0.1]">
            <p className="text-white mb-4">
              Are you sure you want to cancel this run?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors"
              >
                No, continue
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
