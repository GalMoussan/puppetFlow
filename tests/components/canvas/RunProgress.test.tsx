/**
 * Tests for SSE Progress Visualization
 *
 * Phase 4 - T402: SSE Progress Visualization
 *
 * Tests cover:
 * - Progress states (compiling, generating, linting, etc.)
 * - Progress bar updates
 * - Connection handling
 * - Cancel functionality
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// These imports will fail until implementation exists - expected for TDD
import { RunProgress } from "@/components/canvas/RunProgress";
import { useRunProgress } from "@/hooks/useRunProgress";

import {
  createMockCanvasStore,
  type MockCanvasStore,
  type RunStatus,
} from "@/tests/mocks/canvas-fixtures";
import { useRunStore } from "@/lib/store/run-store";

// =============================================================================
// Mock Setup
// =============================================================================

let mockStore: MockCanvasStore;

vi.mock("@/lib/store/canvas-store", () => ({
  useCanvasStore: vi.fn((selector?: (state: MockCanvasStore) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockStore);
    }
    return mockStore;
  }),
}));

// Mock EventSource for SSE
let mockEventSourceInstance: MockEventSource | null = null;
let mockEventSourceInstances: MockEventSource[] = [];

function createMockEventSource(url: string): MockEventSource {
  const instance: MockEventSource = {
    url,
    onopen: null,
    onmessage: null,
    onerror: null,
    readyState: 0,
    close: vi.fn(),
  };
  mockEventSourceInstance = instance;
  mockEventSourceInstances.push(instance);
  setTimeout(() => {
    instance.readyState = 1;
    instance.onopen?.();
  }, 0);
  return instance;
}

type MockEventSource = {
  url: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  readyState: number;
  close: ReturnType<typeof vi.fn>;
};

global.EventSource = createMockEventSource as unknown as typeof EventSource;

// =============================================================================
// Test Suite: RunProgress Component
// =============================================================================

describe("RunProgress", () => {
  const defaultProps = {
    runId: "run-001",
    onComplete: vi.fn(),
    onError: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createMockCanvasStore({});
    useRunStore.getState().reset();
    useRunStore.getState().setStatus("generating");
    useRunStore.getState().setCurrentRunId("run-001");
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ===========================================================================
  // Progress States
  // ===========================================================================

  describe("Progress States", () => {
    it("shows compiling state", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("compiling");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} />);

      expect(screen.getByText(/compiling/i)).toBeInTheDocument();
      expect(screen.getByTestId("step-indicator")).toHaveAttribute(
        "data-step",
        "compiling"
      );
    });

    it("shows generating state with scene progress", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("generating");
      useRunStore.getState().setCurrentRunId("run-001");

      render(
        <RunProgress
          {...defaultProps}
          progress={{ sceneIndex: 2, sceneCount: 5, percent: 40 }}
        />
      );

      expect(screen.getByText(/generating/i)).toBeInTheDocument();
      expect(screen.getByText(/2 of 5/i)).toBeInTheDocument();
    });

    it("shows linting state", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("linting");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} />);

      expect(screen.getByText(/linting/i)).toBeInTheDocument();
    });

    it("shows repairing state", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("repairing");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} />);

      expect(screen.getByText(/repairing/i)).toBeInTheDocument();
    });

    it("shows done state", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("done");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} />);

      expect(screen.getByText(/complete/i)).toBeInTheDocument();
    });

    it("shows failed state with message", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("failed");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} errorMessage="API rate limit exceeded" />);

      expect(screen.getByText(/failed/i)).toBeInTheDocument();
      expect(screen.getByText(/API rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Progress Bar
  // ===========================================================================

  describe("Progress Bar", () => {
    it("renders progress bar", () => {
      render(<RunProgress {...defaultProps} progress={{ percent: 0 }} />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("updates progress bar value", () => {
      render(<RunProgress {...defaultProps} progress={{ percent: 60 }} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "60");
    });

    it("shows progress percentage text", () => {
      render(<RunProgress {...defaultProps} progress={{ percent: 75 }} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("progress bar is indeterminate during compiling", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("compiling");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("data-indeterminate", "true");
    });
  });

  // ===========================================================================
  // Time Estimation
  // ===========================================================================

  describe("Time Estimation", () => {
    it("shows elapsed time", () => {
      render(<RunProgress {...defaultProps} duration={45000} />);

      expect(screen.getByText(/45s/i)).toBeInTheDocument();
    });

    it("shows estimated time remaining", () => {
      render(
        <RunProgress
          {...defaultProps}
          progress={{ sceneIndex: 2, sceneCount: 5, percent: 40 }}
          duration={30000}
        />
      );

      // With 2/5 complete in 30s, estimate ~45s remaining
      expect(screen.getByText(/remaining/i)).toBeInTheDocument();
    });

    it("does not show estimate when no scene data", () => {
      render(<RunProgress {...defaultProps} duration={10000} />);

      expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Step Indicator
  // ===========================================================================

  describe("Step Indicator", () => {
    it("shows all steps", () => {
      render(<RunProgress {...defaultProps} />);

      expect(screen.getByText(/compile/i)).toBeInTheDocument();
      expect(screen.getByText(/generate/i)).toBeInTheDocument();
      expect(screen.getByText(/lint/i)).toBeInTheDocument();
    });

    it("marks completed steps", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("linting");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} />);

      const compileStep = screen.getByTestId("step-compile");
      const generateStep = screen.getByTestId("step-generate");
      const lintStep = screen.getByTestId("step-lint");

      expect(compileStep).toHaveAttribute("data-completed", "true");
      expect(generateStep).toHaveAttribute("data-completed", "true");
      expect(lintStep).toHaveAttribute("data-active", "true");
    });
  });

  // ===========================================================================
  // Cancel Button
  // ===========================================================================

  describe("Cancel Button", () => {
    it("renders cancel button", () => {
      render(<RunProgress {...defaultProps} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("calls onCancel when clicked", async () => {
      const user = userEvent.setup();
      render(<RunProgress {...defaultProps} />);

      // Click cancel button
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Click "Yes, cancel" in the confirmation dialog
      await user.click(screen.getByRole("button", { name: /yes, cancel/i }));

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it("hides cancel button when done", () => {
      mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("done");
      useRunStore.getState().setCurrentRunId("run-001");

      render(<RunProgress {...defaultProps} />);

      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    });

    it("shows confirmation dialog before canceling", async () => {
      const user = userEvent.setup();
      render(<RunProgress {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Test Suite: useRunProgress Hook
// =============================================================================

describe("useRunProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSourceInstance = null;
    mockEventSourceInstances = [];
    mockStore = createMockCanvasStore({});
      useRunStore.getState().reset();
  });

  it("connects to SSE endpoint", async () => {
    const { result } = renderHook(() => useRunProgress("run-001"));

    // Wait for the async onopen to be called
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("updates state on compiling event", async () => {
    const { result } = renderHook(() => useRunProgress("run-001"));

    // Wait for connection
    await waitFor(() => {
      expect(mockEventSourceInstance).toBeTruthy();
    });

    act(() => {
      // Simulate SSE event
      const event = { data: JSON.stringify({ type: "compiling" }) };
      mockEventSourceInstance?.onmessage?.(event);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("compiling");
    });
  });

  it("updates progress on generating event", async () => {
    const { result } = renderHook(() => useRunProgress("run-001"));

    // Wait for connection
    await waitFor(() => {
      expect(mockEventSourceInstance).toBeTruthy();
    });

    act(() => {
      const event = {
        data: JSON.stringify({
          type: "generating",
          sceneIndex: 3,
          sceneCount: 5,
          progress: 60,
        }),
      };
      mockEventSourceInstance?.onmessage?.(event);
    });

    await waitFor(() => {
      expect(result.current.progress).toEqual({
        sceneIndex: 3,
        sceneCount: 5,
        percent: 60,
      });
    });
  });

  it("calls onComplete when done event received", async () => {
    const onComplete = vi.fn();
    renderHook(() => useRunProgress("run-001", { onComplete }));

    // Wait for connection
    await waitFor(() => {
      expect(mockEventSourceInstance).toBeTruthy();
    });

    act(() => {
      const event = {
        data: JSON.stringify({ type: "done", runId: "run-001" }),
      };
      mockEventSourceInstance?.onmessage?.(event);
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("run-001");
    });
  });

  it("handles connection error", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useRunProgress("run-001", { onError }));

    // Wait for connection
    await waitFor(() => {
      expect(mockEventSourceInstance).toBeTruthy();
    });

    act(() => {
      mockEventSourceInstance?.onerror?.();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it("attempts reconnect on connection drop", async () => {
    vi.useFakeTimers();

    renderHook(() => useRunProgress("run-001"));

    // Wait for initial connection
    await vi.advanceTimersByTimeAsync(10);

    act(() => {
      mockEventSourceInstance?.onerror?.();
    });

    // Fast-forward reconnect delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Should have created a new EventSource for reconnect
    expect(mockEventSourceInstances.length).toBe(2);

    vi.useRealTimers();
  });

  it("closes connection on unmount", async () => {
    const { unmount } = renderHook(() => useRunProgress("run-001"));

    // Wait for connection
    await waitFor(() => {
      expect(mockEventSourceInstance).toBeTruthy();
    });

    const instance = mockEventSourceInstance;
    unmount();

    expect(instance?.close).toHaveBeenCalled();
  });

  it("times out after 5 minutes", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();

    renderHook(() => useRunProgress("run-001", { onError }));

    // Wait for initial connection setup
    await vi.advanceTimersByTimeAsync(10);

    // Fast-forward past the timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);
    });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining("timeout"),
    }));

    vi.useRealTimers();
  });
});

// Helper for testing hooks
function renderHook<T>(hookFn: () => T): { result: { current: T }; unmount: () => void } {
  const result: { current: T } = { current: undefined as T };

  const TestComponent = () => {
    result.current = hookFn();
    return null;
  };

  const { unmount } = render(<TestComponent />);
  return { result, unmount };
}
