/**
 * Tests for BlockPalette Component
 *
 * Per Phase 3 test specification section 3:
 * - Block grouping by type (P01-P04)
 * - Search/filter functionality (P05-P08)
 * - Drag-to-canvas (P09-P11)
 * - Already-on-canvas indicator (P12-P14)
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// This import will fail until implementation exists - expected for TDD
import { BlockPalette } from "@/components/canvas/BlockPalette";

import {
  createMockCanvasStore,
  mockBlocks,
  mockCameraBlock,
  mockHookBlock,
  mockGlobalBlock,
  BLOCK_GROUPS,
  getBlockGroup,
  type MockCanvasStore,
  type BlockDefinition,
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
  // Export selectBlockCount as the real implementation would
  selectBlockCount: (blockDefId: string) => (state: MockCanvasStore) =>
    state.nodes.filter(
      (n) => n.type === "block" && (n.data as BlockNodeData).blockDefId === blockDefId
    ).length,
}));

// Mock useBlockLibrary hook
const mockBlockLibrary = {
  blocks: mockBlocks,
  loading: false,
  error: null,
  refetch: vi.fn(),
};

// Re-export the real utility functions alongside the mocked hook
vi.mock("@/lib/hooks/useBlockLibrary", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useBlockLibrary: vi.fn(() => mockBlockLibrary),
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe("BlockPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createMockCanvasStore();
    mockBlockLibrary.blocks = mockBlocks;
    mockBlockLibrary.loading = false;
  });

  // ===========================================================================
  // Section 3.1: Block Grouping by Type
  // ===========================================================================

  describe("Block Grouping by Type", () => {
    // P01: Blocks grouped by type
    it("renders blocks grouped by type category", () => {
      render(<BlockPalette themePackId="pack-1" />);

      // Only groups with blocks are rendered (mockBlocks has no Configuration type blocks)
      const groupsWithBlocks = ["Theme & Style", "Scene Elements", "Actions", "Narrative"];
      groupsWithBlocks.forEach((groupName) => {
        expect(screen.getByTestId(`palette-group-${groupName}`)).toBeInTheDocument();
      });
    });

    // P02: Group headers collapsible
    it("allows group headers to be collapsed and expanded", async () => {
      const user = userEvent.setup();
      render(<BlockPalette themePackId="pack-1" />);

      const actionsGroup = screen.getByTestId("palette-group-Actions");
      const groupHeader = within(actionsGroup).getByRole("button");

      // Click to collapse
      await user.click(groupHeader);

      // Blocks should be hidden
      const blocksInGroup = within(actionsGroup).queryAllByTestId(/^palette-block-/);
      expect(blocksInGroup).toHaveLength(0);

      // Click to expand
      await user.click(groupHeader);

      // Blocks should be visible again
      const expandedBlocks = within(actionsGroup).queryAllByTestId(/^palette-block-/);
      expect(expandedBlocks.length).toBeGreaterThan(0);
    });

    // P03: Camera moves under Actions group
    it("places CAMERA_MOVE blocks under Actions group", () => {
      render(<BlockPalette themePackId="pack-1" />);

      const actionsGroup = screen.getByTestId("palette-group-Actions");
      const cameraBlock = within(actionsGroup).getByTestId(`palette-block-${mockCameraBlock.id}`);

      expect(cameraBlock).toBeInTheDocument();
    });

    // P04: Empty group not displayed
    it("does not display groups with no blocks", () => {
      // Filter to only have Actions blocks
      mockBlockLibrary.blocks = mockBlocks.filter(
        (b) => getBlockGroup(b.type) === "Actions"
      );

      render(<BlockPalette themePackId="pack-1" />);

      // Narrative group should not exist (no blocks)
      expect(screen.queryByTestId("palette-group-Theme & Style")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Section 3.2: Search/Filter Functionality
  // ===========================================================================

  describe("Search/Filter Functionality", () => {
    // P05: Search input filters blocks
    it("filters blocks based on search input", async () => {
      const user = userEvent.setup();
      render(<BlockPalette themePackId="pack-1" />);

      const searchInput = screen.getByTestId("palette-search");

      // Type search query
      await user.type(searchInput, "whip");

      // Should only show matching block
      expect(screen.getByTestId(`palette-block-${mockCameraBlock.id}`)).toBeInTheDocument();

      // Non-matching blocks should be hidden
      expect(screen.queryByTestId(`palette-block-${mockHookBlock.id}`)).not.toBeInTheDocument();
    });

    // P06: Case-insensitive search
    it("performs case-insensitive search", async () => {
      const user = userEvent.setup();
      render(<BlockPalette themePackId="pack-1" />);

      const searchInput = screen.getByTestId("palette-search");

      await user.type(searchInput, "WHIP");

      // Should still match "Whip Pan"
      expect(screen.getByTestId(`palette-block-${mockCameraBlock.id}`)).toBeInTheDocument();
    });

    // P07: Empty search shows all blocks
    it("shows all blocks when search is cleared", async () => {
      const user = userEvent.setup();
      render(<BlockPalette themePackId="pack-1" />);

      const searchInput = screen.getByTestId("palette-search");

      // Type then clear
      await user.type(searchInput, "whip");
      await user.clear(searchInput);

      // All blocks should be visible
      mockBlocks.forEach((block) => {
        if (!block.archived) {
          expect(screen.getByTestId(`palette-block-${block.id}`)).toBeInTheDocument();
        }
      });
    });

    // P08: No results state
    it("shows no results message when search matches nothing", async () => {
      const user = userEvent.setup();
      render(<BlockPalette themePackId="pack-1" />);

      const searchInput = screen.getByTestId("palette-search");

      await user.type(searchInput, "xyznomatch123");

      expect(screen.getByText(/no blocks found/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Section 3.3: Drag-to-Canvas
  // ===========================================================================

  describe("Drag-to-Canvas", () => {
    // P09: Block is draggable
    it("makes palette blocks draggable", () => {
      render(<BlockPalette themePackId="pack-1" />);

      const paletteBlock = screen.getByTestId(`palette-block-${mockCameraBlock.id}`);

      expect(paletteBlock).toHaveAttribute("draggable", "true");
    });

    // P10: Drag sets correct data transfer
    it("sets blockDefId in dataTransfer on drag start", () => {
      render(<BlockPalette themePackId="pack-1" />);

      const paletteBlock = screen.getByTestId(`palette-block-${mockCameraBlock.id}`);

      // Mock DataTransfer since it's not available in JSDOM
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      };

      fireEvent.dragStart(paletteBlock, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith("application/puppetflow-block", mockCameraBlock.id);
    });

    // P11: Drag sets stageScope for validation
    it("includes stageScope in drag data for lane validation", () => {
      render(<BlockPalette themePackId="pack-1" />);

      const paletteBlock = screen.getByTestId(`palette-block-${mockCameraBlock.id}`);

      // Mock DataTransfer since it's not available in JSDOM
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      };

      fireEvent.dragStart(paletteBlock, { dataTransfer });

      // Should set stageScope as JSON for lane validation during drag
      expect(dataTransfer.setData).toHaveBeenCalledWith(
        "application/puppetflow-scope",
        JSON.stringify(mockCameraBlock.stageScope)
      );
    });
  });

  // ===========================================================================
  // Section 3.4: Already-on-Canvas Indicator
  // ===========================================================================

  describe("Already-on-Canvas Indicator", () => {
    // P12: Shows indicator when block is on canvas
    it("shows on-canvas indicator when block is already placed", () => {
      // Store has a node with this block
      mockStore = createMockCanvasStore({
        nodes: [
          {
            id: "node-1",
            type: "block",
            position: { x: 0, y: 0 },
            data: {
              blockDefId: mockCameraBlock.id,
              name: mockCameraBlock.name,
              type: mockCameraBlock.type,
              fragment: mockCameraBlock.promptFragment,
              stageScope: mockCameraBlock.stageScope,
              pinned: false,
              valid: true,
              order: 0,
            },
          },
        ],
      });

      render(<BlockPalette themePackId="pack-1" />);

      const indicator = screen.getByTestId(`palette-block-indicator-${mockCameraBlock.id}`);
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent("1");
    });

    // P13: Indicator shows count when multiple instances
    it("shows correct count when block appears multiple times", () => {
      mockStore = createMockCanvasStore({
        nodes: [
          {
            id: "node-1",
            type: "block",
            position: { x: 0, y: 0 },
            data: {
              blockDefId: mockCameraBlock.id,
              name: mockCameraBlock.name,
              type: mockCameraBlock.type,
              fragment: mockCameraBlock.promptFragment,
              stageScope: mockCameraBlock.stageScope,
              pinned: false,
              valid: true,
              order: 0,
            },
          },
          {
            id: "node-2",
            type: "block",
            position: { x: 0, y: 100 },
            data: {
              blockDefId: mockCameraBlock.id,
              name: mockCameraBlock.name,
              type: mockCameraBlock.type,
              fragment: mockCameraBlock.promptFragment,
              stageScope: mockCameraBlock.stageScope,
              pinned: false,
              valid: true,
              order: 1,
            },
          },
        ],
      });

      render(<BlockPalette themePackId="pack-1" />);

      const indicator = screen.getByTestId(`palette-block-indicator-${mockCameraBlock.id}`);
      expect(indicator).toHaveTextContent("2");
    });

    // P14: No indicator when block not on canvas
    it("does not show indicator when block is not on canvas", () => {
      mockStore = createMockCanvasStore({ nodes: [] });

      render(<BlockPalette themePackId="pack-1" />);

      const indicator = screen.queryByTestId(`palette-block-indicator-${mockCameraBlock.id}`);
      expect(indicator).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Loading and Error States
  // ===========================================================================

  describe("Loading and Error States", () => {
    it("shows loading state while blocks are being fetched", () => {
      mockBlockLibrary.loading = true;
      mockBlockLibrary.blocks = [];

      render(<BlockPalette themePackId="pack-1" />);

      expect(screen.getByTestId("palette-loading")).toBeInTheDocument();
    });

    it("shows empty state when no theme pack selected", () => {
      render(<BlockPalette themePackId={null} />);

      expect(screen.getByTestId("palette-no-theme")).toBeInTheDocument();
      expect(screen.getByText(/no theme pack loaded/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Block Information Display
  // ===========================================================================

  describe("Block Information Display", () => {
    it("displays block name", () => {
      render(<BlockPalette themePackId="pack-1" />);

      const paletteBlock = screen.getByTestId(`palette-block-${mockCameraBlock.id}`);
      expect(within(paletteBlock).getByText(mockCameraBlock.name)).toBeInTheDocument();
    });

    it("displays valid lanes for block", () => {
      render(<BlockPalette themePackId="pack-1" />);

      const paletteBlock = screen.getByTestId(`palette-block-${mockCameraBlock.id}`);

      // Should show valid lanes
      mockCameraBlock.stageScope.forEach((lane) => {
        expect(within(paletteBlock).getByText(lane)).toBeInTheDocument();
      });
    });

    it("shows block type color indicator", () => {
      render(<BlockPalette themePackId="pack-1" />);

      const paletteBlock = screen.getByTestId(`palette-block-${mockCameraBlock.id}`);

      // Should have type color class
      expect(paletteBlock).toHaveClass("bg-blue-600"); // CAMERA_MOVE color
    });
  });
});
