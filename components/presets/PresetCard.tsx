/**
 * Preset Card Component
 *
 * Displays a single template preset with category badge and selection state.
 *
 * @module components/presets/PresetCard
 */

"use client";

import { Check } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface PresetCardData {
  id: string;
  name: string;
  description: string;
  category: string;
  guidelines?: string[];
  isSystem?: boolean;
}

interface PresetCardProps {
  preset: PresetCardData;
  selected: boolean;
  onSelect: () => void;
}

// =============================================================================
// Category Styling
// =============================================================================

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  FESTIVAL: { bg: "bg-violet-500/20", text: "text-violet-400", label: "Festival" },
  BRAINROT: { bg: "bg-fuchsia-500/20", text: "text-fuchsia-400", label: "Brainrot" },
  EDUCATIONAL: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Educational" },
  DANCE: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Dance" },
  NARRATIVE: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Story" },
  EXPERIMENTAL: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Experimental" },
};

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category.toUpperCase()] ?? CATEGORY_STYLES.FESTIVAL;
}

// =============================================================================
// Component
// =============================================================================

export function PresetCard({ preset, selected, onSelect }: PresetCardProps) {
  const categoryStyle = getCategoryStyle(preset.category);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative w-full text-left p-4 rounded-xl border-2 transition-all
        ${selected
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
        }
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-black" />
        </div>
      )}

      {/* Category badge */}
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
        {categoryStyle.label}
      </span>

      {/* Name */}
      <h3 className="mt-2 text-sm font-semibold text-white">
        {preset.name}
      </h3>

      {/* Description */}
      <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
        {preset.description}
      </p>

      {/* Guidelines preview */}
      {preset.guidelines && preset.guidelines.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
            Guidelines
          </p>
          <ul className="space-y-0.5">
            {preset.guidelines.slice(0, 2).map((guideline, i) => (
              <li key={i} className="text-xs text-zinc-500 truncate">
                {guideline}
              </li>
            ))}
            {preset.guidelines.length > 2 && (
              <li className="text-xs text-zinc-600">
                +{preset.guidelines.length - 2} more
              </li>
            )}
          </ul>
        </div>
      )}
    </button>
  );
}
