/**
 * Diagnostic test to understand BlockNode render issue
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
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

describe("BlockNode Diagnostic", () => {
  beforeEach(() => {
    // Reset store
    useCanvasStore.setState({
      ...initialState,
      nodes: [],
      edges: [],
      selectedId: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should log store state and props during render", () => {
    const props = createBlockNodeProps("diag-1", {
      name: "Diagnostic Block",
      type: "CAMERA_MOVE",
      fragment: "Test fragment",
    });

    console.log("=== DIAGNOSTIC INFO ===");
    console.log("Props:", JSON.stringify(props, null, 2));
    console.log("Store state:", JSON.stringify(useCanvasStore.getState(), (key, value) => {
      if (typeof value === 'function') return '[Function]';
      return value;
    }, 2));

    const { container } = render(<BlockNode {...props} />);
    
    console.log("Rendered HTML:", container.innerHTML);
    
    expect(container.innerHTML).not.toBe("<div></div>");
    expect(container.innerHTML.length).toBeGreaterThan(10);
  });

  it("should render a simple div without store selectors", () => {
    // Test if jsdom is working at all
    const SimpleDiv = () => <div data-testid="simple">Hello</div>;
    const { container } = render(<SimpleDiv />);
    
    console.log("Simple div HTML:", container.innerHTML);
    expect(container.innerHTML).toContain("Hello");
  });

  it("should access store functions without error", () => {
    const state = useCanvasStore.getState();
    console.log("selectNode type:", typeof state.selectNode);
    console.log("togglePin type:", typeof state.togglePin);
    console.log("removeBlock type:", typeof state.removeBlock);
    console.log("selectedId:", state.selectedId);
    
    expect(typeof state.selectNode).toBe("function");
    expect(typeof state.togglePin).toBe("function");
    expect(typeof state.removeBlock).toBe("function");
  });
});
