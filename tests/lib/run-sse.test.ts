/**
 * Tests for run SSE stream helpers
 *
 * Phase 4 - T401 wire: map agent SSE events → UI run state
 */

import { describe, it, expect } from "vitest";
import {
  mapAgentPhaseToRunStatus,
  applyAgentSSEEvent,
  parseSSEChunk,
  type AgentSSEEvent,
  type RunUIState,
} from "@/lib/run-sse";

describe("lib/run-sse", () => {
  describe("mapAgentPhaseToRunStatus", () => {
    it("maps agent phases to canvas RunStatus", () => {
      expect(mapAgentPhaseToRunStatus("COMPILING")).toBe("compiling");
      expect(mapAgentPhaseToRunStatus("ASSIGNING")).toBe("compiling");
      expect(mapAgentPhaseToRunStatus("GENERATING")).toBe("generating");
      expect(mapAgentPhaseToRunStatus("LINTING")).toBe("linting");
      expect(mapAgentPhaseToRunStatus("REPAIRING")).toBe("repairing");
    });
  });

  describe("parseSSEChunk", () => {
    it("parses complete SSE data frames from a buffer chunk", () => {
      const chunk =
        'event: phase\ndata: {"type":"phase","phase":"COMPILING"}\n\n' +
        'data: {"type":"scene","index":0,"preview":"hello"}\n\n';

      const events = parseSSEChunk(chunk);
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: "phase", phase: "COMPILING" });
      expect(events[1]).toEqual({ type: "scene", index: 0, preview: "hello" });
    });

    it("ignores malformed JSON lines", () => {
      const chunk = "data: {not-json}\n\ndata: {\"type\":\"done\",\"runId\":\"r1\",\"sceneCount\":1}\n\n";
      const events = parseSSEChunk(chunk);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: "done", runId: "r1" });
    });
  });

  describe("applyAgentSSEEvent", () => {
    const base: RunUIState = {
      runStatus: "idle",
      currentRunId: null,
      progress: null,
      duration: 0,
      errorMessage: null,
      finished: false,
    };

    it("updates status on phase events", () => {
      const next = applyAgentSSEEvent(base, {
        type: "phase",
        phase: "GENERATING",
      });
      expect(next.runStatus).toBe("generating");
    });

    it("updates progress on scene events", () => {
      const next = applyAgentSSEEvent(
        { ...base, runStatus: "generating" },
        { type: "scene", index: 2, preview: "abc" }
      );
      expect(next.progress).toEqual({
        sceneIndex: 2,
        sceneCount: 5,
        percent: 60,
      });
    });

    it("uses sceneCount from done when known", () => {
      const afterScene = applyAgentSSEEvent(
        { ...base, runStatus: "generating" },
        { type: "scene", index: 0, preview: "x" }
      );
      const done = applyAgentSSEEvent(afterScene, {
        type: "done",
        runId: "run-9",
        sceneCount: 3,
        duration: 1200,
      });
      expect(done.runStatus).toBe("done");
      expect(done.currentRunId).toBe("run-9");
      expect(done.duration).toBe(1200);
      expect(done.finished).toBe(true);
      expect(done.progress?.percent).toBe(100);
    });

    it("handles error events with context", () => {
      const next = applyAgentSSEEvent(
        { ...base, runStatus: "generating" },
        {
          type: "error",
          error: "Anthropic API error: timeout",
          phase: "GENERATING",
          runId: "run-1",
        }
      );
      expect(next.runStatus).toBe("failed");
      expect(next.errorMessage).toContain("timeout");
      expect(next.currentRunId).toBe("run-1");
      expect(next.finished).toBe(true);
    });
  });
});
