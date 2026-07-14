/**
 * Block Node Component
 *
 * Custom React Flow node for block rendering on the canvas.
 * Displays block name, fragment preview, pin toggle, and validity indicator.
 *
 * @module components/canvas/BlockNode
 */

"use client";

import { memo, useCallback, type KeyboardEvent, type DragEvent } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { getTypeColor, type BlockNodeData } from "@/lib/types/canvas";

/**
 * Pin icon component
 */
function PinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      className="shrink-0"
    >
      <path d="M8 1v4m0 0L5 3m3 2l3-2M4 7h8l-1 6H5L4 7z" />
      <path d="M8 13v2" />
    </svg>
  );
}

/**
 * Block node component for the canvas
 */
export const BlockNode = memo(function BlockNode({
  id,
  data,
  selected,
}: NodeProps<Node<BlockNodeData>>) {
  const selectNode = useCanvasStore((s) => s.selectNode);
  const togglePin = useCanvasStore((s) => s.togglePin);
  const removeBlock = useCanvasStore((s) => s.removeBlock);
  const selectedId = useCanvasStore((s) => s.selectedId);

  const isSelected = selected || selectedId === id;
  const displayText = data.override || data.fragment;
  const typeColor = getTypeColor(data.type);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(id);
    },
    [id, selectNode]
  );

  const handlePinClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      togglePin(id);
    },
    [id, togglePin]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeBlock(id);
      }
    },
    [id, removeBlock]
  );

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData("application/puppetflow-reorder", id);
      e.dataTransfer.setData("application/puppetflow-order", String(data.order));
      e.dataTransfer.effectAllowed = "move";
    },
    [id, data.order]
  );

  return (
    <div
      data-testid={`block-${id}`}
      tabIndex={0}
      role="button"
      aria-label={`${data.name} block`}
      draggable="true"
      className={`
        w-[180px]
        bg-[#0a0a0b] border rounded-lg
        cursor-pointer
        focus:outline-none
        transition-all duration-150
        ${isSelected ? "ring-2 ring-violet-500" : ""}
        ${data.valid ? "border-white/[0.1]" : "border-red-500"}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
    >
      {/* Header with type color */}
      <div
        data-testid={`block-header-${id}`}
        className={`
          flex items-center justify-between gap-2
          px-2 py-1.5
          ${typeColor}
          rounded-t-lg
          text-white text-sm
        `}
      >
        <span className="truncate font-medium">{data.name}</span>
        <button
          data-testid={`block-pin-${id}`}
          type="button"
          aria-label={data.pinned ? "Unpin block" : "Pin block"}
          aria-pressed={data.pinned}
          className="
            p-0.5 rounded
            hover:bg-white/20
            transition-colors
          "
          onClick={handlePinClick}
        >
          <PinIcon filled={data.pinned} />
        </button>
      </div>

      {/* Body with fragment preview */}
      <div className="p-2">
        <p
          className="
            line-clamp-2
            font-mono text-xs text-zinc-300
            mb-2
          "
        >
          {displayText}
        </p>

        {/* Validity indicator */}
        <div className="flex items-center justify-end">
          <div
            data-testid={`validity-dot-${id}`}
            aria-label={data.valid ? "Valid placement" : "Invalid placement"}
            className={`
              w-2 h-2 rounded-full
              ${data.valid ? "bg-green-500" : "bg-red-500"}
            `}
          />
        </div>
      </div>
    </div>
  );
});

export default BlockNode;
