/**
 * useRunStream — consume POST /api/runs SSE body into useRunStore
 *
 * @module lib/hooks/useRunStream
 */

"use client";

import { useCallback } from "react";
import { useRunStore } from "@/lib/store/run-store";
import {
  consumeRunSSEStream,
  type RunUIState,
} from "@/lib/run-sse";

function initialUIState(): RunUIState {
  return {
    runStatus: "idle",
    currentRunId: null,
    progress: null,
    duration: 0,
    errorMessage: null,
    finished: false,
  };
}

export interface UseRunStreamReturn {
  /** Parse SSE from a fetch Response and push updates into run-store */
  consumeStream: (response: Response) => Promise<RunUIState>;
  /** Reset run-store to idle */
  reset: () => void;
  /** Mark compiling and prepare store for a new stream */
  begin: () => void;
  /** Mark failed with a client-side message (e.g. network error before stream) */
  fail: (message: string) => void;
}

export function useRunStream(): UseRunStreamReturn {
  const applyUIState = useRunStore((s) => s.applyUIState);
  const resetStore = useRunStore((s) => s.reset);

  const begin = useCallback(() => {
    applyUIState({
      ...initialUIState(),
      runStatus: "compiling",
    });
  }, [applyUIState]);

  const fail = useCallback(
    (message: string) => {
      applyUIState({
        ...initialUIState(),
        runStatus: "failed",
        errorMessage: message,
        finished: true,
      });
    },
    [applyUIState]
  );

  const reset = useCallback(() => {
    resetStore();
  }, [resetStore]);

  const consumeStream = useCallback(
    async (response: Response): Promise<RunUIState> => {
      if (!response.body) {
        const message = "No response stream from run API";
        fail(message);
        throw new Error(message);
      }

      const start: RunUIState = {
        ...initialUIState(),
        runStatus: "compiling",
      };
      applyUIState(start);

      const finalState = await consumeRunSSEStream(
        response.body,
        start,
        (next) => {
          applyUIState(next);
        }
      );

      return finalState;
    },
    [applyUIState, fail]
  );

  return { consumeStream, reset, begin, fail };
}
