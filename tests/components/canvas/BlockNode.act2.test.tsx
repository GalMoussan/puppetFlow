/**
 * Test BlockNode with act() wrapper for React 19 compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

import { BlockNode } from "@/components/canvas/BlockNode";
import { useCanvasStore } from "@/lib/store/canvas-store";
import type { BlockNodeData } from "@/lib/types/canvas";

// Store the initial state for reset
const initialState = useCanvasStore.getState();

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

describe("BlockNode with act()", () => {
  beforeEach(async () => {
    await act(async () => {
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

  it("should render BlockNode with act wrapper", async () => {
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

  it("should show pin button", async () => {
    const props = createBlockNodeProps("node-1", {
      pinned: false,
    });

    await act(async () => {
      render(<BlockNode {...props} />);
    });

    const pinButton = screen.getByTestId("block-pin-node-1");
    expect(pinButton).toBeInTheDocument();
    expect(pinButton).toHaveAttribute("aria-pressed", "false");
  });

  it("should show validity indicator", async () => {
    const props = createBlockNodeProps("node-1", {
      valid: true,
    });

    await act(async () => {
      render(<BlockNode {...props} />);
    });

    const validityDot = screen.getByTestId("validity-dot-node-1");
    expect(validityDot).toBeInTheDocument();
    expect(validityDot).toHaveClass("bg-green-500");
  });
});
