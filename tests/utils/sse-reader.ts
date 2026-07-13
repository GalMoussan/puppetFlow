/**
 * SSE Stream Reader Utilities
 *
 * Helpers for testing Server-Sent Events streams in API tests.
 */

/**
 * SSE Event types that can be emitted
 */
export type SSEEventType = "phase" | "scene" | "error" | "done";

/**
 * SSE Event payload
 */
export interface SSEEvent {
  type: SSEEventType;
  phase?: string;
  index?: number;
  preview?: string;
  error?: string;
  runId?: string;
  sceneCount?: number;
  duration?: number;
  timestamp?: number;
  partial?: boolean;
}

/**
 * Read SSE events from a Response stream
 * Yields each parsed event as it arrives
 */
export async function* readSSE(response: Response): AsyncGenerator<SSEEvent> {
  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        // Handle multi-line SSE format: "event: type\ndata: {...}"
        // Also handle simple format: "data: {...}"
        const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
        if (dataLine) {
          const data = dataLine.slice(6).trim();
          if (data) {
            try {
              yield JSON.parse(data) as SSEEvent;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    // Process any remaining data in buffer
    const dataLine = buffer.split("\n").find((l) => l.startsWith("data: "));
    if (dataLine) {
      const data = dataLine.slice(6).trim();
      if (data) {
        try {
          yield JSON.parse(data) as SSEEvent;
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Collect all SSE events from a Response stream into an array
 */
export async function collectSSEEvents(response: Response): Promise<SSEEvent[]> {
  const events: SSEEvent[] = [];
  for await (const event of readSSE(response)) {
    events.push(event);
  }
  return events;
}

/**
 * Create a mock SSE stream for testing
 */
export function createMockSSEStream(events: SSEEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        const data = `data: ${JSON.stringify(events[index])}\n\n`;
        controller.enqueue(encoder.encode(data));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Create a mock Response with SSE stream
 */
export function createMockSSEResponse(events: SSEEvent[]): Response {
  return new Response(createMockSSEStream(events), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Assert that events follow the expected phase sequence
 */
export function assertPhaseSequence(
  events: SSEEvent[],
  expectedPhases: string[]
): void {
  const phaseEvents = events.filter((e) => e.type === "phase");
  const actualPhases = phaseEvents.map((e) => e.phase);

  if (actualPhases.length !== expectedPhases.length) {
    throw new Error(
      `Phase count mismatch: expected ${expectedPhases.length}, got ${actualPhases.length}`
    );
  }

  for (let i = 0; i < expectedPhases.length; i++) {
    if (actualPhases[i] !== expectedPhases[i]) {
      throw new Error(
        `Phase mismatch at index ${i}: expected ${expectedPhases[i]}, got ${actualPhases[i]}`
      );
    }
  }
}

/**
 * Assert that timestamps are monotonically increasing
 */
export function assertMonotonicTimestamps(events: SSEEvent[]): void {
  const timestampedEvents = events.filter((e) => e.timestamp !== undefined);
  for (let i = 1; i < timestampedEvents.length; i++) {
    const prev = timestampedEvents[i - 1].timestamp!;
    const curr = timestampedEvents[i].timestamp!;
    if (curr < prev) {
      throw new Error(
        `Timestamps not monotonic: ${prev} > ${curr} at index ${i}`
      );
    }
  }
}
