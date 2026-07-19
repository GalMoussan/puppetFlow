/**
 * Canon Pool Editor Component
 *
 * Editable tag lists for each axis of the variety engine.
 *
 * @module components/theme-pack/CanonPoolEditor
 */

"use client";

import { useState } from "react";
import { Plus, X, Video } from "lucide-react";
import { type FullCanon, CANON_POOL_KEYS, type CanonPoolKey } from "@/packages/domain/types";

interface CanonPoolEditorProps {
  canon: FullCanon;
  onUpdatePool: (key: string, values: string[]) => void;
  onUpdateCameraMoves: (stage: "start" | "middle" | "end", values: string[]) => void;
}

const POOL_LABELS: Record<CanonPoolKey, { label: string; description: string }> = {
  stageAreas: {
    label: "Stage Areas",
    description: "Festival locations and stage areas",
  },
  festivalMoments: {
    label: "Festival Moments",
    description: "Time-based moments during the festival",
  },
  dynamics: {
    label: "Puppet Dynamics",
    description: "Interaction dynamics between puppets",
  },
  visuals: {
    label: "Puppet Visuals",
    description: "Visual styles and appearances",
  },
  hooks: {
    label: "Opening Hooks",
    description: "Scene opening hook types",
  },
  gags: {
    label: "Physical Gags",
    description: "Comedy beats and physical gags",
  },
  payoffs: {
    label: "Payoffs",
    description: "Climax and payoff types",
  },
  chaosThreads: {
    label: "Chaos Threads",
    description: "Recurring chaos elements",
  },
  subgenres: {
    label: "Music Subgenres",
    description: "Metal subgenres for variety",
  },
  languages: {
    label: "Languages",
    description: "Language codes (en, hi, ja)",
  },
};

const CAMERA_STAGES: Array<{ key: "start" | "middle" | "end"; label: string }> = [
  { key: "start", label: "VIDEO_START" },
  { key: "middle", label: "EXTEND_MIDDLE" },
  { key: "end", label: "EXTEND_END" },
];

export function CanonPoolEditor({ canon, onUpdatePool, onUpdateCameraMoves }: CanonPoolEditorProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CANON_POOL_KEYS.map((key) => {
          const config = POOL_LABELS[key];
          const values = canon[key] as string[];
          return (
            <PoolCard
              key={key}
              poolKey={key}
              label={config.label}
              description={config.description}
              values={values}
              onUpdate={(newValues) => onUpdatePool(key, newValues)}
            />
          );
        })}
      </div>

      {/* Camera Moves Section */}
      <div className="border-t border-zinc-800 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Camera Moves</h2>
        </div>
        <p className="text-sm text-zinc-500 mb-6">
          Camera moves per video stage. Each stage has its own pool for variety.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CAMERA_STAGES.map(({ key, label }) => (
            <PoolCard
              key={key}
              poolKey={key}
              label={label}
              description={`Camera moves for ${label}`}
              values={canon.cameraMoves[key]}
              onUpdate={(newValues) => onUpdateCameraMoves(key, newValues)}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PoolCard({
  poolKey: _poolKey,
  label,
  description,
  values,
  onUpdate,
  compact = false,
}: {
  poolKey: string;
  label: string;
  description: string;
  values: string[];
  onUpdate: (values: string[]) => void;
  compact?: boolean;
}) {
  const [newValue, setNewValue] = useState("");

  const addValue = () => {
    const trimmed = newValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onUpdate([...values, trimmed]);
      setNewValue("");
    }
  };

  const removeValue = (index: number) => {
    onUpdate(values.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue();
    }
  };

  return (
    <div className={`bg-zinc-900/50 rounded-lg border border-zinc-800 ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-3">
        <h3 className={`font-medium text-zinc-200 ${compact ? "text-sm" : ""}`}>{label}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add new..."
          className="flex-1 px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={addValue}
          disabled={!newValue.trim()}
          className="p-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {values.length === 0 ? (
          <span className="text-xs text-zinc-600 italic">No items yet</span>
        ) : (
          values.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 group"
            >
              <span>{value}</span>
              <button
                onClick={() => removeValue(index)}
                className="opacity-50 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Count */}
      <div className="mt-3 text-xs text-zinc-500">
        {values.length} item{values.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
