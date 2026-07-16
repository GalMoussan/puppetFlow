/**
 * Tests for useRunStream hook (P4-C)
 *
 * Consumes a fetch Response body SSE stream and updates useRunStore.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRunStream } from "@/lib/hooks/useRunStream";
import { useRunStore } from "@/lib/store/run-store";

function mockSSEResponse(events: object[]) {
  const encoder = new TextEncoder();
  const chunks = events.map(
    (e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`
  );
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
  return {
    ok: true,
    status: 200,
    body: stream,
    json: async () => ({}),
  } as Response;
}

describe("useRunStream", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  it("consumeStream updates store through phases to done", async () => {
    const { result } = renderHook(() => useRunStream());

    const response = mockSSEResponse([
      { type: "phase", phase: "COMPILING" },
      { type: "phase", phase: "GENERATING" },
      { type: "scene", index: 0, preview: "hi" },
      { type: "phase", phase: "LINTING" },
      { type: "done", runId: "run-stream-1", sceneCount: 1, duration: 42 },
    ]);

    let final;
    await act(async () => {
      final = await result.current.consumeStream(response);
    });

    await waitFor(() => {
      expect(useRunStore.getState().status).toBe("done");
      expect(useRunStore.getState().currentRunId).toBe("run-stream-1");
      expect(useRunStore.getState().finished).toBe(true);
    });

    expect(final).toMatchObject({
      runStatus: "done",
      currentRunId: "run-stream-1",
    });
  });

  it("consumeStream records error events as failed", async () => {
    const { result } = renderHook(() => useRunStream());

    const response = mockSSEResponse([
      { type: "phase", phase: "GENERATING" },
      {
        type: "error",
        error: "Anthropic API key missing",
        phase: "GENERATING",
        runId: "run-err",
      },
    ]);

    await act(async () => {
      await result.current.consumeStream(response);
    });

    expect(useRunStore.getState().status).toBe("failed");
    expect(useRunStore.getState().errorMessage).toContain("Anthropic");
    expect(useRunStore.getState().currentRunId).toBe("run-err");
  });

  it("reset clears store via hook", () => {
    useRunStore.getState().setStatus("generating");
    const { result } = renderHook(() => useRunStream());
    act(() => {
      result.current.reset();
    });
    expect(useRunStore.getState().status).toBe("idle");
  });
});
