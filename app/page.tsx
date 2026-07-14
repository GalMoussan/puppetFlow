/**
 * Canvas Page
 *
 * Main page with the React Flow canvas, block palette, and inspector.
 * Bootstraps the first available template (or theme pack) so Save/Run work.
 *
 * @module app/page
 */

"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas, BlockPalette, Inspector, RunButton } from "@/components/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useTemplate } from "@/lib/hooks/useTemplate";
import { createLaneNodes } from "@/lib/types/canvas";

/**
 * Top bar with template name and save indicator
 */
function TopBar() {
  const templateName = useCanvasStore((s) => s.templateName);
  const templateId = useCanvasStore((s) => s.templateId);
  // Pass null so we don't re-fetch — page bootstrap already called loadTemplate.
  // save() still uses store.templateId via saveTemplate.
  const { saveState, isDirty, save } = useTemplate(null);

  const canSave = Boolean(templateId) && isDirty;

  const getSaveIndicator = () => {
    if (!templateId) {
      return (
        <span className="text-amber-500 text-sm">No template loaded</span>
      );
    }
    switch (saveState) {
      case "saving":
        return <span className="text-yellow-500 text-sm">Saving...</span>;
      case "saved":
        return <span className="text-green-500 text-sm">Saved</span>;
      case "error":
        return <span className="text-red-500 text-sm">Error saving</span>;
      default:
        return isDirty ? (
          <span className="text-neutral-500 text-sm">Unsaved changes</span>
        ) : null;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-neutral-900 border-b border-neutral-800 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-neutral-200">PuppetFlow</h1>
        {templateName && (
          <span className="text-sm text-neutral-400">/ {templateName}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {getSaveIndicator()}
        <button
          onClick={() => {
            void save();
          }}
          disabled={!canSave}
          title={
            !templateId
              ? "Load or create a template first"
              : !isDirty
                ? "No changes to save"
                : "Save template"
          }
          className={`
            px-3 py-1.5 rounded
            text-sm font-medium
            transition-colors
            ${
              canSave
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
 * Main canvas page component
 */
export default function CanvasPage() {
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setThemePackId = useCanvasStore((s) => s.setThemePackId);
  const loadTemplate = useCanvasStore((s) => s.loadTemplate);
  const templateId = useCanvasStore((s) => s.templateId);
  const themePackId = useCanvasStore((s) => s.themePackId);
  const nodes = useCanvasStore((s) => s.nodes);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  // Bootstrap: load first template (or fall back to theme pack + empty lanes)
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBooting(true);
      setBootError(null);
      try {
        // Prefer an existing template so Save + Run have a templateId
        const templatesRes = await fetch("/api/templates?limit=1");
        if (templatesRes.ok) {
          const templatesJson = (await templatesRes.json()) as {
            data?: Array<{ id: string; themePackId?: string }>;
          };
          const first = templatesJson.data?.[0];
          if (first?.id) {
            await loadTemplate(first.id);
            if (!cancelled) setBooting(false);
            return;
          }
        }

        // No templates: resolve a theme pack for the palette
        const packsRes = await fetch("/api/theme-packs?limit=1");
        if (packsRes.ok) {
          const packsJson = (await packsRes.json()) as {
            data?: Array<{ id: string }>;
          };
          const packId = packsJson.data?.[0]?.id;
          if (packId && !cancelled) {
            setThemePackId(packId);
          }
        }

        if (!cancelled) {
          const current = useCanvasStore.getState().nodes;
          if (current.length === 0) {
            setNodes(createLaneNodes());
          }
        }
      } catch (err) {
        if (!cancelled) {
          setBootError(
            err instanceof Error ? err.message : "Failed to bootstrap workspace"
          );
          // Still show empty lanes so the UI is usable
          if (useCanvasStore.getState().nodes.length === 0) {
            setNodes(createLaneNodes());
          }
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadTemplate, setNodes, setThemePackId]);

  // If template load left no lanes somehow, ensure lanes exist
  useEffect(() => {
    if (!booting && nodes.length === 0 && !templateId) {
      setNodes(createLaneNodes());
    }
  }, [booting, nodes.length, templateId, setNodes]);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-neutral-950">
        <TopBar />
        {bootError && (
          <div className="fixed top-12 left-0 right-0 z-40 bg-red-950/90 text-red-200 text-sm px-4 py-2 border-b border-red-800">
            {bootError}
          </div>
        )}
        {booting && (
          <div className="fixed top-12 left-0 right-0 z-40 bg-neutral-900/90 text-neutral-400 text-sm px-4 py-2 border-b border-neutral-800">
            Loading workspace...
          </div>
        )}
        <div className="flex flex-1 pt-12 overflow-hidden">
          <BlockPalette themePackId={themePackId} />
          <Canvas />
          <Inspector />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
