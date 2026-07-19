/**
 * Preset Picker Component
 *
 * Modal for selecting a template preset when creating a new template.
 *
 * @module components/presets/PresetPicker
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Loader2, Sparkles, FileText } from "lucide-react";
import { PresetCard, type PresetCardData } from "./PresetCard";
import { CategoryTabs, type CategoryFilter } from "./CategoryTabs";

// =============================================================================
// Types
// =============================================================================

interface PresetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (presetId: string | null, presetName: string | null) => void;
}

// =============================================================================
// Component
// =============================================================================

export function PresetPicker({ isOpen, onClose, onSelect }: PresetPickerProps) {
  const [presets, setPresets] = useState<PresetCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  // Fetch presets
  const fetchPresets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/presets");
      if (!response.ok) {
        throw new Error("Failed to load presets");
      }

      const data = await response.json();
      setPresets(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load presets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Fetch fresh presets when modal opens - intentional sync state reset
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchPresets();
      setSelectedId(null);
      setActiveCategory("all");
    }
  }, [isOpen, fetchPresets]);

  // Filter presets by category
  const filteredPresets = presets.filter((preset) => {
    if (activeCategory === "all") return true;
    return preset.category.toLowerCase() === activeCategory;
  });

  // Calculate counts per category
  const categoryCounts = presets.reduce((acc, preset) => {
    const cat = preset.category.toUpperCase();
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Handle selection
  const handleSelect = (presetId: string) => {
    setSelectedId(presetId === selectedId ? null : presetId);
  };

  // Handle confirm
  const handleConfirm = () => {
    const preset = presets.find((p) => p.id === selectedId);
    onSelect(selectedId, preset?.name ?? null);
  };

  // Handle blank template
  const handleBlankTemplate = () => {
    onSelect(null, null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0b] rounded-xl border border-white/[0.08] w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Choose a Template</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-3 border-b border-white/[0.08]">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            counts={categoryCounts}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
              <p className="text-sm">Loading presets...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-red-400">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={() => void fetchPresets()}
                className="mt-3 px-4 py-2 bg-white/[0.05] rounded-lg text-sm hover:bg-white/[0.1] transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Blank template option */}
              <button
                type="button"
                onClick={handleBlankTemplate}
                className={`
                  relative w-full text-left p-4 rounded-xl border-2 border-dashed transition-all
                  border-white/[0.15] bg-white/[0.02] hover:border-white/[0.25] hover:bg-white/[0.04]
                `}
              >
                <div className="flex items-center gap-2 text-zinc-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Blank</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white">
                  Start from Scratch
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Empty canvas with default settings
                </p>
              </button>

              {/* Preset cards */}
              {filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedId === preset.id}
                  onSelect={() => handleSelect(preset.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
          <p className="text-xs text-zinc-500">
            {selectedId
              ? `Selected: ${presets.find((p) => p.id === selectedId)?.name}`
              : "Select a preset or start blank"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedId}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${selectedId
                  ? "bg-cyan-500 text-black hover:bg-cyan-400"
                  : "bg-white/[0.05] text-zinc-500 cursor-not-allowed"
                }
              `}
            >
              Use Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
