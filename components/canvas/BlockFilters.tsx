/**
 * Block Filters Component
 *
 * Filter controls for block type, rotation group, and archived status.
 *
 * @module components/canvas/BlockFilters
 */

"use client";

import { BlockTypeSchema, type BlockType } from "@/packages/domain/types";

export interface FilterState {
  type: BlockType | null;
  rotationGroup: string | null;
  archived: boolean;
}

interface BlockFiltersProps {
  filters: FilterState;
  onUpdateFilters: (filters: FilterState) => void;
}

const BLOCK_TYPES = BlockTypeSchema.options;

export function BlockFilters({ filters, onUpdateFilters }: BlockFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-zinc-800/50 rounded-lg">
      {/* Block Type */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">Type</label>
        <select
          value={filters.type || ""}
          onChange={(e) =>
            onUpdateFilters({
              ...filters,
              type: e.target.value ? (e.target.value as BlockType) : null,
            })
          }
          className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
        >
          <option value="">All types</option>
          {BLOCK_TYPES.map((type) => (
            <option key={type} value={type}>
              {formatBlockType(type)}
            </option>
          ))}
        </select>
      </div>

      {/* Rotation Group */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">Group</label>
        <input
          type="text"
          value={filters.rotationGroup || ""}
          onChange={(e) =>
            onUpdateFilters({
              ...filters,
              rotationGroup: e.target.value || null,
            })
          }
          placeholder="Any"
          className="w-32 px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Archived Toggle */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">Show</label>
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => onUpdateFilters({ ...filters, archived: false })}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              !filters.archived
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => onUpdateFilters({ ...filters, archived: true })}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filters.archived
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.type || filters.rotationGroup || filters.archived) && (
        <button
          onClick={() =>
            onUpdateFilters({ type: null, rotationGroup: null, archived: false })
          }
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function formatBlockType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
