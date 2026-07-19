/**
 * Block Library Hook
 *
 * Hook for fetching block definitions by theme pack.
 *
 * @module lib/hooks/useBlockLibrary
 */

import { useState, useEffect, useCallback } from "react";
import type { Lane, BlockType } from "@/packages/domain/types";

/**
 * Block definition structure from API
 */
export interface BlockDefinition {
  id: string;
  type: BlockType;
  name: string;
  promptFragment: string;
  stageScope: Lane[];
  rotationGroup?: string;
  themePackId: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Hook return type
 */
interface UseBlockLibraryReturn {
  blocks: BlockDefinition[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function mapBlocks(fetchedBlocks: BlockDefinition[]): BlockDefinition[] {
  return fetchedBlocks
    .filter((b) => !b.archived)
    .map((b) => ({
      ...b,
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
    }));
}

/**
 * Hook for fetching block definitions by theme pack
 *
 * @param themePackId - Theme pack ID to fetch blocks for, or null
 * @returns Object with blocks array, loading state, and error
 */
export function useBlockLibrary(
  themePackId: string | null
): UseBlockLibraryReturn {
  const [blocks, setBlocks] = useState<BlockDefinition[]>([]);
  const [loading, setLoading] = useState(Boolean(themePackId));
  const [error, setError] = useState<Error | null>(null);

  const fetchBlocks = useCallback(async () => {
    if (!themePackId) {
      setBlocks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // High limit — library must show all seed + user blocks for the pack
      const response = await fetch(
        `/api/blocks?themePackId=${encodeURIComponent(themePackId)}&limit=200&archived=false`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.status}`);
      }

      const data = await response.json();
      const fetchedBlocks = (data.data || data) as BlockDefinition[];
      setBlocks(mapBlocks(fetchedBlocks));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [themePackId]);

  // Fetch when themePackId changes — defer setState past the effect body
  useEffect(() => {
    if (!themePackId) {
      // Defer so we don't sync-setState inside the effect body (lint rule)
      const t = setTimeout(() => {
        setBlocks([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(
            `/api/blocks?themePackId=${encodeURIComponent(themePackId)}&limit=200&archived=false`
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch blocks: ${response.status}`);
          }
          const data = await response.json();
          const fetchedBlocks = (data.data || data) as BlockDefinition[];
          if (!cancelled) {
            setBlocks(mapBlocks(fetchedBlocks));
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err : new Error("Unknown error"));
            setBlocks([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [themePackId]);

  return {
    blocks,
    loading,
    error,
    refetch: fetchBlocks,
  };
}

/**
 * Group blocks by their type category
 */
export function groupBlocksByType(
  blocks: BlockDefinition[]
): Map<string, BlockDefinition[]> {
  const groups = new Map<string, BlockDefinition[]>();

  const BLOCK_GROUPS: Record<string, BlockType[]> = {
    "Theme & Style": ["THEME_PACK_REF", "STYLE_LOCK", "CHARACTER_LOCK"],
    "Scene Elements": ["PUPPET_VISUAL", "STAGE_AREA", "FESTIVAL_MOMENT"],
    Actions: ["CAMERA_MOVE", "PUPPET_DYNAMIC", "PHYSICAL_GAG"],
    Narrative: ["HOOK", "CHAOS_THREAD", "PAYOFF", "STORY_BEAT"],
    "Effects & Audio": ["GLITCH_EFFECT", "SOUND_CUE", "TEXT_OVERLAY"],
    "Performance": ["CHOREO_BEAT", "EMOTION_MARKER", "EXPLAINER_VISUAL"],
    Configuration: ["SONG_SECTION", "LANGUAGE", "LOOP_CLOSURE", "CUSTOM"],
  };

  for (const [groupName, types] of Object.entries(BLOCK_GROUPS)) {
    const groupBlocks = blocks.filter((b) => types.includes(b.type));
    if (groupBlocks.length > 0) {
      groups.set(groupName, groupBlocks);
    }
  }

  return groups;
}

/**
 * Filter blocks by search query
 */
export function filterBlocksBySearch(
  blocks: BlockDefinition[],
  search: string
): BlockDefinition[] {
  if (!search.trim()) {
    return blocks;
  }

  const query = search.toLowerCase();
  return blocks.filter(
    (block) =>
      block.name.toLowerCase().includes(query) ||
      block.promptFragment.toLowerCase().includes(query) ||
      block.type.toLowerCase().includes(query)
  );
}
