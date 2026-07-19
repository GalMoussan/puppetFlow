"use client";

import { useState } from "react";
import { ArrowLeft, Copy, Check, Library } from "lucide-react";
import { ExportDropdown } from "./ExportDropdown";
import { toast } from "@/lib/store/toast-store";
import { SceneCard, type Scene, type RerollStage } from "./SceneCard";

export interface Run {
  id: string;
  templateId: string;
  templateName: string;
  sceneCount: number;
  model: string;
  status: "generating" | "done" | "failed";
  createdAt: string;
  completedAt?: string;
  duration: number;
  scenes: Scene[];
}

interface RunViewerProps {
  run: Run;
  onReroll: (sceneIndex: number, stage?: RerollStage) => void;
  onBackToCanvas: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function formatSceneForClipboard(scene: Scene): string {
  return `## Scene ${scene.index}

**Lyrics:**
${scene.lyrics}

**Image Prompt:**
${scene.imagePrompt}

**Video Start:**
${scene.videoStart}

**Video Middle:**
${scene.videoMiddle}

**Video End:**
${scene.videoEnd}
`;
}

function formatAllScenesForClipboard(scenes: Scene[]): string {
  return scenes.map(formatSceneForClipboard).join("\n---\n\n");
}

export function RunViewer({ run, onReroll, onBackToCanvas }: RunViewerProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyAll = async () => {
    try {
      const text = formatAllScenesForClipboard(run.scenes);
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      toast.success("Copied all scenes to clipboard");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyScene = async (scene: Scene) => {
    try {
      const text = formatSceneForClipboard(scene);
      await navigator.clipboard.writeText(text);
      toast.success(`Copied scene ${scene.index}`);
    } catch {
      toast.error("Failed to copy scene");
    }
  };

  return (
    <div className="pf-shell min-h-screen">
      <header className="pf-header sticky top-0 z-40 px-6 py-3.5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBackToCanvas}
              className="pf-btn pf-btn-ghost px-2.5 py-1.5 shrink-0"
              aria-label="Back to canvas"
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
              Canvas
            </button>
            <a
              href="/library"
              className="pf-btn pf-btn-ghost px-2.5 py-1.5 shrink-0"
              aria-label="Generation library"
              data-testid="nav-library"
            >
              <Library className="w-4 h-4" />
              Library
            </a>
            <div className="h-5 w-px bg-white/[0.08] shrink-0" />
            <h1 className="text-[15px] font-semibold tracking-tight truncate text-white">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] mr-2 align-middle" aria-hidden />
              {run.templateName}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
              aria-label="Copy all"
              type="button"
            >
              {copySuccess ? (
                <Check className="w-4 h-4 text-lime-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copySuccess ? "Copied!" : "Copy All"}
            </button>
            <ExportDropdown
              runId={run.id}
              hasScenes={run.scenes.length > 0}
              hasScaffold={true}
            />
          </div>
        </div>
      </header>

      {/* Metadata */}
      <div className="border-b border-white/[0.08] bg-black/40 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center gap-6 text-sm text-zinc-500 flex-wrap">
          <span>{formatDate(run.createdAt)}</span>
          <span className="flex items-center gap-1">
            <span className="text-zinc-500">{run.sceneCount} scenes</span>
          </span>
          <span className="text-lime-400/90">{formatDuration(run.duration)}</span>
          <span className="font-mono text-zinc-500">{run.model}</span>
        </div>
      </div>

      {/* Scene Cards Grid */}
      <main className="p-6">
        <div
          data-testid="scene-cards-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {run.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onCopy={handleCopyScene}
              onReroll={onReroll}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
