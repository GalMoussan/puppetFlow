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
import { LANE_CONFIG, LANE_HEIGHT, type LaneNodeData } from "@/lib/types/canvas";

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
          // Visible feedback when block stageScope does not include this lane
          window.alert(
            `This block cannot go in ${lane}. Allowed lanes: ${stageScope.join(", ") || "(none)"}. Check stage scope when creating the block.`
          );
          return;
        }

        // Get block data from transfer
        const blockDataJson = e.dataTransfer.getData(
          "application/puppetflow-blockdata"
        );
        if (blockDataJson) {
          const blockData = JSON.parse(blockDataJson);
          // Normalize API shape: ensure stageScope is an array
          const normalized = {
            ...blockData,
            id: blockData.id,
            promptFragment:
              blockData.promptFragment ?? blockData.fragment ?? "",
            stageScope: Array.isArray(blockData.stageScope)
              ? blockData.stageScope
              : stageScope,
          };
          addBlock(normalized, lane, blocksInLane);
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
        flex flex-col h-full
        bg-[#0a0a0b] border border-white/[0.1] rounded-lg
        ${selected ? "ring-2 ring-violet-500" : ""}
        ${dragState === "valid" ? "ring-2 ring-green-500 bg-green-500/10" : ""}
        ${dragState === "invalid" ? "ring-2 ring-red-500 bg-red-500/10" : ""}
        transition-all duration-150
      `}
      style={{
        width: laneConfig.width,
        height: LANE_HEIGHT,
        minHeight: LANE_HEIGHT,
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
          bg-white/[0.04] border-b border-white/[0.1]
          rounded-t-lg
          text-sm font-medium text-zinc-100
        "
      >
        {LANE_DISPLAY_NAMES[lane]}
      </div>

      {/* Lane Dropzone — child block nodes render here via React Flow parentId */}
      <div
        data-testid={`lane-dropzone-${lane}`}
        className="flex-1 p-2 relative"
        style={{ minHeight: LANE_HEIGHT - 48 }}
      >
        {blocksInLane === 0 && dragState === "idle" && (
          <div className="text-center text-zinc-500 text-sm mt-4 pointer-events-none">
            Drop blocks here
            {lane === "IMAGE" && (
              <p className="text-xs mt-2 text-zinc-600 px-2">
                Needs blocks with IMAGE in stage scope (e.g. Puppet Visual,
                Stage Area, or Create Block with Image checked)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default LaneNode;
