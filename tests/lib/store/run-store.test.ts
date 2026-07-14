/**
 * Tests for Run execution store (P4-C)
 *
 * Pure Zustand store for run lifecycle — separate from canvas editing state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useRunStore } from "@/lib/store/run-store";
import type { RunUIState } from "@/lib/run-sse";

describe("lib/store/run-store", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  it("starts idle with empty progress", () => {
    const s = useRunStore.getState();
    expect(s.status).toBe("idle");
    expect(s.currentRunId).toBeNull();
    expect(s.progress).toBeNull();
    expect(s.duration).toBe(0);
    expect(s.errorMessage).toBeNull();
    expect(s.finished).toBe(false);
  });

  it("applyUIState mirrors SSE-derived UI state", () => {
    const next: RunUIState = {
      runStatus: "generating",
      currentRunId: null,
      progress: { sceneIndex: 1, sceneCount: 5, percent: 20 },
      duration: 1000,
      errorMessage: null,
      finished: false,
    };
    useRunStore.getState().applyUIState(next);
    const s = useRunStore.getState();
    expect(s.status).toBe("generating");
    expect(s.progress?.percent).toBe(20);
    expect(s.duration).toBe(1000);
  });

  it("setStatus and setCurrentRunId update independently", () => {
    useRunStore.getState().setStatus("compiling");
    useRunStore.getState().setCurrentRunId("run-99");
    expect(useRunStore.getState().status).toBe("compiling");
    expect(useRunStore.getState().currentRunId).toBe("run-99");
  });

  it("reset returns to idle", () => {
    useRunStore.getState().applyUIState({
      runStatus: "done",
      currentRunId: "run-1",
      progress: { percent: 100, sceneIndex: 5, sceneCount: 5 },
      duration: 5000,
      errorMessage: null,
      finished: true,
    });
    useRunStore.getState().reset();
    const s = useRunStore.getState();
    expect(s.status).toBe("idle");
    expect(s.currentRunId).toBeNull();
    expect(s.finished).toBe(false);
  });

  it("isRunning is true only for mid-flight statuses", () => {
    expect(useRunStore.getState().isRunning()).toBe(false);
    useRunStore.getState().setStatus("generating");
    expect(useRunStore.getState().isRunning()).toBe(true);
    useRunStore.getState().setStatus("done");
    expect(useRunStore.getState().isRunning()).toBe(false);
    useRunStore.getState().setStatus("failed");
    expect(useRunStore.getState().isRunning()).toBe(false);
  });
});
