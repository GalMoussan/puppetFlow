/**
 * Inspector Component
 *
 * Right sidebar showing details of selected block or lane.
 * Provides editing capabilities for fragment overrides.
 *
 * @module components/canvas/Inspector
 */

"use client";

import { useState, useCallback, type DragEvent } from "react";
import { useCanvasStore, selectBlocksInLane } from "@/lib/store/canvas-store";
import type { BlockNodeData, LaneNodeData } from "@/lib/types/canvas";
import type { Lane } from "@/packages/domain/types";
import type { Node } from "@xyflow/react";

/**
 * Empty state when nothing is selected
 */
function EmptyInspector() {
  const templateName = useCanvasStore((s) => s.templateName);

  return (
    <aside className="w-80 bg-neutral-900 border-l border-neutral-800 p-4">
      <div className="text-neutral-400 text-sm">
        <p className="mb-4">Select a block or lane to view details</p>

        {templateName && (
          <div className="mb-6">
            <h3 className="text-neutral-300 font-medium mb-2">Template</h3>
            <p className="text-neutral-200">{templateName}</p>
          </div>
        )}

        <div>
          <h3 className="text-neutral-300 font-medium mb-2">Keyboard Shortcuts</h3>
          <ul className="space-y-1 text-xs">
            <li>
              <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400">
                Delete
              </kbd>{" "}
              - Remove selected block
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400">
                Cmd+S
              </kbd>{" "}
              - Save template
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

/**
 * Inspector for a selected block
 */
function BlockInspector({ node }: { node: Node<BlockNodeData> }) {
  const updateBlockOverride = useCanvasStore((s) => s.updateBlockOverride);
  const removeBlock = useCanvasStore((s) => s.removeBlock);
  const togglePin = useCanvasStore((s) => s.togglePin);

  const data = node.data;
  // Use node.id as key to reset state when node changes (handled by parent via key prop)
  // Initialize directly from data - parent uses key={node.id} to reset on node change
  const [fragment, setFragment] = useState(data.override || data.fragment);
  const [hasChanges, setHasChanges] = useState(false);

  const handleFragmentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFragment(e.target.value);
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    updateBlockOverride(node.id, fragment);
    setHasChanges(false);
  }, [node.id, fragment, updateBlockOverride]);

  const handleClearOverride = useCallback(() => {
    updateBlockOverride(node.id, undefined);
    setFragment(data.fragment);
    setHasChanges(false);
  }, [node.id, data.fragment, updateBlockOverride]);

  const handleDelete = useCallback(() => {
    removeBlock(node.id);
  }, [node.id, removeBlock]);

  const handlePinToggle = useCallback(() => {
    togglePin(node.id);
  }, [node.id, togglePin]);

  const parentLane = node.parentId as Lane;
  const isValidInCurrentLane = data.stageScope.includes(parentLane);

  return (
    <aside className="w-80 bg-neutral-900 border-l border-neutral-800 p-4 overflow-y-auto">
      {/* Block name */}
      <h2 className="text-lg font-semibold text-neutral-200 mb-4">
        {data.name}
      </h2>

      {/* Block type */}
      <div className="mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Type
        </label>
        <p className="text-sm text-neutral-300">{data.type}</p>
      </div>

      {/* Validity status */}
      <div className="mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Placement Status
        </label>
        {isValidInCurrentLane ? (
          <p className="text-sm text-green-400">Valid placement</p>
        ) : (
          <div>
            <p className="text-sm text-red-400">Invalid placement</p>
            <p className="text-xs text-red-400/70 mt-1">
              Block is not valid in {parentLane}
            </p>
          </div>
        )}
      </div>

      {/* Stage scope badges */}
      <div className="mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Valid Lanes
        </label>
        <div className="flex flex-wrap gap-1 mt-1">
          {data.stageScope.map((lane) => (
            <span
              key={lane}
              className={`
                px-2 py-0.5 rounded text-xs
                ${lane === parentLane ? "bg-violet-600 text-white" : "bg-neutral-700 text-neutral-300"}
              `}
            >
              {lane}
            </span>
          ))}
        </div>
      </div>

      {/* Rotation group */}
      {data.type !== "CUSTOM" && (
        <div className="mb-4">
          <label className="text-xs text-neutral-500 uppercase tracking-wide">
            Rotation Group
          </label>
          <p className="text-sm text-neutral-300">
            {data.type.toLowerCase().replace("_", " ")}
          </p>
        </div>
      )}

      {/* Pin toggle */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-neutral-300">
          {data.pinned ? "Pinned" : "Not pinned"}
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            aria-label="Pin block"
            checked={data.pinned}
            onChange={handlePinToggle}
            className="sr-only peer"
          />
          <div className="
            w-9 h-5 bg-neutral-700 rounded-full
            peer-checked:bg-violet-600
            after:content-[''] after:absolute after:top-0.5 after:left-0.5
            after:bg-white after:rounded-full after:h-4 after:w-4
            after:transition-all peer-checked:after:translate-x-4
          " />
        </label>
      </div>

      {/* Fragment editor */}
      <div className="mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Prompt Fragment
          {data.override && (
            <span className="ml-2 px-1.5 py-0.5 bg-amber-600/20 text-amber-500 rounded text-[10px]">
              Override
            </span>
          )}
        </label>

        {/* Show original with strikethrough if override exists */}
        {data.override && (
          <p className="text-xs text-neutral-500 line-through mt-1 mb-2">
            {data.fragment}
          </p>
        )}

        <textarea
          data-testid="inspector-fragment"
          value={fragment}
          onChange={handleFragmentChange}
          className="
            w-full h-32 mt-1 p-2
            bg-neutral-800 border border-neutral-700 rounded
            text-sm text-neutral-200 font-mono
            resize-none
            focus:outline-none focus:ring-2 focus:ring-violet-500
          "
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          data-testid="inspector-save"
          type="button"
          onClick={handleSave}
          disabled={!hasChanges}
          className={`
            flex-1 px-3 py-2 rounded
            text-sm font-medium
            transition-colors
            ${hasChanges
              ? "bg-violet-600 text-white hover:bg-violet-500"
              : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
            }
          `}
        >
          Save Override
        </button>

        {data.override && (
          <button
            type="button"
            onClick={handleClearOverride}
            className="
              px-3 py-2 rounded
              bg-neutral-700 text-neutral-300
              text-sm font-medium
              hover:bg-neutral-600
              transition-colors
            "
          >
            Clear Override
          </button>
        )}
      </div>

      <button
        data-testid="inspector-delete"
        type="button"
        onClick={handleDelete}
        className="
          w-full mt-4 px-3 py-2 rounded
          bg-red-900/30 text-red-400
          text-sm font-medium
          hover:bg-red-900/50
          transition-colors
        "
      >
        Delete Block
      </button>
    </aside>
  );
}

/**
 * Inspector for a selected lane
 */
function LaneInspector({ lane }: { lane: Lane }) {
  const blocksInLane = useCanvasStore(selectBlocksInLane(lane));
  const setNodes = useCanvasStore((s) => s.setNodes);
  const nodes = useCanvasStore((s) => s.nodes);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (e: DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) return;

      // Reorder blocks
      const reordered = [...blocksInLane];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(dropIndex, 0, removed);

      // Update order values in all nodes
      const updatedNodes = nodes.map((node) => {
        const newIndex = reordered.findIndex((b) => b.id === node.id);
        if (newIndex !== -1) {
          return {
            ...node,
            data: {
              ...(node.data as BlockNodeData),
              order: newIndex,
            },
            position: {
              x: 10,
              y: newIndex * 100 + 50,
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      setDraggedIndex(null);
    },
    [draggedIndex, blocksInLane, nodes, setNodes]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <aside className="w-80 bg-neutral-900 border-l border-neutral-800 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-neutral-200 mb-4">
        {lane}
      </h2>

      <div className="mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Blocks ({blocksInLane.length})
        </label>

        {blocksInLane.length === 0 ? (
          <p className="text-sm text-neutral-500 mt-2">
            No blocks in this lane. Drag blocks from the palette.
          </p>
        ) : (
          <ul
            data-testid="inspector-lane-order"
            className="mt-2 space-y-1"
          >
            {blocksInLane.map((block, index) => {
              const data = block.data as BlockNodeData;
              return (
                <li
                  key={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-2 p-2
                    bg-neutral-800 rounded
                    cursor-grab active:cursor-grabbing
                    ${draggedIndex === index ? "opacity-50" : ""}
                  `}
                >
                  <span className="text-neutral-500 text-sm w-4">
                    {index + 1}
                  </span>
                  <span className="text-sm text-neutral-200 truncate flex-1">
                    {data.name}
                  </span>
                  <div
                    className={`
                      w-2 h-2 rounded-full
                      ${data.valid ? "bg-green-500" : "bg-red-500"}
                    `}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="text-xs text-neutral-500">
        Drag items to reorder the assembly sequence
      </div>
    </aside>
  );
}

/**
 * Inspector sidebar component
 */
export function Inspector() {
  const selectedId = useCanvasStore((s) => s.selectedId);
  const nodes = useCanvasStore((s) => s.nodes);

  // Find selected node
  const selectedNode = selectedId
    ? nodes.find((n) => n.id === selectedId)
    : null;

  // Nothing selected
  if (!selectedNode) {
    return <EmptyInspector />;
  }

  // Lane selected
  if (selectedNode.type === "lane") {
    const laneData = selectedNode.data as LaneNodeData;
    return <LaneInspector lane={laneData.lane} />;
  }

  // Block selected - key resets component state when node changes
  return <BlockInspector key={selectedNode.id} node={selectedNode as Node<BlockNodeData>} />;
}

export default Inspector;
