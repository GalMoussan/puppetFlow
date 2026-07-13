/**
 * Tests for Inspector Component
 *
 * Per Phase 3 test specification section 4:
 * - Block selected state (I01-I07)
 * - Lane selected state (I08-I11)
 * - Empty state (I12-I14)
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// This import will fail until implementation exists - expected for TDD
import { Inspector } from "@/components/canvas/Inspector";

import {
  createMockCanvasStore,
  createBlockNode,
  createLaneNode,
  mockCameraBlock,
  mockHookBlock,
  type MockCanvasStore,
  type BlockNodeData,
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
  // Export selectBlocksInLane as the real implementation would
  selectBlocksInLane: (lane: string) => (state: MockCanvasStore) =>
    state.nodes
      .filter((n) => n.type === "block" && n.parentId === lane)
      .sort((a, b) => {
        const aData = a.data as BlockNodeData;
        const bData = b.data as BlockNodeData;
        return aData.order - bData.order;
      }),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe("Inspector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createMockCanvasStore();
  });

  // ===========================================================================
  // Section 4.1: Block Selected State
  // ===========================================================================

  describe("Block Selected State", () => {
    const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0, { selected: true });

    beforeEach(() => {
      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [blockNode],
      });
    });

    // I01: Shows block name in header
    it("displays selected block name in header", () => {
      render(<Inspector />);

      expect(screen.getByText(mockCameraBlock.name)).toBeInTheDocument();
    });

    // I02: Fragment is editable
    it("renders fragment as editable textarea", () => {
      render(<Inspector />);

      const textarea = screen.getByTestId("inspector-fragment");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue(mockCameraBlock.promptFragment);
    });

    // I03: Editing fragment and saving marks template dirty
    it("marks template as dirty when fragment is edited and saved", async () => {
      const user = userEvent.setup();
      render(<Inspector />);

      const textarea = screen.getByTestId("inspector-fragment");
      await user.clear(textarea);
      await user.type(textarea, "New fragment text");

      // Component requires explicit save to call updateBlockOverride
      const saveButton = screen.getByTestId("inspector-save");
      await user.click(saveButton);

      expect(mockStore.updateBlockOverride).toHaveBeenCalledWith(
        "node-1",
        "New fragment text"
      );
    });

    // I04: Shows stageScope badges
    it("displays stageScope as lane badges", () => {
      render(<Inspector />);

      mockCameraBlock.stageScope.forEach((lane) => {
        expect(screen.getByText(lane)).toBeInTheDocument();
      });
    });

    // I05: Shows rotation group (derived from type for non-CUSTOM blocks)
    it("displays rotation group when present", () => {
      render(<Inspector />);

      expect(screen.getByText(/rotation group/i)).toBeInTheDocument();
      // Component derives rotation group from type: CAMERA_MOVE -> "camera move"
      expect(screen.getByText("camera move")).toBeInTheDocument();
    });

    // I06: Save override button
    it("has save override button that commits changes", async () => {
      const user = userEvent.setup();
      render(<Inspector />);

      const textarea = screen.getByTestId("inspector-fragment");
      await user.clear(textarea);
      await user.type(textarea, "Custom override text");

      const saveButton = screen.getByTestId("inspector-save");
      await user.click(saveButton);

      expect(mockStore.updateBlockOverride).toHaveBeenCalledWith(
        "node-1",
        "Custom override text"
      );
    });

    // I07: Delete block button
    it("has delete button that removes block", async () => {
      const user = userEvent.setup();
      render(<Inspector />);

      const deleteButton = screen.getByTestId("inspector-delete");
      await user.click(deleteButton);

      expect(mockStore.removeBlock).toHaveBeenCalledWith("node-1");
    });
  });

  // ===========================================================================
  // Section 4.2: Lane Selected State
  // ===========================================================================

  describe("Lane Selected State", () => {
    const blockA = createBlockNode("node-a", mockCameraBlock, "VIDEO_START", 0);
    const blockB = createBlockNode("node-b", mockHookBlock, "VIDEO_START", 1);
    const laneNode = createLaneNode("VIDEO_START");

    beforeEach(() => {
      mockStore = createMockCanvasStore({
        selectedId: "VIDEO_START",
        nodes: [laneNode, blockA, blockB],
      });
    });

    // I08: Shows lane name in header
    it("displays selected lane name in header", () => {
      render(<Inspector />);

      expect(screen.getByText("VIDEO_START")).toBeInTheDocument();
    });

    // I09: Shows block assembly order list
    it("displays ordered list of blocks in lane", () => {
      render(<Inspector />);

      const orderList = screen.getByTestId("inspector-lane-order");
      const listItems = within(orderList).getAllByRole("listitem");

      expect(listItems).toHaveLength(2);
      expect(listItems[0]).toHaveTextContent(mockCameraBlock.name);
      expect(listItems[1]).toHaveTextContent(mockHookBlock.name);
    });

    // I10: Blocks in order list are draggable for reordering
    it("makes order list items draggable", () => {
      render(<Inspector />);

      const orderList = screen.getByTestId("inspector-lane-order");
      const listItems = within(orderList).getAllByRole("listitem");

      listItems.forEach((item) => {
        expect(item).toHaveAttribute("draggable", "true");
      });
    });

    // I11: Reordering calls store method
    it("calls reorder method when blocks are reordered", () => {
      render(<Inspector />);

      const orderList = screen.getByTestId("inspector-lane-order");
      const listItems = within(orderList).getAllByRole("listitem");

      // Simulate drag and drop reorder with mock DataTransfer
      const dataTransfer = {
        effectAllowed: "",
        dropEffect: "",
        setData: vi.fn(),
        getData: vi.fn(),
      };
      fireEvent.dragStart(listItems[1], { dataTransfer });
      fireEvent.drop(listItems[0], { dataTransfer });

      // Should call a reorder method with new order
      expect(mockStore.setNodes).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Section 4.3: Empty State (Nothing Selected)
  // ===========================================================================

  describe("Empty State", () => {
    beforeEach(() => {
      mockStore = createMockCanvasStore({
        selectedId: null,
        templateId: "tpl-001",
        templateName: "Festival Template v1",
      });
    });

    // I12: Shows template info when nothing selected
    it("displays template information when nothing selected", () => {
      render(<Inspector />);

      // Look for the Template heading specifically (not all template mentions)
      expect(screen.getByRole("heading", { name: /template/i })).toBeInTheDocument();
      expect(screen.getByText("Festival Template v1")).toBeInTheDocument();
    });

    // I13: Shows keyboard shortcuts
    it("displays keyboard shortcuts help", () => {
      render(<Inspector />);

      expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    // I14: Shows select prompt
    it("prompts user to select a block or lane", () => {
      render(<Inspector />);

      expect(screen.getByText(/select a block or lane/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Override Display Tests
  // ===========================================================================

  describe("Override Display", () => {
    it("shows override badge when block has override", () => {
      const blockWithOverride = createBlockNode(
        "node-1",
        mockCameraBlock,
        "VIDEO_START",
        0,
        { override: "Custom override text" }
      );

      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [blockWithOverride],
      });

      render(<Inspector />);

      // Look for the Override badge (a span element), not the Clear Override button
      const badges = screen.getAllByText(/override/i);
      const overrideBadge = badges.find(el => el.tagName === "SPAN" && el.className.includes("amber"));
      expect(overrideBadge).toBeInTheDocument();
    });

    it("shows original fragment with strikethrough when override exists", () => {
      const blockWithOverride = createBlockNode(
        "node-1",
        mockCameraBlock,
        "VIDEO_START",
        0,
        { override: "Custom override text" }
      );

      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [blockWithOverride],
      });

      render(<Inspector />);

      const originalText = screen.getByText(mockCameraBlock.promptFragment);
      expect(originalText).toHaveClass("line-through");
    });

    it("allows clearing override to restore original", async () => {
      const user = userEvent.setup();
      const blockWithOverride = createBlockNode(
        "node-1",
        mockCameraBlock,
        "VIDEO_START",
        0,
        { override: "Custom override text" }
      );

      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [blockWithOverride],
      });

      render(<Inspector />);

      const clearButton = screen.getByRole("button", { name: /clear override/i });
      await user.click(clearButton);

      expect(mockStore.updateBlockOverride).toHaveBeenCalledWith("node-1", undefined);
    });
  });

  // ===========================================================================
  // Pin Toggle Tests
  // ===========================================================================

  describe("Pin Toggle in Inspector", () => {
    it("shows pin status for selected block", () => {
      const pinnedBlock = createBlockNode(
        "node-1",
        mockCameraBlock,
        "VIDEO_START",
        0,
        { pinned: true }
      );

      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [pinnedBlock],
      });

      render(<Inspector />);

      expect(screen.getByText(/pinned/i)).toBeInTheDocument();
    });

    it("allows toggling pin from inspector", async () => {
      const user = userEvent.setup();
      const blockNode = createBlockNode("node-1", mockCameraBlock, "VIDEO_START", 0);

      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [blockNode],
      });

      render(<Inspector />);

      const pinToggle = screen.getByRole("checkbox", { name: /pin/i });
      await user.click(pinToggle);

      expect(mockStore.togglePin).toHaveBeenCalledWith("node-1");
    });
  });

  // ===========================================================================
  // Validity Display Tests
  // ===========================================================================

  describe("Validity Display", () => {
    it("shows valid status for correctly placed block", () => {
      const validBlock = createBlockNode(
        "node-1",
        mockCameraBlock,
        "VIDEO_START",
        0,
        { valid: true }
      );

      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [validBlock],
      });

      render(<Inspector />);

      expect(screen.getByText(/valid placement/i)).toBeInTheDocument();
    });

    it("shows invalid status with reason for misplaced block", () => {
      const invalidBlock = createBlockNode(
        "node-1",
        mockCameraBlock,
        "GLOBAL", // Camera blocks not valid in GLOBAL
        0,
        { valid: false }
      );

      mockStore = createMockCanvasStore({
        selectedId: "node-1",
        nodes: [invalidBlock],
      });

      render(<Inspector />);

      expect(screen.getByText(/invalid placement/i)).toBeInTheDocument();
      expect(screen.getByText(/not valid in GLOBAL/i)).toBeInTheDocument();
    });
  });
});
