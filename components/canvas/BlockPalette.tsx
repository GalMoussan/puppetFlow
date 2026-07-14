/**
 * Block Palette Component
 *
 * Left sidebar with draggable block library.
 * Blocks are grouped by type category and can be filtered via search.
 *
 * @module components/canvas/BlockPalette
 */

"use client";

import { useState, useMemo, useCallback, type DragEvent } from "react";
import { useShallow } from "zustand/shallow";
import { useBlockLibrary, groupBlocksByType, filterBlocksBySearch, type BlockDefinition } from "@/lib/hooks/useBlockLibrary";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { getTypeColor, BLOCK_GROUPS } from "@/lib/types/canvas";
import type { BlockNodeData } from "@/lib/types/canvas";
import { CreateBlockButton } from "./CreateBlockButton";

/**
 * Props for the BlockPalette component
 */
interface BlockPaletteProps {
  themePackId: string | null;
}

/**
 * Props for a single palette block
 */
interface PaletteBlockProps {
  block: BlockDefinition;
  onCanvasCount: number;
}

/**
 * Props for a block group
 */
interface BlockGroupProps {
  name: string;
  blocks: BlockDefinition[];
}

/**
 * Search input component
 */
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4">
      <input
        data-testid="palette-search"
        type="text"
        placeholder="Search blocks..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full px-3 py-2
          bg-neutral-800 border border-neutral-700 rounded-lg
          text-neutral-200 placeholder-neutral-500
          text-sm
          focus:outline-none focus:ring-2 focus:ring-violet-500
        "
      />
    </div>
  );
}

/**
 * Single draggable block in the palette
 */
function PaletteBlock({ block, onCanvasCount }: PaletteBlockProps) {
  const typeColor = getTypeColor(block.type);

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      // Set block ID for canvas drop handler
      e.dataTransfer.setData("application/puppetflow-block", block.id);

      // Set stageScope for lane validation
      e.dataTransfer.setData(
        "application/puppetflow-scope",
        JSON.stringify(block.stageScope)
      );

      // Set full block data for creating the node
      e.dataTransfer.setData(
        "application/puppetflow-blockdata",
        JSON.stringify({
          id: block.id,
          type: block.type,
          name: block.name,
          promptFragment: block.promptFragment,
          stageScope: block.stageScope,
          rotationGroup: block.rotationGroup,
        })
      );

      e.dataTransfer.effectAllowed = "copy";
    },
    [block]
  );

  return (
    <div
      data-testid={`palette-block-${block.id}`}
      draggable="true"
      onDragStart={handleDragStart}
      className={`
        relative
        p-2 mb-2
        ${typeColor}
        rounded-lg
        cursor-grab active:cursor-grabbing
        hover:ring-2 hover:ring-white/20
        transition-all
      `}
    >
      {/* Block name */}
      <div className="text-sm font-medium text-white truncate mb-1">
        {block.name}
      </div>

      {/* Valid lanes */}
      <div className="flex flex-wrap gap-1">
        {block.stageScope.map((lane) => (
          <span
            key={lane}
            className="
              px-1.5 py-0.5
              bg-black/20 rounded
              text-[10px] text-white/80
            "
          >
            {lane}
          </span>
        ))}
      </div>

      {/* On-canvas count indicator */}
      {onCanvasCount > 0 && (
        <div
          data-testid={`palette-block-indicator-${block.id}`}
          className="
            absolute -top-1 -right-1
            w-5 h-5
            bg-violet-500 rounded-full
            flex items-center justify-center
            text-[10px] font-bold text-white
          "
        >
          {onCanvasCount}
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible block group
 */
function BlockGroup({ name, blocks }: BlockGroupProps) {
  const [expanded, setExpanded] = useState(true);

  // Get block IDs for stable selector
  const blockIds = useMemo(() => blocks.map((b) => b.id), [blocks]);

  // Get on-canvas counts for each block using shallow comparison
  const onCanvasCounts = useCanvasStore(
    useShallow((state) => {
      const counts: Record<string, number> = {};
      for (const id of blockIds) {
        counts[id] = state.nodes.filter(
          (n) => n.type === "block" && (n.data as BlockNodeData).blockDefId === id
        ).length;
      }
      return counts;
    })
  );

  return (
    <div data-testid={`palette-group-${name}`} className="mb-4">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="
          w-full flex items-center justify-between
          px-2 py-1.5
          text-sm font-medium text-neutral-300
          hover:bg-neutral-800 rounded
          transition-colors
        "
      >
        <span>{name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Group blocks */}
      {expanded && (
        <div className="mt-2 pl-2">
          {blocks.map((block) => (
            <PaletteBlock
              key={block.id}
              block={block}
              onCanvasCount={onCanvasCounts[block.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Block palette sidebar component
 */
export function BlockPalette({ themePackId }: BlockPaletteProps) {
  const { blocks, loading, error, refetch } = useBlockLibrary(themePackId);
  const [search, setSearch] = useState("");
  /** Optimistic prepend after create until refetch completes */
  const [optimisticBlocks, setOptimisticBlocks] = useState<BlockDefinition[]>(
    []
  );

  // Derive list without an effect: drop optimistic rows once server has them
  const effectiveBlocks = useMemo(() => {
    if (optimisticBlocks.length === 0) return blocks;
    const ids = new Set(blocks.map((b) => b.id));
    const stillPending = optimisticBlocks.filter((b) => !ids.has(b.id));
    return stillPending.length === 0
      ? blocks
      : [...stillPending, ...blocks];
  }, [blocks, optimisticBlocks]);

  const handleBlockCreated = useCallback(
    (raw: {
      id: string;
      name: string;
      type: BlockDefinition["type"];
      promptFragment: string;
      stageScope: BlockDefinition["stageScope"];
      rotationGroup?: string;
      themePackId?: string;
      archived?: boolean;
      createdAt?: string | Date;
      updatedAt?: string | Date;
    }) => {
      const now = new Date();
      const created: BlockDefinition = {
        id: raw.id,
        name: raw.name,
        type: raw.type,
        promptFragment: raw.promptFragment,
        stageScope: raw.stageScope ?? [],
        rotationGroup: raw.rotationGroup,
        themePackId: raw.themePackId ?? themePackId ?? "",
        archived: raw.archived ?? false,
        createdAt: raw.createdAt ? new Date(raw.createdAt) : now,
        updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : now,
      };
      setOptimisticBlocks((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
      // Persist-backed refresh; optimistic row remains until server list includes it
      void refetch().then(() => {
        // Clear optimistics that are now on the server (async, not in effect)
        setOptimisticBlocks((prev) =>
          prev.filter((ob) => ob.id !== created.id)
        );
      });
    },
    [refetch, themePackId]
  );

  // Filter and group blocks
  const groupedBlocks = useMemo(() => {
    const filtered = filterBlocksBySearch(effectiveBlocks, search);
    return groupBlocksByType(filtered);
  }, [effectiveBlocks, search]);

  // No theme pack selected
  if (!themePackId) {
    return (
      <aside
        className="w-64 bg-neutral-900 border-r border-neutral-800 p-4"
        data-testid="palette-no-theme"
      >
        <h2 className="text-lg font-semibold text-neutral-200 mb-4">
          Block Library
        </h2>
        <div className="flex flex-col items-center text-center gap-2 mt-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
            <span className="text-neutral-500 text-lg" aria-hidden>
              ∅
            </span>
          </div>
          <p className="text-sm text-neutral-400">No theme pack loaded</p>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Bootstrap a template or theme pack to browse and drag blocks onto
            the canvas.
          </p>
        </div>
      </aside>
    );
  }

  // Loading state
  if (loading) {
    return (
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 p-4">
        <h2 className="text-lg font-semibold text-neutral-200 mb-4">
          Block Library
        </h2>
        <div
          data-testid="palette-loading"
          className="flex flex-col items-center gap-2 text-center text-neutral-500 text-sm mt-8"
        >
          <div className="w-6 h-6 border-2 border-violet-500/40 border-t-violet-400 rounded-full animate-spin" />
          <p>Loading blocks…</p>
        </div>
      </aside>
    );
  }

  // Error state
  if (error) {
    return (
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 p-4">
        <h2 className="text-lg font-semibold text-neutral-200 mb-4">
          Block Library
        </h2>
        <div
          className="text-center text-red-400 text-sm mt-8 space-y-2"
          data-testid="palette-error"
        >
          <p>Failed to load blocks</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs text-violet-400 hover:text-violet-300 underline"
          >
            Retry
          </button>
        </div>
      </aside>
    );
  }

  // Group names in display order
  const groupOrder = Object.keys(BLOCK_GROUPS) as (keyof typeof BLOCK_GROUPS)[];

  // Check if search found anything
  const hasResults = groupedBlocks.size > 0;

  return (
    <aside className="w-64 bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-neutral-200">
          Block Library
        </h2>
      </div>

      <div className="mb-3">
        <CreateBlockButton onCreated={handleBlockCreated} />
      </div>

      <SearchInput value={search} onChange={setSearch} />

      <div className="flex-1 overflow-y-auto">
        {!hasResults && search && (
          <div className="text-center text-neutral-500 text-sm mt-4">
            No blocks found matching &quot;{search}&quot;
          </div>
        )}

        {groupOrder.map((groupName) => {
          const groupBlocks = groupedBlocks.get(groupName);
          if (!groupBlocks || groupBlocks.length === 0) return null;

          return (
            <BlockGroup
              key={groupName}
              name={groupName}
              blocks={groupBlocks}
            />
          );
        })}

        {!hasResults && !search && effectiveBlocks.length === 0 && (
          <div className="text-center text-neutral-500 text-sm mt-4 space-y-2">
            <p>No blocks in this theme pack yet.</p>
            <p className="text-xs">Use Create Block above to add one.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default BlockPalette;
