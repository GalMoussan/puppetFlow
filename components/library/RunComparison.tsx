/**
 * Run Comparison Component
 *
 * Side-by-side comparison of two runs with scene-level diff highlighting.
 *
 * @module components/library/RunComparison
 */

"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { SceneDiff } from "./SceneDiff";

interface SceneData {
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

interface ComparisonData {
  runA: {
    id: string;
    createdAt: string;
    templateName: string;
    sceneCount: number;
  };
  runB: {
    id: string;
    createdAt: string;
    templateName: string;
    sceneCount: number;
  };
  scenes: Array<{
    index: number;
    a: SceneData | null;
    b: SceneData | null;
    differences: Array<{
      field: string;
      hasChange: boolean;
    }>;
  }>;
  summary: {
    totalScenes: number;
    changedScenes: number;
    addedScenes: number;
    removedScenes: number;
  };
}

interface RunComparisonProps {
  runIdA: string;
  runIdB: string;
  onClose: () => void;
}

export function RunComparison({ runIdA, runIdB, onClose }: RunComparisonProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  useEffect(() => {
    async function fetchComparison() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/runs/compare?runA=${runIdA}&runB=${runIdB}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to compare runs");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [runIdA, runIdB]);

  const currentScene = data?.scenes[currentSceneIndex];
  const totalScenes = data?.scenes.length || 0;

  // Convert differences array to DiffFlags object for SceneDiff component
  const diffsToFlags = (differences: Array<{ field: string; hasChange: boolean }>): DiffFlags => {
    const flags: DiffFlags = {
      lyrics: false,
      imagePrompt: false,
      startPrompt: false,
      middlePrompt: false,
      endPrompt: false,
      boundaryFrame1: false,
      boundaryFrame2: false,
      finalFrame: false,
    };
    for (const diff of differences) {
      if (diff.field in flags) {
        flags[diff.field as keyof DiffFlags] = diff.hasChange;
      }
    }
    return flags;
  };

  const hasDiffs = currentScene
    ? currentScene.differences.some((d) => d.hasChange)
    : false;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-zinc-100">Run Comparison</h2>
            {data && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                  {data.runA.templateName}
                </span>
                <span>vs</span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                  {data.runB.templateName}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {data && currentScene && (
            <div className="h-full flex flex-col">
              {/* Scene navigation */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
                <button
                  onClick={() => setCurrentSceneIndex((i) => Math.max(0, i - 1))}
                  disabled={currentSceneIndex === 0}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-zinc-200 font-medium">
                    Scene {currentSceneIndex + 1} of {totalScenes}
                  </span>
                  {hasDiffs ? (
                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                      Has differences
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
                      Identical
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setCurrentSceneIndex((i) => Math.min(totalScenes - 1, i + 1))}
                  disabled={currentSceneIndex === totalScenes - 1}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Scene diff content */}
              <div className="flex-1 overflow-auto p-4">
                <SceneDiff
                  sceneA={currentScene.a}
                  sceneB={currentScene.b}
                  diffs={diffsToFlags(currentScene.differences)}
                  runALabel={`Run A (${new Date(data.runA.createdAt).toLocaleDateString()})`}
                  runBLabel={`Run B (${new Date(data.runB.createdAt).toLocaleDateString()})`}
                />
              </div>

              {/* Scene picker dots */}
              <div className="flex items-center justify-center gap-2 p-3 border-t border-zinc-700">
                {data.scenes.map((scene, index) => {
                  const sceneDiffs = scene.differences.some((d) => d.hasChange);
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentSceneIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentSceneIndex
                          ? "bg-violet-500 scale-125"
                          : sceneDiffs
                          ? "bg-yellow-500/50 hover:bg-yellow-500"
                          : "bg-zinc-600 hover:bg-zinc-500"
                      }`}
                      title={`Scene ${index + 1}${sceneDiffs ? " (has differences)" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
