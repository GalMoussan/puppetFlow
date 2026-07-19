/**
 * Category Tabs Component
 *
 * Tab bar for filtering presets by category.
 *
 * @module components/presets/CategoryTabs
 */

"use client";

// =============================================================================
// Types
// =============================================================================

export type CategoryFilter = "all" | "festival" | "brainrot" | "educational" | "dance" | "narrative" | "experimental";

interface CategoryTabsProps {
  activeCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  counts?: Record<string, number>;
}

// =============================================================================
// Tab Definitions
// =============================================================================

const TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "festival", label: "Festival" },
  { value: "brainrot", label: "Brainrot" },
  { value: "educational", label: "Educational" },
  { value: "dance", label: "Dance" },
  { value: "narrative", label: "Story" },
  { value: "experimental", label: "Experimental" },
];

// =============================================================================
// Component
// =============================================================================

export function CategoryTabs({ activeCategory, onCategoryChange, counts }: CategoryTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Preset categories">
      {TABS.map((tab) => {
        const isActive = activeCategory === tab.value;
        const count = tab.value === "all"
          ? Object.values(counts ?? {}).reduce((a, b) => a + b, 0)
          : counts?.[tab.value.toUpperCase()] ?? 0;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onCategoryChange(tab.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              whitespace-nowrap transition-all shrink-0
              ${isActive
                ? "bg-cyan-500 text-black"
                : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]"
              }
            `}
          >
            {tab.label}
            {counts && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? "bg-black/20 text-black" : "bg-white/[0.08] text-zinc-500"}
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
