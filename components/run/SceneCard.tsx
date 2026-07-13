"use client";

import { useState } from "react";
import { Copy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { LintBadge, type Violation } from "./LintBadge";

export interface BoundaryFrame {
  description: string;
}

export interface LintResult {
  status: "pass" | "warn" | "fail";
  violations: Violation[];
}

export interface Scene {
  id: string;
  index: number;
  lyrics: string;
  imagePrompt: string;
  videoStart: string;
  videoMiddle: string;
  videoEnd: string;
  boundaryFrames: {
    start: BoundaryFrame;
    end: BoundaryFrame;
  };
  lintResult: LintResult;
  notes: string;
}

interface SceneCardProps {
  scene: Scene;
  onCopy: (scene: Scene) => void;
  onReroll: (sceneIndex: number) => void;
}

export function SceneCard({ scene, onCopy, onReroll }: SceneCardProps) {
  const [showVideoPrompts, setShowVideoPrompts] = useState(false);
  const [showFullImagePrompt, setShowFullImagePrompt] = useState(false);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);

  const lyricsPreview = scene.lyrics.split("\n").slice(0, 2).join("\n");

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const handleRerollClick = () => {
    setShowRerollConfirm(true);
  };

  const handleConfirmReroll = () => {
    setShowRerollConfirm(false);
    onReroll(scene.index);
  };

  const handleCancelReroll = () => {
    setShowRerollConfirm(false);
  };

  return (
    <div
      data-testid={`scene-card-${scene.id}`}
      data-index={scene.index}
      className="bg-zinc-900 rounded-xl border border-zinc-700 p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-white">Scene {scene.index}</h3>
          <LintBadge
            status={scene.lintResult.status}
            violations={scene.lintResult.violations}
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onCopy(scene)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            aria-label="Copy scene"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleRerollClick}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            aria-label="Reroll"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lyrics Preview */}
      <div className="text-sm text-zinc-300">
        <p className="whitespace-pre-wrap">{lyricsPreview}</p>
      </div>

      {/* Image Prompt */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            Image Prompt
          </span>
          <button
            data-testid="expand-image-prompt"
            onClick={() => setShowFullImagePrompt(!showFullImagePrompt)}
            className="text-zinc-400 hover:text-white text-xs"
          >
            {showFullImagePrompt ? "Show less" : "Show more"}
          </button>
        </div>
        <p
          data-testid="image-prompt"
          className="text-sm text-zinc-300 mt-1"
        >
          {showFullImagePrompt
            ? scene.imagePrompt
            : truncateText(scene.imagePrompt, 80)}
        </p>
      </div>

      {/* Video Prompts (Collapsible) */}
      <div>
        <button
          onClick={() => setShowVideoPrompts(!showVideoPrompts)}
          className="flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors"
          aria-label="Video prompts"
        >
          {showVideoPrompts ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Video Prompts
        </button>
        {showVideoPrompts && (
          <div className="mt-2 space-y-2 pl-4 border-l border-zinc-700">
            <div>
              <span className="text-xs text-zinc-500">Video Start</span>
              <p className="text-sm text-zinc-300">{scene.videoStart}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500">Video Middle</span>
              <p className="text-sm text-zinc-300">{scene.videoMiddle}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500">Video End</span>
              <p className="text-sm text-zinc-300">{scene.videoEnd}</p>
            </div>
          </div>
        )}
      </div>

      {/* Boundary Frames */}
      <div>
        <span className="text-xs text-zinc-500 uppercase tracking-wide">
          Boundary Frames
        </span>
        <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-zinc-500 text-xs">Start</span>
            <p className="text-zinc-300">{scene.boundaryFrames.start.description}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">End</span>
            <p className="text-zinc-300">{scene.boundaryFrames.end.description}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {scene.notes && (
        <div data-testid="scene-notes" className="bg-zinc-800 rounded p-2">
          <span className="text-xs text-zinc-500">Notes</span>
          <p className="text-sm text-zinc-300">{scene.notes}</p>
        </div>
      )}

      {/* Reroll Confirmation */}
      {showRerollConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-sm border border-zinc-700">
            <p className="text-white mb-4">
              Regenerate this scene? This will replace the current content.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelReroll}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReroll}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                aria-label="Confirm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
