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

      expect(defaultProps.onRun).toHaveBeenCalledWith({
        sceneCount: 5,
        model: "claude-sonnet-4-20250514",
        notes: "",
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
