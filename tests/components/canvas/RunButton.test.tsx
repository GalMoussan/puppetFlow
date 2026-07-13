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

import { describe, it, expect, vi, beforeEach } from "vitest";
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

// =============================================================================
// Test Suite: RunButton
// =============================================================================

describe("RunButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockReset();
    mockStore = createMockCanvasStore({
      nodes: createLaneNodes(),
      templateId: "tpl-001",
      templateName: "Test Template",
    });
    mockFetch.mockReset();
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
        runStatus: "generating",
      });

      render(<RunButton />);

      const button = screen.getByRole("button", { name: /run/i });
      expect(button).toBeDisabled();
    });

    it("shows loading indicator when run is in progress", () => {
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);
      mockStore = createMockCanvasStore({
        nodes: [...createLaneNodes(), blockNode],
        runStatus: "generating",
      });

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
      mockFetch.mockResolvedValue(
        mockSSEResponse([
          { type: "phase", phase: "COMPILING" },
          { type: "done", runId: "run-1", sceneCount: 5, duration: 100 },
        ])
      );

      render(<RunButton />);
      await user.click(screen.getByRole("button", { name: /run/i }));
      await user.click(screen.getByRole("button", { name: /generate/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(mockFetch.mock.calls[0][0]).toBe("/api/runs");
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        templateId: "tpl-001",
        runConfig: {
          batchSize: 5,
          loopMode: true,
          languages: { hi: 3, ja: 2 },
          historyStrictness: "warn",
        },
      });
    });

    it("updates store runStatus from SSE phase events and shows progress UI", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetch.mockResolvedValue(
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
        expect(mockStore.setRunStatus).toHaveBeenCalledWith("compiling");
        expect(mockStore.setRunStatus).toHaveBeenCalledWith("generating");
        expect(mockStore.setRunStatus).toHaveBeenCalledWith("linting");
        expect(mockStore.setRunStatus).toHaveBeenCalledWith("done");
        expect(mockStore.setCurrentRunId).toHaveBeenCalledWith("run-42");
      });
    });

    it("surfaces API error JSON without opening progress", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetch.mockResolvedValue({
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

    it("navigates to /runs/[id] when SSE completes with done", async () => {
      const user = userEvent.setup();
      setupWithBlocks();
      mockFetch.mockResolvedValue(
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
      expect(modelSelect).toHaveValue("claude-sonnet-4-20250514");
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
        model: "claude-sonnet-4-20250514",
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
