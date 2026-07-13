"use client";

import { useState } from "react";
import { ArrowLeft, Copy, Download, Check } from "lucide-react";
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

async function downloadExport(
  runId: string,
  format: "scenes" | "scaffold",
  filename: string
): Promise<void> {
  const response = await fetch(`/api/export/${runId}?format=${format}`);
  if (!response.ok) {
    throw new Error("Export failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function RunViewer({ run, onReroll, onBackToCanvas }: RunViewerProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const dateStr = new Date(run.createdAt).toISOString().split("T")[0];
  const baseName = run.templateName.replace(/\s+/g, "-");

  const handleCopyAll = async () => {
    const text = formatAllScenesForClipboard(run.scenes);
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopyScene = async (scene: Scene) => {
    const text = formatSceneForClipboard(scene);
    await navigator.clipboard.writeText(text);
  };

  const handleExportScenes = async () => {
    try {
      await downloadExport(
        run.id,
        "scenes",
        `${baseName}-${dateStr}.md`
      );
    } catch (error) {
      console.error("Export scenes failed:", error);
    }
  };

  const handleExportScaffold = async () => {
    try {
      await downloadExport(
        run.id,
        "scaffold",
        `scaffold-${baseName}-${dateStr}.md`
      );
    } catch (error) {
      console.error("Export scaffold failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToCanvas}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Back to canvas"
              type="button"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Canvas
            </button>
            <div className="h-6 w-px bg-zinc-700" />
            <h1 className="text-xl font-semibold">{run.templateName}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Copy all"
              type="button"
            >
              {copySuccess ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copySuccess ? "Copied!" : "Copy All"}
            </button>
            <button
              onClick={handleExportScenes}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              aria-label="Export scenes"
              type="button"
            >
              <Download className="w-4 h-4" />
              Export scenes
            </button>
            <button
              onClick={handleExportScaffold}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
              aria-label="Export scaffold"
              type="button"
            >
              <Download className="w-4 h-4" />
              Export scaffold
            </button>
          </div>
        </div>
      </header>

      {/* Metadata */}
      <div className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <span>{formatDate(run.createdAt)}</span>
          <span className="flex items-center gap-1">
            <span className="text-zinc-500">{run.sceneCount} scenes</span>
          </span>
          <span>{formatDuration(run.duration)}</span>
          <span className="text-zinc-500">{run.model}</span>
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
