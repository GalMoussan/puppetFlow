"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type RunStatus =
  | "idle"
  | "compiling"
  | "generating"
  | "linting"
  | "repairing"
  | "done"
  | "failed";

export interface Progress {
  sceneIndex?: number;
  sceneCount?: number;
  percent: number;
}

interface SSEEvent {
  type: RunStatus;
  sceneIndex?: number;
  sceneCount?: number;
  progress?: number;
  runId?: string;
  error?: string;
}

interface UseRunProgressOptions {
  onComplete?: (runId: string) => void;
  onError?: (error: Error) => void;
}

interface UseRunProgressReturn {
  status: RunStatus;
  progress: Progress | null;
  isConnected: boolean;
  error: Error | null;
  duration: number;
}

const RECONNECT_DELAY = 3000;
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export function useRunProgress(
  runId: string,
  options: UseRunProgressOptions = {}
): UseRunProgressReturn {
  const { onComplete, onError } = options;
  const [status, setStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [duration, setDuration] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    const eventSource = new EventSource(`/api/runs/${runId}/progress`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);

        setStatus(data.type);

        if (data.type === "generating" && data.sceneIndex !== undefined) {
          setProgress({
            sceneIndex: data.sceneIndex,
            sceneCount: data.sceneCount,
            percent: data.progress ?? 0,
          });
        }

        if (data.type === "done" && data.runId) {
          onComplete?.(data.runId);
          cleanup();
        }

        if (data.type === "failed" && data.error) {
          const err = new Error(data.error);
          setError(err);
          onError?.(err);
          cleanup();
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError(new Error("Connection lost"));

      // Attempt reconnect
      reconnectRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY);
    };

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      const timeoutError = new Error("Run timeout - exceeded 5 minutes");
      setError(timeoutError);
      onError?.(timeoutError);
      cleanup();
    }, TIMEOUT_DURATION);
  }, [runId, onComplete, onError, cleanup]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    connect();

    // Update duration every second
    const durationInterval = setInterval(() => {
      setDuration(Date.now() - startTimeRef.current);
    }, 1000);

    return () => {
      cleanup();
      clearInterval(durationInterval);
    };
  }, [connect, cleanup]);

  return {
    status,
    progress,
    isConnected,
    error,
    duration,
  };
}
