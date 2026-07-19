/**
 * Block Library Manager Component
 *
 * Full-featured modal for managing blocks with filtering and bulk actions.
 *
 * @module components/canvas/BlockLibraryManager
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Filter } from "lucide-react";
import { BlockFilters, type FilterState } from "./BlockFilters";
import { BulkActionBar } from "./BulkActionBar";
import { type BlockType } from "@/packages/domain/types";

interface Block {
  id: string;
  type: BlockType;
  name: string;
  promptFragment: string;
  stageScope: string[];
  rotationGroup: string | null;
  archived: boolean;
  themePackId: string;
}

interface BlockLibraryManagerProps {
  themePackId: string;
  onClose: () => void;
}

export function BlockLibraryManager({ themePackId, onClose }: BlockLibraryManagerProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: null,
    rotationGroup: null,
    archived: false,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch blocks
  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("themePackId", themePackId);
      if (filters.type) params.set("type", filters.type);
      if (filters.rotationGroup) params.set("rotationGroup", filters.rotationGroup);
      params.set("archived", String(filters.archived));

      const response = await fetch(`/api/blocks?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch blocks");
      }

      const data = await response.json();
      setBlocks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [themePackId, filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBlocks();
  }, [fetchBlocks]);

  // Filter by search query
  const filteredBlocks = blocks.filter((block) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      block.name.toLowerCase().includes(query) ||
      block.promptFragment.toLowerCase().includes(query) ||
      block.type.toLowerCase().includes(query)
    );
  });

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredBlocks.map((b) => b.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk action handler
  const handleBulkAction = async (action: "archive" | "restore" | "delete") => {
    if (selectedIds.size === 0) return;

    const confirmMessage =
      action === "delete"
        ? `Are you sure you want to delete ${selectedIds.size} block(s)? This cannot be undone.`
        : `${action === "archive" ? "Archive" : "Restore"} ${selectedIds.size} block(s)?`;

    if (!confirm(confirmMessage)) return;

    setActionLoading(true);

    try {
      const response = await fetch("/api/blocks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Action failed");
      }

      // Clear selection and refresh
      setSelectedIds(new Set());
      await fetchBlocks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">Block Library</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-zinc-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blocks..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters || filters.type || filters.rotationGroup || filters.archived
                  ? "bg-violet-600/20 border-violet-500/50 text-violet-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <BlockFilters filters={filters} onUpdateFilters={setFilters} />
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            totalCount={filteredBlocks.length}
            showArchived={filters.archived}
            loading={actionLoading}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onArchive={() => handleBulkAction("archive")}
            onRestore={() => handleBulkAction("restore")}
            onDelete={() => handleBulkAction("delete")}
          />
        )}

        {/* Block List */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : filteredBlocks.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              {blocks.length === 0
                ? "No blocks in this theme pack"
                : "No blocks match your search"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBlocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  selected={selectedIds.has(block.id)}
                  onToggle={() => toggleSelect(block.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 text-xs text-zinc-500">
          {filteredBlocks.length} block{filteredBlocks.length !== 1 ? "s" : ""}{" "}
          {filters.archived ? "(archived)" : "(active)"}
        </div>
      </div>
    </div>
  );
}

function BlockRow({
  block,
  selected,
  onToggle,
}: {
  block: Block;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
        selected
          ? "bg-violet-600/10 border-violet-500/50"
          : "bg-zinc-800/50 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-zinc-900"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-200 truncate">{block.name}</span>
          <span className="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
            {block.type}
          </span>
          {block.archived && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
              Archived
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 truncate mt-0.5">{block.promptFragment}</p>
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-500">
        {block.stageScope.map((scope) => (
          <span key={scope} className="px-1.5 py-0.5 bg-zinc-800 rounded">
            {scope}
          </span>
        ))}
      </div>
    </div>
  );
}
