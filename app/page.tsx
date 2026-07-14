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
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import { Library, LayoutTemplate, FileInput } from "lucide-react";
import {
  Canvas,
  BlockPalette,
  Inspector,
  RunButton,
  ImportSceneModal,
  type ImportSceneResult,
} from "@/components/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useTemplate } from "@/lib/hooks/useTemplate";
import { toast } from "@/lib/store/toast-store";
import {
  createLaneNodes,
  type BlockNodeData,
  type LaneNodeData,
} from "@/lib/types/canvas";
import type { BlockType, Lane } from "@/packages/domain/types";

/**
 * Top bar with template name and save indicator
 */
function TopBar({
  onImportClick,
  canImport,
}: {
  onImportClick: () => void;
  canImport: boolean;
}) {
  const templateName = useCanvasStore((s) => s.templateName);
  const templateId = useCanvasStore((s) => s.templateId);
  // Pass null so we don't re-fetch — page bootstrap already called loadTemplate.
  // save() still uses store.templateId via saveTemplate.
  const { saveState, isDirty, save } = useTemplate(null);

  const canSave = Boolean(templateId) && isDirty;

  const handleSave = async () => {
    try {
      await save();
      const state = useCanvasStore.getState().saveState;
      if (state === "saved") {
        toast.success("Template saved");
      } else if (state === "error") {
        toast.error("Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    }
  };

  const getSaveIndicator = () => {
    if (!templateId) {
      return (
        <span
          className="text-amber-400/90 text-xs font-medium tracking-wide"
          data-testid="topbar-no-template"
        >
          No template loaded
        </span>
      );
    }
    switch (saveState) {
      case "saving":
        return (
          <span className="text-cyan-400/80 text-xs font-medium tracking-wide">
            Saving…
          </span>
        );
      case "saved":
        return (
          <span className="text-emerald-400/90 text-xs font-medium tracking-wide">
            Saved
          </span>
        );
      case "error":
        return (
          <span className="text-red-400 text-xs font-medium tracking-wide">
            Error saving
          </span>
        );
      default:
        return isDirty ? (
          <span className="text-zinc-500 text-xs font-medium tracking-wide">
            Unsaved
          </span>
        ) : null;
    }
  };

  return (
    <header className="pf-header fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="pf-logo-mark shrink-0" aria-hidden />
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-white">
            PuppetFlow
          </h1>
          {templateName && (
            <>
              <span className="text-zinc-600 text-sm">/</span>
              <span className="text-sm text-zinc-500 truncate font-medium">
                {templateName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {getSaveIndicator()}
        <Link
          href="/library"
          className="pf-btn pf-btn-ghost px-3 py-1.5"
          data-testid="nav-library"
        >
          <Library className="w-4 h-4" aria-hidden />
          Library
        </Link>
        <button
          type="button"
          onClick={onImportClick}
          disabled={!canImport}
          title={
            canImport
              ? "Import a scene paste into blocks + canvas"
              : "Load a theme pack first"
          }
          data-testid="nav-import-scene"
          className={`pf-btn px-3 py-1.5 ${
            canImport
              ? "pf-btn-ghost"
              : "pf-btn-ghost opacity-40 cursor-not-allowed"
          }`}
        >
          <FileInput className="w-4 h-4" aria-hidden />
          Import
        </button>
        <button
          onClick={() => {
            void handleSave();
          }}
          disabled={!canSave}
          title={
            !templateId
              ? "Load or create a template first"
              : !isDirty
                ? "No changes to save"
                : "Save template"
          }
          className={`pf-btn px-3.5 py-1.5 ${
            canSave ? "pf-btn-secondary" : "pf-btn-ghost opacity-40 cursor-not-allowed"
          }`}
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
  const setEdges = useCanvasStore((s) => s.setEdges);
  const setThemePackId = useCanvasStore((s) => s.setThemePackId);
  const setRunConfig = useCanvasStore((s) => s.setRunConfig);
  const loadTemplate = useCanvasStore((s) => s.loadTemplate);
  const templateId = useCanvasStore((s) => s.templateId);
  const themePackId = useCanvasStore((s) => s.themePackId);
  const nodes = useCanvasStore((s) => s.nodes);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [paletteKey, setPaletteKey] = useState(0);

  const applyImport = (result: ImportSceneResult) => {
    const byId = new Map(result.blocks.map((b) => [b.id, b]));
    const laneNodes = createLaneNodes();
    const blockNodes: Node<BlockNodeData>[] = result.graph.nodes.map((node) => {
      const def = byId.get(node.blockDefId);
      const scope = (def?.stageScope as Lane[] | undefined) ?? [node.lane];
      return {
        id: node.id,
        type: "block",
        parentId: node.lane,
        extent: "parent" as const,
        position: { x: 10, y: node.order * 100 + 40 },
        data: {
          blockDefId: node.blockDefId,
          name: def?.name ?? "Imported",
          type: (def?.type as BlockType) ?? "CUSTOM",
          fragment: def?.promptFragment ?? "",
          stageScope: scope,
          pinned: node.pinned ?? false,
          valid: scope.includes(node.lane),
          order: node.order,
        },
        draggable: true,
        selectable: true,
      };
    });

    // Domain handshake edges (lane→lane) must NOT become React Flow edges:
    // LaneNode has no Handle components → RF error #008 ("source handle id: null")
    // spam on every render. Logical handshakes are restored on template save.
    setNodes([
      ...(laneNodes as Node<BlockNodeData | LaneNodeData>[]),
      ...blockNodes,
    ]);
    setEdges([]);
    if (result.graph.runConfig) {
      setRunConfig(result.graph.runConfig);
    }
    // Force palette remount to pick up new blocks
    setPaletteKey((k) => k + 1);
    useCanvasStore.setState({ isDirty: true });
    toast.success(
      `Imported ${result.stats.created} new block${result.stats.created === 1 ? "" : "s"}` +
        (result.stats.reused ? ` (${result.stats.reused} reused)` : "") +
        " · canvas flow updated"
    );
  };

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

  const showNoTemplateBanner = !booting && !templateId && !bootError;

  return (
    <ReactFlowProvider>
      <div className="pf-shell flex flex-col h-screen">
        <TopBar
          onImportClick={() => setImportOpen(true)}
          canImport={Boolean(themePackId)}
        />
        <ImportSceneModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          themePackId={themePackId || ""}
          onImported={applyImport}
        />
        {bootError && (
          <div className="fixed top-14 left-0 right-0 z-40 bg-red-950/80 text-red-200 text-sm px-5 py-2.5 border-b border-red-500/30 backdrop-blur-md">
            {bootError}
          </div>
        )}
        {booting && (
          <div
            className="fixed top-14 left-0 right-0 z-40 bg-black/80 text-zinc-500 text-sm px-5 py-2.5 border-b border-white/[0.06] backdrop-blur-md"
            data-testid="canvas-booting"
          >
            Loading workspace…
          </div>
        )}
        {showNoTemplateBanner && (
          <div
            className="
              fixed top-14 left-0 right-0 z-40
              bg-amber-500/5 text-amber-100/90
              text-sm px-5 py-2.5
              border-b border-amber-500/20
              backdrop-blur-md
              flex items-center gap-3
            "
            data-testid="canvas-no-template"
            role="status"
          >
            <LayoutTemplate className="w-4 h-4 text-amber-400 shrink-0" aria-hidden />
            <span>
              No template loaded — drag blocks to explore the canvas. Save and
              Run need a template (create one via the API or seed the database).
            </span>
          </div>
        )}
        <div
          className={`flex flex-1 overflow-hidden ${
            booting || bootError || showNoTemplateBanner ? "pt-[5.5rem]" : "pt-14"
          }`}
        >
          <BlockPalette key={paletteKey} themePackId={themePackId} />
          <Canvas />
          <Inspector />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
