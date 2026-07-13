/**
 * Run SSE helpers
 *
 * Pure utilities for parsing agent SSE streams and mapping events to UI state.
 * Used by RunButton / run progress wiring (Phase 4 T401).
 *
 * @module lib/run-sse
 */

import type { RunStatus } from "@/lib/types/canvas";

// =============================================================================
// Types
// =============================================================================

export type AgentPhase =
  | "COMPILING"
  | "ASSIGNING"
  | "GENERATING"
  | "LINTING"
  | "REPAIRING";

export type AgentSSEEvent =
  | { type: "phase"; phase: AgentPhase; timestamp?: number }
  | { type: "scene"; index: number; preview?: string; partial?: boolean; timestamp?: number }
  | { type: "done"; runId: string; sceneCount: number; duration?: number; timestamp?: number }
  | { type: "error"; error: string; phase?: AgentPhase; runId?: string; timestamp?: number };

export interface RunProgressState {
  sceneIndex?: number;
  sceneCount?: number;
  percent: number;
}

export interface RunUIState {
  runStatus: RunStatus;
  currentRunId: string | null;
  progress: RunProgressState | null;
  duration: number;
  errorMessage: string | null;
  finished: boolean;
}

// =============================================================================
// Mapping
// =============================================================================

/**
 * Map agent phase labels to canvas store RunStatus.
 * ASSIGNING is treated as compiling (scaffold prep).
 */
export function mapAgentPhaseToRunStatus(phase: AgentPhase): RunStatus {
  switch (phase) {
    case "COMPILING":
    case "ASSIGNING":
      return "compiling";
    case "GENERATING":
      return "generating";
    case "LINTING":
      return "linting";
    case "REPAIRING":
      return "repairing";
    default:
      return "idle";
  }
}

/**
 * Apply a single agent SSE event to UI run state (immutable).
 */
export function applyAgentSSEEvent(
  state: RunUIState,
  event: AgentSSEEvent
): RunUIState {
  switch (event.type) {
    case "phase":
      return {
        ...state,
        runStatus: mapAgentPhaseToRunStatus(event.phase),
        errorMessage: null,
      };

    case "scene": {
      const knownCount = state.progress?.sceneCount ?? 5;
      const sceneIndex = event.index;
      // Agent indices are 0-based; percent reflects scenes completed including this one
      const percent = Math.min(
        100,
        Math.round(((sceneIndex + 1) / knownCount) * 100)
      );
      return {
        ...state,
        runStatus: "generating",
        progress: {
          sceneIndex,
          sceneCount: knownCount,
          percent,
        },
      };
    }

    case "done":
      return {
        ...state,
        runStatus: "done",
        currentRunId: event.runId,
        duration: event.duration ?? state.duration,
        progress: {
          sceneIndex: event.sceneCount,
          sceneCount: event.sceneCount,
          percent: 100,
        },
        errorMessage: null,
        finished: true,
      };

    case "error":
      return {
        ...state,
        runStatus: "failed",
        currentRunId: event.runId ?? state.currentRunId,
        errorMessage: event.error,
        finished: true,
      };

    default:
      return state;
  }
}

/**
 * Parse one or more complete SSE frames from a text chunk.
 * Supports both `event:` + `data:` and bare `data:` frames.
 */
export function parseSSEChunk(chunk: string): AgentSSEEvent[] {
  const events: AgentSSEEvent[] = [];
  const blocks = chunk.split("\n\n");

  for (const block of blocks) {
    if (!block.trim()) continue;
    const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
    if (!dataLine) continue;
    const raw = dataLine.slice(6).trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as AgentSSEEvent;
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        events.push(parsed);
      }
    } catch {
      // skip malformed
    }
  }

  return events;
}

/**
 * Read a full SSE ReadableStream and reduce events into RunUIState.
 * Calls onEvent after each applied event (for store sync).
 */
export async function consumeRunSSEStream(
  body: ReadableStream<Uint8Array>,
  initial: RunUIState,
  onEvent?: (state: RunUIState, event: AgentSSEEvent) => void
): Promise<RunUIState> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let state = initial;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const events = parseSSEChunk(part + "\n\n");
        for (const event of events) {
          state = applyAgentSSEEvent(state, event);
          onEvent?.(state, event);
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      const events = parseSSEChunk(buffer + "\n\n");
      for (const event of events) {
        state = applyAgentSSEEvent(state, event);
        onEvent?.(state, event);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return state;
}
