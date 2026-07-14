"use client";

import { useState } from "react";
import { Copy, RefreshCw, ChevronDown, ChevronUp, Check } from "lucide-react";
import { LintBadge, type Violation } from "./LintBadge";
import type { Lane } from "@/packages/domain/types";

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

export type RerollStage = Extract<
  Lane,
  "IMAGE" | "VIDEO_START" | "EXTEND_MIDDLE" | "EXTEND_END"
>;

interface SceneCardProps {
  scene: Scene;
  onCopy: (scene: Scene) => void;
  /** Full scene when stage omitted; stage reroll when provided */
  onReroll: (sceneIndex: number, stage?: RerollStage) => void;
}

type PromptKey = "image" | "start" | "middle" | "end";

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function CopyIcon({ active }: { active: boolean }) {
  return active ? (
    <Check className="w-3.5 h-3.5 text-green-500" />
  ) : (
    <Copy className="w-3.5 h-3.5" />
  );
}

export function SceneCard({ scene, onCopy, onReroll }: SceneCardProps) {
  const [showVideoPrompts, setShowVideoPrompts] = useState(false);
  const [showFullImagePrompt, setShowFullImagePrompt] = useState(false);
  const [showRerollMenu, setShowRerollMenu] = useState(false);
  const [pendingReroll, setPendingReroll] = useState<RerollStage | "full" | null>(
    null
  );
  const [copiedKey, setCopiedKey] = useState<PromptKey | null>(null);

  const lyricsPreview = scene.lyrics.split("\n").slice(0, 2).join("\n");

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const flashCopied = (key: PromptKey) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopyPrompt = async (key: PromptKey, text: string) => {
    await copyText(text);
    flashCopied(key);
  };

  const handleRerollMenuClick = () => {
    setShowRerollMenu((open) => !open);
  };

  const selectReroll = (target: RerollStage | "full") => {
    setShowRerollMenu(false);
    setPendingReroll(target);
  };

  const handleConfirmReroll = () => {
    if (pendingReroll === "full") {
      onReroll(scene.index);
    } else if (pendingReroll) {
      onReroll(scene.index, pendingReroll);
    }
    setPendingReroll(null);
  };

  const handleCancelReroll = () => {
    setPendingReroll(null);
  };

  const confirmLabel =
    pendingReroll === "full"
      ? "Regenerate this scene? This will replace the current content."
      : `Regenerate the ${pendingReroll?.replace("_", " ")} stage?`;

  return (
    <div
      data-testid={`scene-card-${scene.id}`}
      data-index={scene.index}
      className="bg-[#0a0a0b] rounded-xl border border-white/[0.1] p-4 space-y-4"
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
        <div className="flex gap-1 relative">
          <button
            onClick={() => onCopy(scene)}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded transition-colors"
            aria-label="Copy scene"
            type="button"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleRerollMenuClick}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded transition-colors"
            aria-label="Reroll menu"
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {showRerollMenu && (
            <div
              className="absolute right-0 top-9 z-20 w-48 bg-white/[0.04] border border-white/[0.12] rounded-lg shadow-xl py-1"
              data-testid="reroll-menu"
            >
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.08]"
                aria-label="Reroll full scene"
                onClick={() => selectReroll("full")}
              >
                Full scene
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.08]"
                aria-label="Reroll image"
                onClick={() => selectReroll("IMAGE")}
              >
                Image
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.08]"
                aria-label="Reroll video start"
                onClick={() => selectReroll("VIDEO_START")}
              >
                Video start
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.08]"
                aria-label="Reroll video middle"
                onClick={() => selectReroll("EXTEND_MIDDLE")}
              >
                Video middle
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.08]"
                aria-label="Reroll video end"
                onClick={() => selectReroll("EXTEND_END")}
              >
                Video end
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lyrics Preview */}
      <div className="text-sm text-zinc-300">
        <p className="whitespace-pre-wrap">{lyricsPreview}</p>
      </div>

      {/* Image Prompt */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            Image Prompt
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="expand-image-prompt"
              onClick={() => setShowFullImagePrompt(!showFullImagePrompt)}
              className="text-zinc-500 hover:text-white text-xs"
            >
              {showFullImagePrompt ? "Show less" : "Show more"}
            </button>
            <button
              type="button"
              aria-label="Copy image prompt"
              onClick={() => handleCopyPrompt("image", scene.imagePrompt)}
              className="p-1 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded"
            >
              <CopyIcon active={copiedKey === "image"} />
            </button>
          </div>
        </div>
        <p
          data-testid="image-prompt"
          className="text-sm text-zinc-300 mt-1 font-prompt whitespace-pre-wrap"
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
          className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm transition-colors"
          aria-label="Video prompts"
          type="button"
        >
          {showVideoPrompts ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Video Prompts
        </button>
        {showVideoPrompts && (
          <div className="mt-2 space-y-2 pl-4 border-l border-white/[0.1]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Video Start</span>
                <button
                  type="button"
                  aria-label="Copy video start"
                  onClick={() => handleCopyPrompt("start", scene.videoStart)}
                  className="p-1 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded"
                >
                  <CopyIcon active={copiedKey === "start"} />
                </button>
              </div>
              <p className="text-sm text-zinc-300 font-prompt whitespace-pre-wrap">
                {scene.videoStart}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Video Middle</span>
                <button
                  type="button"
                  aria-label="Copy video middle"
                  onClick={() => handleCopyPrompt("middle", scene.videoMiddle)}
                  className="p-1 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded"
                >
                  <CopyIcon active={copiedKey === "middle"} />
                </button>
              </div>
              <p className="text-sm text-zinc-300 font-prompt whitespace-pre-wrap">
                {scene.videoMiddle}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Video End</span>
                <button
                  type="button"
                  aria-label="Copy video end"
                  onClick={() => handleCopyPrompt("end", scene.videoEnd)}
                  className="p-1 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded"
                >
                  <CopyIcon active={copiedKey === "end"} />
                </button>
              </div>
              <p className="text-sm text-zinc-300 font-prompt whitespace-pre-wrap">
                {scene.videoEnd}
              </p>
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
            <p className="text-zinc-300">
              {scene.boundaryFrames.start.description}
            </p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">End</span>
            <p className="text-zinc-300">
              {scene.boundaryFrames.end.description}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {scene.notes && (
        <div data-testid="scene-notes" className="bg-white/[0.04] rounded p-2">
          <span className="text-xs text-zinc-500">Notes</span>
          <p className="text-sm text-zinc-300">{scene.notes}</p>
        </div>
      )}

      {/* Reroll Confirmation */}
      {pendingReroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0a0b] rounded-xl p-6 max-w-sm border border-white/[0.1]">
            <p className="text-white mb-4">{confirmLabel}</p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelReroll}
                className="flex-1 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReroll}
                className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
                aria-label="Confirm"
                type="button"
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
