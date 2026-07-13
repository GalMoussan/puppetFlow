/**
 * Lane Node Component
 *
 * Custom React Flow node for lane group rendering.
 * Lanes are vertical columns where blocks can be placed.
 *
 * @module components/canvas/LaneNode
 */

"use client";

import { memo, useCallback, useState, type DragEvent } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { getDragValidationState } from "@/lib/snap-validation";
import type { Lane } from "@/packages/domain/types";
import { LANE_CONFIG, type LaneNodeData } from "@/lib/types/canvas";

/**
 * Display names for lanes
 */
const LANE_DISPLAY_NAMES: Record<Lane, string> = {
  GLOBAL: "GLOBAL",
  IMAGE: "IMAGE",
  VIDEO_START: "VIDEO_START",
  EXTEND_MIDDLE: "EXTEND_MIDDLE",
  EXTEND_END: "EXTEND_END",
};

/**
 * Lane node component for the canvas
 */
export const LaneNode = memo(function LaneNode({
  id,
  data,
  selected,
}: NodeProps<Node<LaneNodeData>>) {
  const selectNode = useCanvasStore((s) => s.selectNode);
  const addBlock = useCanvasStore((s) => s.addBlock);
  const nodes = useCanvasStore((s) => s.nodes);

  const [dragState, setDragState] = useState<"idle" | "valid" | "invalid">(
    "idle"
  );

  const lane = data.lane;
  const laneConfig = LANE_CONFIG[lane];

  // Count blocks in this lane
  const blocksInLane = nodes.filter(
    (n) => n.type === "block" && n.parentId === lane
  ).length;

  const handleClick = useCallback(() => {
    selectNode(id);
  }, [id, selectNode]);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      // Check if this is a block drag
      const scopeData = e.dataTransfer.types.includes(
        "application/puppetflow-scope"
      );
      if (!scopeData) return;

      // Get stageScope from data transfer
      const scopeJson = e.dataTransfer.getData("application/puppetflow-scope");
      if (!scopeJson) {
        // During dragover, we can't read data, but we can check effect
        e.dataTransfer.dropEffect = "copy";
        return;
      }

      try {
        const stageScope = JSON.parse(scopeJson) as Lane[];
        const validationState = getDragValidationState(stageScope, lane);
        setDragState(validationState);
        e.dataTransfer.dropEffect = validationState === "valid" ? "copy" : "none";
      } catch {
        setDragState("invalid");
      }
    },
    [lane]
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    // We can't access dataTransfer data in dragenter, just show as potential target
    setDragState("valid");
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragState("idle");
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragState("idle");

      const blockId = e.dataTransfer.getData("application/puppetflow-block");
      if (!blockId) return;

      const scopeJson = e.dataTransfer.getData("application/puppetflow-scope");
      if (!scopeJson) return;

      try {
        const stageScope = JSON.parse(scopeJson) as Lane[];
        const validationState = getDragValidationState(stageScope, lane);

        if (validationState === "invalid") {
          // Could show toast here
          return;
        }

        // Get block data from transfer
        const blockDataJson = e.dataTransfer.getData(
          "application/puppetflow-blockdata"
        );
        if (blockDataJson) {
          const blockData = JSON.parse(blockDataJson);
          addBlock(blockData, lane, blocksInLane);
        }
      } catch (error) {
        console.error("Drop error:", error);
      }
    },
    [lane, addBlock, blocksInLane]
  );

  return (
    <div
      data-testid={`lane-${lane}`}
      className={`
        flex flex-col
        bg-neutral-900 border border-neutral-700 rounded-lg
        ${selected ? "ring-2 ring-violet-500" : ""}
        ${dragState === "valid" ? "ring-2 ring-green-500 bg-green-500/10" : ""}
        ${dragState === "invalid" ? "ring-2 ring-red-500 bg-red-500/10" : ""}
        transition-all duration-150
      `}
      style={{
        width: laneConfig.width,
        minHeight: 500,
      }}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Lane Header */}
      <div
        className="
          px-3 py-2
          bg-neutral-800 border-b border-neutral-700
          rounded-t-lg
          text-sm font-medium text-neutral-200
        "
      >
        {LANE_DISPLAY_NAMES[lane]}
      </div>

      {/* Lane Dropzone */}
      <div
        data-testid={`lane-dropzone-${lane}`}
        className="flex-1 p-2 min-h-[400px]"
      >
        {blocksInLane === 0 && dragState === "idle" && (
          <div className="text-center text-neutral-500 text-sm mt-4">
            Drop blocks here
          </div>
        )}
      </div>
    </div>
  );
});

export default LaneNode;
