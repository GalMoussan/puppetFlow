/**
 * Tests for RunButton Component
 *
 * Phase 4 - T401: Run Button & Execution Flow
 *
 * Tests cover:
 * - Button states (enabled/disabled)
 * - Modal opening/closing
 * - Form validation
 * - Execution flow
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// This import will fail until implementation exists - expected for TDD
import { RunButton } from "@/components/canvas/RunButton";
import { RunModal } from "@/components/canvas/RunModal";

import {
  createMockCanvasStore,
  createBlockNode,
  createLaneNodes,
  mockCameraBlock,
  type MockCanvasStore,
} from "@/tests/mocks/canvas-fixtures";
import { useRunStore } from "@/lib/store/run-store";
import { useToastStore } from "@/lib/store/toast-store";

// =============================================================================
// Mock Setup
// =============================================================================

let mockStore: MockCanvasStore;
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("@/lib/store/canvas-store", () => ({
  useCanvasStore: vi.fn((selector?: (state: MockCanvasStore) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockStore);
    }
    return mockStore;
  }),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockLlmStatusResponse(
  overrides: Partial<{
    provider: string;
    hasKey: boolean;
    defaultModel: string;
    models: Array<{ value: string; label: string }>;
  }> = {}
) {
  return {
    ok: true,
    json: async () => ({
      provider: "deepseek",
      hasKey: true,
      defaultModel: "deepseek-chat",
      models: [
        { value: "deepseek-chat", label: "DeepSeek Chat" },
        { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
      ],
      ...overrides,
    }),
  };
}

/** Route mockFetch: /api/llm/status → provider info; other URLs → provided response */
function mockFetchWithLlmStatus(runResponse: unknown) {
  mockFetch.mockImplementation(async (url: string | URL | Request) => {
    const href =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    if (href.includes("/api/llm/status")) {
      return mockLlmStatusResponse();
    }
    return runResponse as Response;
  });
}

// =============================================================================
// Test Suite: RunButton
// =============================================================================

describe("RunButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockReset();
    useRunStore.getState().reset();
    useToastStore.getState().clear();
    mockStore = createMockCanvasStore({
      nodes: createLaneNodes(),
      templateId: "tpl-001",
      templateName: "Test Template",
    });
    mockFetch.mockReset();
    // Default: status endpoint works; other calls fail until a test configures them
    mockFetch.mockImplementation(async (url: string | URL | Request) => {
      const href =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (href.includes("/api/llm/status")) {
        return mockLlmStatusResponse();
      }
      return { ok: false, status: 500, json: async () => ({ error: "not mocked" }) };
    });
  });

  afterEach(() => {
    useToastStore.getState().clear();
  });

  // ===========================================================================
  // Button States
  // ===========================================================================

  describe("Button States", () => {
    it("renders Run button", () => {
      render(<RunButton />);

      expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
    });

    it("is disabled when canvas has no blocks", () => {
      mockStore = createMockCanvasStore({
        nodes: createLaneNodes(), // Only lanes, no blocks
      });

      render(<RunButton />);

      const button = screen.getByRole("button", { name: /run/i });
      expect(button).toBeDisabled();
    });

    it("is enabled when canvas has blocks", () => {
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
      });

      render(<RunButton />);

      const button = screen.getByRole("button", { name: /run/i });
      expect(button).not.toBeDisabled();
    });

    it("is disabled while a run is in progress", () => {
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
      });
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("generating");

      render(<RunButton />);

      const button = screen.getByRole("button", { name: /run/i });
      expect(button).toBeDisabled();
    });

    it("shows loading indicator when run is in progress", () => {
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
      });
      useRunStore.getState().reset();
      useRunStore.getState().setStatus("generating");

      render(<RunButton />);

      expect(screen.getByTestId("run-button-loading")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Modal Opening/Closing
  // ===========================================================================

  describe("Modal Opening/Closing", () => {
    it("opens modal when clicked", async () => {
      const user = userEvent.setup();
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
      });

      render(<RunButton />);

      await user.click(screen.getByRole("button", { name: /run/i }));

      expect(screen.getByTestId("run-modal")).toBeInTheDocument();
    });

    it("closes modal when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
      });

      render(<RunButton />);

      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByTestId("run-modal")).not.toBeInTheDocument();
    });

    it("closes modal when clicking outside", async () => {
      const user = userEvent.setup();
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
      });

      render(<RunButton />);

      await user.click(screen.getByRole("button", { name: /run/i }));

      // Click the backdrop
      const backdrop = screen.getByTestId("run-modal-backdrop");
      await user.click(backdrop);

      expect(screen.queryByTestId("run-modal")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // API wiring + SSE progress
  // ===========================================================================

  describe("Execution Wiring", () => {
    function setupWithBlocks() {
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
        templateId: "tpl-001",
        templateName: "Test Template",
      });
    }

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
      };
    }

    it("POSTs CreateRun body with nested runConfig matching API schema", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetchWithLlmStatus(
        mockSSEResponse([
          { type: "phase", phase: "COMPILING" },
          { type: "done", runId: "run-1", sceneCount: 5, duration: 100 },
        ])
      );

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        expect(
          mockFetch.mock.calls.some(
            (c) => typeof c[0] === "string" && c[0] === "/api/runs"
          )
        ).toBe(true);
      });

      const runsCall = mockFetch.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0] === "/api/runs"
      ) as [string, RequestInit];
      expect(runsCall[0]).toBe("/api/runs");
      expect(runsCall[1].method).toBe("POST");
      const body = JSON.parse(runsCall[1].body as string);
      expect(body).toEqual({
        templateId: "tpl-001",
        runConfig: {
          batchSize: 5,
          loopMode: true,
          languages: { hi: 3, ja: 2 },
          historyStrictness: "warn",
          model: "deepseek-chat",
        },
      });
    });

    it("updates store runStatus from SSE phase events and shows progress UI", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetchWithLlmStatus(
        mockSSEResponse([
          { type: "phase", phase: "COMPILING" },
          { type: "phase", phase: "GENERATING" },
          { type: "scene", index: 0, preview: "Scene 0" },
          { type: "phase", phase: "LINTING" },
          { type: "done", runId: "run-42", sceneCount: 5, duration: 2500 },
        ])
      );

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        expect(screen.getByTestId("run-progress")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(useRunStore.getState().status).toBe("done");
        expect(useRunStore.getState().currentRunId).toBe("run-42");
      });
    });

    it("saves dirty template before POST /api/runs", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockStore.isDirty = true;
      mockStore.saveTemplate = vi.fn().mockResolvedValue(undefined);
      mockFetchWithLlmStatus(
        mockSSEResponse([
          { type: "phase", phase: "COMPILING" },
          { type: "done", runId: "run-save", sceneCount: 1, duration: 10 },
        ])
      );

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        expect(mockStore.saveTemplate).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(
          mockFetch.mock.calls.some(
            (c) => typeof c[0] === "string" && c[0] === "/api/runs"
          )
        ).toBe(true);
      });
    });

    it("closes the run modal and shows progress host above modal z-index after stream starts", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetchWithLlmStatus(
        mockSSEResponse([
          { type: "phase", phase: "COMPILING" },
          { type: "done", runId: "run-77", sceneCount: 1, duration: 50 },
        ])
      );

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      expect(screen.getByTestId("run-modal")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        expect(screen.queryByTestId("run-modal")).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId("run-progress-host")).toBeInTheDocument();
        expect(screen.getByTestId("run-progress")).toBeInTheDocument();
      });

      const host = screen.getByTestId("run-progress-host");
      // Must stack above modal (z-[100]) → expect z-[110] or higher
      expect(host.className).toMatch(/z-\[(1[1-9][0-9]|[2-9][0-9]{2,})\]/);
    });

    it("surfaces API error JSON without opening progress", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetchWithLlmStatus({
        ok: false,
        status: 409,
        body: null,
        json: async () => ({ error: "A batch is already running" }),
      });

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        expect(screen.getByText(/already running/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId("run-progress")).not.toBeInTheDocument();
    });

    it("pushes error toast in addition to modal error on API failure", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetchWithLlmStatus({
        ok: false,
        status: 409,
        body: null,
        json: async () => ({ error: "A batch is already running" }),
      });

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        const toasts = useToastStore.getState().toasts;
        expect(toasts.some((t) => /already running/i.test(t.message))).toBe(
          true
        );
        expect(toasts[0]?.type).toBe("error");
      });
    });

    it("navigates to /runs/[id] when SSE completes with done", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetchWithLlmStatus(
        mockSSEResponse([
          { type: "phase", phase: "COMPILING" },
          { type: "done", runId: "run-99", sceneCount: 5, duration: 100 },
        ])
      );

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith("/runs/run-99");
      });
    });
  });
});

// =============================================================================
// Test Suite: RunModal
// =============================================================================

describe("RunModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onRun: vi.fn(),
    templateId: "tpl-001",
    templateName: "Test Template",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (url: string | URL | Request) => {
      const href =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (href.includes("/api/llm/status")) {
        return mockLlmStatusResponse();
      }
      return { ok: false, status: 500, json: async () => ({}) };
    });
  });

  // ===========================================================================
  // Form Fields
  // ===========================================================================

  describe("Form Fields", () => {
    it("renders scene count selector with default value of 5", () => {
      render(<RunModal {...defaultProps} />);

      const sceneCountInput = screen.getByLabelText(/scene count/i);
      expect(sceneCountInput).toHaveValue(5);
    });

    it("renders model selector with default value", () => {
      render(<RunModal {...defaultProps} />);

      const modelSelect = screen.getByLabelText(/model/i);
      // Default before /api/llm/status resolves: DeepSeek chat
      expect(modelSelect).toHaveValue("deepseek-chat");
    });

    it("renders optional notes field", () => {
      render(<RunModal {...defaultProps} />);

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it("shows template name in header", () => {
      render(<RunModal {...defaultProps} />);

      expect(screen.getByText("Test Template")).toBeInTheDocument();
    });

    it("renders loop mode toggle defaulting to on", () => {
      render(<RunModal {...defaultProps} />);

      const loopToggle = screen.getByLabelText(/loop mode/i);
      expect(loopToggle).toBeChecked();
    });

    it("renders language weight inputs with defaults hi=3 ja=2", () => {
      render(<RunModal {...defaultProps} />);

      expect(screen.getByLabelText(/hindi/i)).toHaveValue(3);
      expect(screen.getByLabelText(/japanese/i)).toHaveValue(2);
    });

    it("renders history strictness defaulting to warn", () => {
      render(<RunModal {...defaultProps} />);

      const strictness = screen.getByLabelText(/history strictness/i);
      expect(strictness).toHaveValue("warn");
    });

    it("renders run date defaulting to today", () => {
      render(<RunModal {...defaultProps} />);

      const dateInput = screen.getByLabelText(/run date/i) as HTMLInputElement;
      const today = new Date().toISOString().slice(0, 10);
      expect(dateInput).toHaveValue(today);
    });
  });

  // ===========================================================================
  // Form Validation
  // ===========================================================================

  describe("Form Validation", () => {
    it("prevents scene count below 1", async () => {
      render(<RunModal {...defaultProps} />);

      const sceneCountInput = screen.getByLabelText(/scene count/i);
      fireEvent.change(sceneCountInput, { target: { value: "0" } });

      const form = sceneCountInput.closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/at least 1 scene/i)).toBeInTheDocument();
      });
      expect(defaultProps.onRun).not.toHaveBeenCalled();
    });

    it("prevents scene count above 10", async () => {
      render(<RunModal {...defaultProps} />);

      const sceneCountInput = screen.getByLabelText(/scene count/i);
      fireEvent.change(sceneCountInput, { target: { value: "15" } });

      const form = sceneCountInput.closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/maximum 10 scenes/i)).toBeInTheDocument();
      });
      expect(defaultProps.onRun).not.toHaveBeenCalled();
    });

    it("accepts valid scene count", async () => {
      const user = userEvent.setup();
      render(<RunModal {...defaultProps} />);

      const sceneCountInput = screen.getByLabelText(/scene count/i);
      await user.clear(sceneCountInput);
      await user.type(sceneCountInput, "5");

      const generateButton = screen.getByRole("button", { name: /generate/i });
      await user.click(generateButton);

      expect(defaultProps.onRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sceneCount: 5,
        })
      );
    });

    it("auto-fits language weights when scene count changes", async () => {
      render(<RunModal {...defaultProps} />);

      const sceneCountInput = screen.getByLabelText(/scene count/i);
      fireEvent.change(sceneCountInput, { target: { value: "1" } });

      expect(screen.getByLabelText(/hindi/i)).toHaveValue(1);
      expect(screen.getByLabelText(/japanese/i)).toHaveValue(0);

      fireEvent.submit(sceneCountInput.closest("form")!);

      expect(defaultProps.onRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sceneCount: 1,
          languages: { hi: 1, ja: 0 },
        })
      );
    });

    it("auto-fits languages on submit when weights sum incorrectly", async () => {
      render(<RunModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/hindi/i), {
        target: { value: "9" },
      });
      fireEvent.change(screen.getByLabelText(/japanese/i), {
        target: { value: "9" },
      });

      fireEvent.submit(screen.getByLabelText(/scene count/i).closest("form")!);

      // Must not show the old "cannot exceed" block — auto-fit instead
      expect(
        screen.queryByText(/language weights cannot exceed scene count/i)
      ).not.toBeInTheDocument();
      expect(defaultProps.onRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sceneCount: 5,
          languages: { hi: 3, ja: 2 },
        })
      );
    });
  });

  // ===========================================================================
  // Execution Flow
  // ===========================================================================

  describe("Execution Flow", () => {
    it("calls onRun with config when Generate is clicked", async () => {
      const user = userEvent.setup();
      render(<RunModal {...defaultProps} />);

      const generateButton = screen.getByRole("button", { name: /generate/i });
      await user.click(generateButton);

      const today = new Date().toISOString().slice(0, 10);
      expect(defaultProps.onRun).toHaveBeenCalledWith({
        sceneCount: 5,
        model: "deepseek-chat",
        notes: "",
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        historyStrictness: "warn",
        runDate: today,
      });
    });

    it("includes notes in config when provided", async () => {
      const user = userEvent.setup();
      render(<RunModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, "Test run notes");

      const generateButton = screen.getByRole("button", { name: /generate/i });
      await user.click(generateButton);

      expect(defaultProps.onRun).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: "Test run notes",
        })
      );
    });

    it("includes loop mode, languages, and history strictness when changed", async () => {
      const user = userEvent.setup();
      render(<RunModal {...defaultProps} />);

      await user.click(screen.getByLabelText(/loop mode/i));
      const hiInput = screen.getByLabelText(/hindi/i);
      await user.clear(hiInput);
      await user.type(hiInput, "4");
      const jaInput = screen.getByLabelText(/japanese/i);
      await user.clear(jaInput);
      await user.type(jaInput, "1");
      await user.selectOptions(screen.getByLabelText(/history strictness/i), "hard-fail");

      await user.click(screen.getByRole("button", { name: /generate/i }));

      expect(defaultProps.onRun).toHaveBeenCalledWith(
        expect.objectContaining({
          loopMode: false,
          languages: { hi: 4, ja: 1 },
          historyStrictness: "hard-fail",
        })
      );
    });

    it("disables Generate button while loading", () => {
      render(<RunModal {...defaultProps} isLoading={true} />);

      const generateButton = screen.getByRole("button", { name: /generate/i });
      expect(generateButton).toBeDisabled();
    });

    it("shows loading state in Generate button", () => {
      render(<RunModal {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it("calls onClose when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<RunModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Layout contract (sticky actions — Generate always reachable)
  // ===========================================================================

  describe("Layout contract", () => {
    it("keeps Generate in a sticky action footer outside the scroll body", () => {
      render(<RunModal {...defaultProps} />);

      const modal = screen.getByTestId("run-modal");
      const body = screen.getByTestId("run-modal-body");
      const actions = screen.getByTestId("run-modal-actions");
      const generate = screen.getByRole("button", { name: /generate/i });

      expect(modal.contains(body)).toBe(true);
      expect(modal.contains(actions)).toBe(true);
      // Actions must not live inside the scrollable body (below-the-fold trap)
      expect(body.contains(actions)).toBe(false);
      expect(actions.contains(generate)).toBe(true);
    });

    it("uses flex column panel with constrained height", () => {
      render(<RunModal {...defaultProps} />);
      const modal = screen.getByTestId("run-modal");
      expect(modal.className).toMatch(/flex/);
      expect(modal.className).toMatch(/flex-col/);
      expect(modal.className).toMatch(/max-h-/);
    });

    it("pins action footer with shrink-0 so it stays visible", () => {
      render(<RunModal {...defaultProps} />);
      const actions = screen.getByTestId("run-modal-actions");
      expect(actions.className).toMatch(/shrink-0/);
    });

    it("raises modal stacking and leaves top bar free (top-14 + high z)", () => {
      render(<RunModal {...defaultProps} />);
      const backdrop = screen.getByTestId("run-modal-backdrop");
      // Below topbar (z-200): z-[150], and offset so header stays clickable
      expect(backdrop.className).toMatch(/z-\[(1[0-9]{2}|[2-9][0-9]{2,})\]/);
      expect(backdrop.className).toMatch(/top-14/);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("Error Handling", () => {
    it("displays error message when provided", () => {
      render(<RunModal {...defaultProps} error="Failed to start run" />);

      expect(screen.getByText(/failed to start run/i)).toBeInTheDocument();
    });

    it("clears error when user changes input", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<RunModal {...defaultProps} error="Failed to start run" />);

      const sceneCountInput = screen.getByLabelText(/scene count/i);
      await user.clear(sceneCountInput);
      await user.type(sceneCountInput, "3");

      // Rerender without error (parent would clear it)
      rerender(<RunModal {...defaultProps} error={undefined} />);

      expect(screen.queryByText(/failed to start run/i)).not.toBeInTheDocument();
    });
  });
});
