/**
 * Test BlockNode using vi.mock for Zustand to avoid multiple React instances
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import React from "react";
import { getTypeColor, type BlockNodeData } from "@/lib/types/canvas";

// Mock store values
const mockSelectNode = vi.fn();
const mockTogglePin = vi.fn();
const mockRemoveBlock = vi.fn();
let mockSelectedId: string | null = null;

// Mock Zustand store BEFORE importing the component
vi.mock("@/lib/store/canvas-store", () => ({
  useCanvasStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      selectNode: mockSelectNode,
      togglePin: mockTogglePin,
      removeBlock: mockRemoveBlock,
      selectedId: mockSelectedId,
    };
    if (typeof selector === "function") {
      return selector(state);
    }
    return state;
  },
}));

// Import component AFTER mocking
import { BlockNode } from "@/components/canvas/BlockNode";

function createBlockNodeProps(id: string, data: Partial<BlockNodeData>) {
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
    selected: false,
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

describe("BlockNode with vi.mock", () => {
  beforeEach(() => {
    mockSelectedId = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render BlockNode with mocked store", async () => {
    const props = createBlockNodeProps("node-1", {
      name: "Test Camera Block",
      type: "CAMERA_MOVE",
      fragment: "Camera dollies forward",
    });

    await act(async () => {
      render(<BlockNode {...props} />);
    });

    const block = screen.getByTestId("block-node-1");
    expect(block).toBeInTheDocument();
    
    const header = screen.getByTestId("block-header-node-1");
    expect(header).toBeInTheDocument();
    expect(screen.getByText("Test Camera Block")).toBeInTheDocument();
  });

  it("should call togglePin when pin button is clicked", async () => {
    const props = createBlockNodeProps("node-1", {
      pinned: false,
    });

    await act(async () => {
      render(<BlockNode {...props} />);
    });

    const pinButton = screen.getByTestId("block-pin-node-1");
    
    await act(async () => {
      fireEvent.click(pinButton);
    });

    expect(mockTogglePin).toHaveBeenCalledWith("node-1");
  });

  it("should show green validity dot when valid", async () => {
    const props = createBlockNodeProps("node-1", {
      valid: true,
    });

    await act(async () => {
      render(<BlockNode {...props} />);
    });

    const validityDot = screen.getByTestId("validity-dot-node-1");
    expect(validityDot).toHaveClass("bg-green-500");
  });

  it("should show red validity dot when invalid", async () => {
    const props = createBlockNodeProps("node-1", {
      valid: false,
    });

    await act(async () => {
      render(<BlockNode {...props} />);
    });

    const validityDot = screen.getByTestId("validity-dot-node-1");
    expect(validityDot).toHaveClass("bg-red-500");
  });

  it("should have correct type color for CAMERA_MOVE", async () => {
    const props = createBlockNodeProps("node-1", {
      type: "CAMERA_MOVE",
    });

    await act(async () => {
      render(<BlockNode {...props} />);
    });

    const header = screen.getByTestId("block-header-node-1");
    expect(header).toHaveClass(getTypeColor("CAMERA_MOVE"));
  });
});
