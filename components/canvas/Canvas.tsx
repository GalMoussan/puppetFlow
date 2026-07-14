/**
 * Canvas Component
 *
 * Main React Flow canvas with lanes and blocks.
 *
 * @module components/canvas/Canvas
 */

"use client";

import { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { LaneNode } from "./LaneNode";
import { BlockNode } from "./BlockNode";
import type { BlockNodeData, LaneNodeData } from "@/lib/types/canvas";
import type { Node } from "@xyflow/react";

/**
 * Custom node types for React Flow
 */
const nodeTypes = {
  lane: LaneNode,
  block: BlockNode,
};

/**
 * Props for the Canvas component
 */
interface CanvasProps {
  className?: string;
}

/**
 * Main canvas component with React Flow
 */
export function Canvas({ className }: CanvasProps) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const removeBlock = useCanvasStore((s) => s.removeBlock);

  // Handle canvas background click to deselect
  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Handle keyboard events for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Only delete if a block is selected (not a lane)
        if (selectedId && !["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"].includes(selectedId)) {
          e.preventDefault();
          removeBlock(selectedId);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, removeBlock]);

  // Memoize default viewport
  const defaultViewport = useMemo(
    () => ({ x: 50, y: 50, zoom: 1 }),
    []
  );

  // Memoize fit view options
  const fitViewOptions = useMemo(
    () => ({ padding: 0.2 }),
    []
  );

  return (
    <div
      data-testid="react-flow-canvas"
      className={`flex-1 h-full bg-neutral-950 ${className || ""}`}
    >
      <ReactFlow<Node<BlockNodeData | LaneNodeData>>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.5}
        maxZoom={2}
        panOnScroll
        selectionOnDrag={false}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        className="dark bg-neutral-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#333"
        />
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          className="bg-neutral-800 border-neutral-700"
        />
      </ReactFlow>
    </div>
  );
}

export default Canvas;
