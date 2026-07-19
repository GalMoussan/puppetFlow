/**
 * Scene Diff Component
 *
 * Side-by-side comparison of two scenes with diff highlighting.
 *
 * @module components/library/SceneDiff
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Scene {
  index: number;
  lyrics: string;
  imagePrompt: string;
  startPrompt: string;
  middlePrompt: string;
  endPrompt: string;
  boundaryFrame1: string;
  boundaryFrame2: string;
  finalFrame: string;
}

interface DiffFlags {
  lyrics: boolean;
  imagePrompt: boolean;
  startPrompt: boolean;
  middlePrompt: boolean;
  endPrompt: boolean;
  boundaryFrame1: boolean;
  boundaryFrame2: boolean;
  finalFrame: boolean;
}

interface SceneDiffProps {
  sceneA: Scene | null;
  sceneB: Scene | null;
  diffs: DiffFlags;
  runALabel: string;
  runBLabel: string;
}

type FieldKey = keyof DiffFlags;

interface FieldConfig {
  key: FieldKey;
  label: string;
  color: string;
}

const FIELD_CONFIGS: FieldConfig[] = [
  { key: "lyrics", label: "Lyrics", color: "text-zinc-300" },
  { key: "imagePrompt", label: "IMAGE Prompt", color: "text-blue-400" },
  { key: "startPrompt", label: "VIDEO_START Prompt", color: "text-green-400" },
  { key: "boundaryFrame1", label: "Boundary Frame 1", color: "text-violet-400" },
  { key: "middlePrompt", label: "EXTEND_MIDDLE Prompt", color: "text-yellow-400" },
  { key: "boundaryFrame2", label: "Boundary Frame 2", color: "text-violet-400" },
  { key: "endPrompt", label: "EXTEND_END Prompt", color: "text-orange-400" },
  { key: "finalFrame", label: "Final Frame", color: "text-pink-400" },
];

function DiffSection({
  field,
  textA,
  textB,
  hasDiff,
}: {
  field: FieldConfig;
  textA: string | undefined;
  textB: string | undefined;
  hasDiff: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(hasDiff);

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
          hasDiff ? "bg-yellow-500/10" : "bg-zinc-800/50"
        } hover:bg-zinc-700/50`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
        <span className={`font-medium ${field.color}`}>{field.label}</span>
        {hasDiff && (
          <span className="ml-auto px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
            Different
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 divide-x divide-zinc-700">
          <div className="p-3 bg-zinc-900/50">
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
              {textA || <span className="text-zinc-500 italic">No content</span>}
            </pre>
          </div>
          <div className="p-3 bg-zinc-900/50">
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
              {textB || <span className="text-zinc-500 italic">No content</span>}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function SceneDiff({ sceneA, sceneB, diffs, runALabel, runBLabel }: SceneDiffProps) {
  // Handle missing scenes
  if (!sceneA && !sceneB) {
    return (
      <div className="text-center text-zinc-500 py-8">
        No scene data available for comparison
      </div>
    );
  }

  if (!sceneA) {
    return (
      <div className="text-center py-8">
        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded">
          Scene missing in {runALabel}
        </span>
      </div>
    );
  }

  if (!sceneB) {
    return (
      <div className="text-center py-8">
        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded">
          Scene missing in {runBLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm font-medium text-blue-400 px-3">{runALabel}</div>
        <div className="text-sm font-medium text-green-400 px-3">{runBLabel}</div>
      </div>

      {/* Diff sections */}
      {FIELD_CONFIGS.map((field) => (
        <DiffSection
          key={field.key}
          field={field}
          textA={sceneA[field.key]}
          textB={sceneB[field.key]}
          hasDiff={diffs[field.key]}
        />
      ))}
    </div>
  );
}
