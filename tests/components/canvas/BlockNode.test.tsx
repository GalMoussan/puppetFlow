/**
 * Tests for BlockNode Component
 *
 * Per Phase 3 test specification section 2:
 * - Block rendering (B01-B05)
 * - Pin toggle (B06-B09)
 * - Validity indicator (B10-B12)
 * - Block interactions (B13-B15)
 *
 * Coverage target: >= 85% line coverage for components/canvas/BlockNode.tsx
 *
 * Uses real Zustand store with state reset (Phase 4 testing pattern)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

import { BlockNode } from "@/components/canvas/BlockNode";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { getTypeColor, type BlockNodeData } from "@/lib/types/canvas";
import {
  mockCameraBlock,
  mockLongNameBlock,
} from "@/tests/mocks/canvas-fixtures";

// =============================================================================
// Test Setup - Real Store Pattern
// =============================================================================

// Store the initial state for reset
const initialState = useCanvasStore.getState();

// Helper to create BlockNode props
function createBlockNodeProps(
  id: string,
  data: Partial<BlockNodeData>,
  options?: { selected?: boolean }
) {
  const fullData: BlockNodeData = {
    blockDefId: data.blockDefId ?? "block-1",
    name: data.name ?? "Test Block",
    type: data.type ?? "CAMERA_MOVE",
    fragment: data.fragment ?? "Test fragment text",
    stageScope: data.stageScope ?? ["VIDEO_START"],
    pinned: data.pinned ?? false,
    valid: data.valid ?? true,
    override: data.override,
    order: data.order ?? 0,
  };

  return {
    id,
    data: fullData,
    selected: options?.selected ?? false,
    type: "block" as const,
    xPos: 0,
    yPos: 0,
    dragging: false,
    isConnectable: true,
    zIndex: 1,
    draggable: true,
    selectable: true,
    deletable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };
}

// =============================================================================
// Test Suite: Block Rendering
// =============================================================================

describe("BlockNode", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useCanvasStore.setState({
        ...initialState,
        nodes: [],
        edges: [],
        selectedId: null,
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Section 2.1: Block Rendering
  // ===========================================================================

  describe("Block Rendering", () => {
    // B01: Block renders with type-colored header
    it("renders header with type-specific background color", () => {
      const props = createBlockNodeProps("node-1", {
        blockDefId: mockCameraBlock.id,
        name: mockCameraBlock.name,
        type: "CAMERA_MOVE",
        fragment: mockCameraBlock.promptFragment,
      });

      render(<BlockNode {...props} />);

      const header = screen.getByTestId(`block-header-${props.id}`);
      expect(header).toBeInTheDocument();

      // Header should have the type color class
      const expectedColor = getTypeColor("CAMERA_MOVE");
      expect(header).toHaveClass(expectedColor);
    });

    // B02: Block name displays truncated
    it("truncates long block names with ellipsis", () => {
      const props = createBlockNodeProps("node-long", {
        name: mockLongNameBlock.name, // "Very Long Camera Move Name That Exceeds Container Width"
        type: "CAMERA_MOVE",
      });

      render(<BlockNode {...props} />);

      const nameElement = screen.getByText(mockLongNameBlock.name);
      expect(nameElement).toBeInTheDocument();

      // Should have truncate class for CSS text-overflow: ellipsis
      expect(nameElement).toHaveClass("truncate");
    });

    // B03: Fragment preview shows first 2 lines
    it("displays fragment preview with line-clamp-2 class", () => {
      const multiLineFragment = "Line 1\\nLine 2\\nLine 3\\nLine 4\\nLine 5";
      const props = createBlockNodeProps("node-1", {
        fragment: multiLineFragment,
      });

      render(<BlockNode {...props} />);

      // Find the fragment preview container
      const fragmentPreview = screen.getByText(/Line 1/);
      expect(fragmentPreview).toBeInTheDocument();

      // Should have line-clamp-2 class to limit to 2 lines
      expect(fragmentPreview).toHaveClass("line-clamp-2");
    });

    // B04: Override text shown instead of fragment
    it("displays override text instead of original fragment when override is set", () => {
      const originalFragment = "Original prompt fragment text";
      const overrideText = "Custom override text for this template";

      const props = createBlockNodeProps("node-1", {
        fragment: originalFragment,
        override: overrideText,
      });

      render(<BlockNode {...props} />);

      // Override should be visible
      expect(screen.getByText(overrideText)).toBeInTheDocument();

      // Original fragment should NOT be visible
      expect(screen.queryByText(originalFragment)).not.toBeInTheDocument();
    });

    // B05: Block renders with monospace font for fragment
    it("renders fragment preview with monospace font", () => {
      const props = createBlockNodeProps("node-1", {
        fragment: "Camera dollies forward",
      });

      render(<BlockNode {...props} />);

      const fragmentElement = screen.getByText(/Camera dollies/);
      expect(fragmentElement).toHaveClass("font-mono");
    });
  });

  // ===========================================================================
  // Section 2.2: Pin Toggle
  // ===========================================================================

  describe("Pin Toggle", () => {
    // B06: Unpinned block shows empty pin icon
    it("shows unfilled pin icon when pinned is false", () => {
      const props = createBlockNodeProps("node-1", {
        pinned: false,
      });

      render(<BlockNode {...props} />);

      const pinButton = screen.getByTestId(`block-pin-${props.id}`);
      expect(pinButton).toBeInTheDocument();

      // Icon should indicate unfilled/unpinned state
      expect(pinButton).toHaveAttribute("aria-pressed", "false");
    });

    // B07: Pinned block shows filled pin icon
    it("shows filled pin icon when pinned is true", () => {
      const props = createBlockNodeProps("node-1", {
        pinned: true,
      });

      render(<BlockNode {...props} />);

      const pinButton = screen.getByTestId(`block-pin-${props.id}`);
      expect(pinButton).toHaveAttribute("aria-pressed", "true");
    });

    // B08: Click pin toggles pinned state
    it("calls togglePin when pin button is clicked on unpinned block", () => {
      const togglePinSpy = vi.fn();
      act(() => {
        useCanvasStore.setState({ togglePin: togglePinSpy });
      });

      const props = createBlockNodeProps("node-1", {
        pinned: false,
      });

      render(<BlockNode {...props} />);

      const pinButton = screen.getByTestId(`block-pin-${props.id}`);
      fireEvent.click(pinButton);

      expect(togglePinSpy).toHaveBeenCalledWith("node-1");
      expect(togglePinSpy).toHaveBeenCalledTimes(1);
    });

    // B09: Click pin on pinned block unpins
    it("calls togglePin when pin button is clicked on pinned block", () => {
      const togglePinSpy = vi.fn();
      act(() => {
        useCanvasStore.setState({ togglePin: togglePinSpy });
      });

      const props = createBlockNodeProps("node-1", {
        pinned: true,
      });

      render(<BlockNode {...props} />);

      const pinButton = screen.getByTestId(`block-pin-${props.id}`);
      fireEvent.click(pinButton);

      expect(togglePinSpy).toHaveBeenCalledWith("node-1");
    });
  });

  // ===========================================================================
  // Section 2.3: Validity Indicator
  // ===========================================================================

  describe("Validity Indicator", () => {
    // B10: Valid placement shows green dot
    it("shows green validity dot when valid is true", () => {
      const props = createBlockNodeProps("node-1", {
        valid: true,
      });

      render(<BlockNode {...props} />);

      const validityDot = screen.getByTestId(`validity-dot-${props.id}`);
      expect(validityDot).toBeInTheDocument();
      expect(validityDot).toHaveClass("bg-green-500");
    });

    // B11: Invalid placement shows red dot
    it("shows red validity dot when valid is false", () => {
      const props = createBlockNodeProps("node-1", {
        valid: false,
      });

      render(<BlockNode {...props} />);

      const validityDot = screen.getByTestId(`validity-dot-${props.id}`);
      expect(validityDot).toHaveClass("bg-red-500");
    });

    // B12: Validity updates on lane change
    it("reflects valid property changes correctly", () => {
      // First render: valid
      const validProps = createBlockNodeProps("node-1", { valid: true });
      const { rerender } = render(<BlockNode {...validProps} />);

      let validityDot = screen.getByTestId("validity-dot-node-1");
      expect(validityDot).toHaveClass("bg-green-500");

      // Re-render with invalid
      const invalidProps = createBlockNodeProps("node-1", { valid: false });
      rerender(<BlockNode {...invalidProps} />);

      validityDot = screen.getByTestId("validity-dot-node-1");
      expect(validityDot).toHaveClass("bg-red-500");
      expect(validityDot).not.toHaveClass("bg-green-500");
    });
  });

  // ===========================================================================
  // Section 2.4: Block Interactions
  // ===========================================================================

  describe("Block Interactions", () => {
    // B13: Click block selects it
    it("calls selectNode when block is clicked", () => {
      const selectNodeSpy = vi.fn();
      act(() => {
        useCanvasStore.setState({ selectNode: selectNodeSpy });
      });

      const props = createBlockNodeProps("node-1", {}, { selected: false });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);
      fireEvent.click(block);

      expect(selectNodeSpy).toHaveBeenCalledWith("node-1");
    });

    // B13 (continued): Selected block shows selection ring
    it("shows selection ring when block is selected", () => {
      const props = createBlockNodeProps("node-1", {}, { selected: true });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);
      expect(block).toHaveClass("ring-2");
      expect(block).toHaveClass("ring-violet-500");
    });

    // B14: Delete key removes block
    it("calls removeBlock when Delete key is pressed on selected block", () => {
      const removeBlockSpy = vi.fn();
      act(() => {
        useCanvasStore.setState({
          selectedId: "node-1",
          removeBlock: removeBlockSpy,
        });
      });

      const props = createBlockNodeProps("node-1", {}, { selected: true });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);

      // Focus the block and press Delete
      block.focus();
      fireEvent.keyDown(block, { key: "Delete" });

      expect(removeBlockSpy).toHaveBeenCalledWith("node-1");
    });

    // B14 (alternative): Backspace also removes block
    it("calls removeBlock when Backspace key is pressed on selected block", () => {
      const removeBlockSpy = vi.fn();
      act(() => {
        useCanvasStore.setState({
          selectedId: "node-1",
          removeBlock: removeBlockSpy,
        });
      });

      const props = createBlockNodeProps("node-1", {}, { selected: true });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);
      block.focus();
      fireEvent.keyDown(block, { key: "Backspace" });

      expect(removeBlockSpy).toHaveBeenCalledWith("node-1");
    });

    // B15: Drag block reorders within lane
    it("supports drag behavior for reordering", () => {
      const props = createBlockNodeProps("node-1", {
        order: 0,
      });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);

      // Verify block is draggable
      expect(block).toHaveAttribute("draggable", "true");
    });
  });

  // ===========================================================================
  // Visual State Tests
  // ===========================================================================

  describe("Visual States", () => {
    it("renders without border error state when valid", () => {
      const props = createBlockNodeProps("node-1", { valid: true });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);
      expect(block).not.toHaveClass("border-red-500");
    });

    it("renders with border error state when invalid", () => {
      const props = createBlockNodeProps("node-1", { valid: false });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);
      expect(block).toHaveClass("border-red-500");
    });

    it("renders different header colors for different block types", () => {
      const types: Array<{ type: "HOOK" | "CAMERA_MOVE" | "PAYOFF" }> = [
        { type: "HOOK" },
        { type: "CAMERA_MOVE" },
        { type: "PAYOFF" },
      ];

      types.forEach(({ type }) => {
        const props = createBlockNodeProps(`node-${type}`, { type });

        const { unmount } = render(<BlockNode {...props} />);

        const header = screen.getByTestId(`block-header-node-${type}`);
        const expectedColor = getTypeColor(type);
        expect(header).toHaveClass(expectedColor);

        unmount();
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe("Accessibility", () => {
    it("has accessible name from block name", () => {
      const props = createBlockNodeProps("node-1", {
        name: "Whip Pan Camera Move",
      });

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);
      expect(block).toHaveAccessibleName(/Whip Pan Camera Move/);
    });

    it("pin button has accessible label", () => {
      const props = createBlockNodeProps("node-1", { pinned: false });

      render(<BlockNode {...props} />);

      const pinButton = screen.getByTestId(`block-pin-${props.id}`);
      expect(pinButton).toHaveAccessibleName(/pin/i);
    });

    it("validity dot has accessible description", () => {
      const props = createBlockNodeProps("node-1", { valid: true });

      render(<BlockNode {...props} />);

      const validityDot = screen.getByTestId(`validity-dot-${props.id}`);
      expect(validityDot).toHaveAttribute("aria-label");
    });

    it("is keyboard navigable", () => {
      const props = createBlockNodeProps("node-1", {});

      render(<BlockNode {...props} />);

      const block = screen.getByTestId(`block-${props.id}`);
      expect(block).toHaveAttribute("tabIndex", "0");
    });
  });
});
