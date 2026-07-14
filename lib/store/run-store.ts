/**
 * Run execution store (Zustand)
 *
 * Holds batch-run lifecycle state separate from canvas editing.
 *
 * @module lib/store/run-store
 */

import { create } from "zustand";
import type { RunStatus } from "@/lib/types/canvas";
import type { RunProgressState, RunUIState } from "@/lib/run-sse";

export interface RunStoreState {
  status: RunStatus;
  currentRunId: string | null;
  progress: RunProgressState | null;
  duration: number;
  errorMessage: string | null;
  finished: boolean;

  setStatus: (status: RunStatus) => void;
  setCurrentRunId: (runId: string | null) => void;
  applyUIState: (state: RunUIState) => void;
  reset: () => void;
  isRunning: () => boolean;
}

const initial = {
  status: "idle" as RunStatus,
  currentRunId: null as string | null,
  progress: null as RunProgressState | null,
  duration: 0,
  errorMessage: null as string | null,
  finished: false,
};

export const useRunStore = create<RunStoreState>()((set, get) => ({
  ...initial,

  setStatus: (status) => set({ status }),

  setCurrentRunId: (currentRunId) => set({ currentRunId }),

  applyUIState: (ui) =>
    set({
      status: ui.runStatus,
      currentRunId: ui.currentRunId,
      progress: ui.progress,
      duration: ui.duration,
      errorMessage: ui.errorMessage,
      finished: ui.finished,
    }),

  reset: () => set({ ...initial }),

  isRunning: () => {
    const { status } = get();
    return status !== "idle" && status !== "done" && status !== "failed";
  },
}));
