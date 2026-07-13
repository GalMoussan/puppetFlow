/**
 * Canvas Page
 *
 * Main page with the React Flow canvas, block palette, and inspector.
 *
 * @module app/page
 */

"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas, BlockPalette, Inspector, RunButton } from "@/components/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useTemplate } from "@/lib/hooks/useTemplate";
import { LANE_ORDER, LANE_CONFIG } from "@/lib/types/canvas";
import type { LaneNodeData } from "@/lib/types/canvas";
import type { Node } from "@xyflow/react";

/**
 * Top bar with template name and save indicator
 */
function TopBar() {
  const templateName = useCanvasStore((s) => s.templateName);
  const { saveState, isDirty, save } = useTemplate(null);

  const getSaveIndicator = () => {
    switch (saveState) {
      case "saving":
        return (
          <span className="text-yellow-500 text-sm">Saving...</span>
        );
      case "saved":
        return (
          <span className="text-green-500 text-sm">Saved</span>
        );
      case "error":
        return (
          <span className="text-red-500 text-sm">Error saving</span>
        );
      default:
        return isDirty ? (
          <span className="text-neutral-500 text-sm">Unsaved changes</span>
        ) : null;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-neutral-900 border-b border-neutral-800 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-neutral-200">
          PuppetFlow
        </h1>
        {templateName && (
          <span className="text-sm text-neutral-400">
            / {templateName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {getSaveIndicator()}
        <button
          onClick={() => save()}
          disabled={!isDirty}
          className={`
            px-3 py-1.5 rounded
            text-sm font-medium
            transition-colors
            ${isDirty
              ? "bg-violet-600 text-white hover:bg-violet-500"
              : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
            }
          `}
        >
          Save
        </button>
        <RunButton />
      </div>
    </header>
  );
}

/**
 * Create initial lane nodes for the canvas
 */
function createLaneNodes(): Node<LaneNodeData>[] {
  return LANE_ORDER.map((lane) => ({
    id: lane,
    type: "lane",
    position: { x: LANE_CONFIG[lane].x, y: 0 },
    data: { lane },
    draggable: false,
    selectable: true,
  }));
}

/**
 * Main canvas page component
 */
export default function CanvasPage() {
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setThemePackId = useCanvasStore((s) => s.setThemePackId);
  const nodes = useCanvasStore((s) => s.nodes);

  // Default theme pack ID (would come from URL params or template in production)
  // Using the seeded demo pack ID
  const themePackId = "cmrj77h7400005qltc7rcmos1";

  // Initialize with lane nodes if empty
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes(createLaneNodes());
    }
  }, [nodes.length, setNodes]);

  // Set theme pack ID in store
  useEffect(() => {
    setThemePackId(themePackId);
  }, [setThemePackId, themePackId]);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-neutral-950">
        <TopBar />
        <div className="flex flex-1 pt-12 overflow-hidden">
          <BlockPalette themePackId={themePackId} />
          <Canvas />
          <Inspector />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
