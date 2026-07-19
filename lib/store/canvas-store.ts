/**
 * Canvas Store (Zustand)
 *
 * Central state management for the React Flow canvas.
 * Manages nodes, edges, selection, and template persistence.
 *
 * @module lib/store/canvas-store
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeChange,
  EdgeChange,
  Connection,
} from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type { Lane, BlockType } from "@/packages/domain/types";
import {
  LANE_ORDER,
  createLaneNodes,
  type BlockNodeData,
  type LaneNodeData,
  type SaveState,
} from "@/lib/types/canvas";

// =============================================================================
// Types
// =============================================================================

/**
 * Block definition from API or fixtures
 */
interface BlockDefinition {
  id: string;
  type: BlockType;
  name: string;
  promptFragment: string;
  stageScope: Lane[];
  rotationGroup?: string;
}

/**
 * Run configuration
 */
interface RunConfig {
  loopMode: boolean;
  languages: { hi: number; ja: number };
  batchSize: number;
}

/**
 * Canvas store state
 * Also exported as CanvasStore for backwards compatibility
 */
export interface CanvasState {
  // Core graph state
  nodes: Node<BlockNodeData | LaneNodeData>[];
  edges: Edge[];

  // Selection
  selectedId: string | null;

  // Template
  templateId: string | null;
  templateName: string | null;
  themePackId: string | null;
  currentVersion: number;
  isDirty: boolean;
  saveState: SaveState;

  // Template-level run config (saved with graph; execution state lives in useRunStore)
  runConfig: RunConfig;

  // Actions
  setNodes: (nodes: Node<BlockNodeData | LaneNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange<Node<BlockNodeData | LaneNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addBlock: (blockDef: BlockDefinition, lane: Lane, order: number) => void;
  removeBlock: (nodeId: string) => void;
  updateBlockOverride: (nodeId: string, fragment: string | undefined) => void;
  togglePin: (nodeId: string) => void;

  selectNode: (nodeId: string | null) => void;

  loadTemplate: (templateId: string) => Promise<void>;
  saveTemplate: () => Promise<void>;

  setThemePackId: (themePackId: string | null) => void;
  setRunConfig: (config: Partial<RunConfig>) => void;
}

/**
 * Generate a unique node ID
 */
function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// Store
// =============================================================================

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    selectedId: null,
    templateId: null,
    templateName: null,
    themePackId: null,
    currentVersion: 1,
    isDirty: false,
    saveState: "idle",
    runConfig: {
      loopMode: true,
      languages: { hi: 3, ja: 2 },
      batchSize: 5,
    },

    // ===========================================================================
    // Node/Edge Setters
    // ===========================================================================

    setNodes: (nodes) => {
      set({ nodes, isDirty: true });
    },

    setEdges: (edges) => {
      set({ edges, isDirty: true });
    },

    onNodesChange: (changes: NodeChange<Node<BlockNodeData | LaneNodeData>>[]) => {
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
      }));
    },

    onEdgesChange: (changes: EdgeChange[]) => {
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
      }));
    },

    onConnect: (connection: Connection) => {
      set((state) => ({
        edges: addEdge(connection, state.edges),
        isDirty: true,
      }));
    },

    // ===========================================================================
    // Block Operations
    // ===========================================================================

    addBlock: (blockDef, lane, order) => {
      const nodeId = generateNodeId();
      const scope = blockDef.stageScope ?? [];
      const isValid = scope.includes(lane);

      const newNode: Node<BlockNodeData> = {
        id: nodeId,
        type: "block",
        parentId: lane,
        extent: "parent",
        position: { x: 10, y: order * 100 + 40 },
        data: {
          blockDefId: blockDef.id,
          name: blockDef.name,
          type: blockDef.type,
          fragment: blockDef.promptFragment,
          stageScope: scope,
          pinned: false,
          valid: isValid,
          order,
        },
        draggable: true,
        selectable: true,
      };

      set((state) => ({
        nodes: [...state.nodes, newNode],
        isDirty: true,
      }));
    },

    removeBlock: (nodeId) => {
      set((state) => {
        const newNodes = state.nodes.filter((n) => n.id !== nodeId);
        const newSelectedId = state.selectedId === nodeId ? null : state.selectedId;

        return {
          nodes: newNodes,
          selectedId: newSelectedId,
          isDirty: newNodes.length !== state.nodes.length ? true : state.isDirty,
        };
      });
    },

    updateBlockOverride: (nodeId, fragment) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId && node.type === "block"
            ? {
                ...node,
                data: {
                  ...node.data,
                  override: fragment,
                } as BlockNodeData,
              }
            : node
        ),
        isDirty: true,
      }));
    },

    togglePin: (nodeId) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId && node.type === "block"
            ? {
                ...node,
                data: {
                  ...(node.data as BlockNodeData),
                  pinned: !(node.data as BlockNodeData).pinned,
                } as BlockNodeData,
              }
            : node
        ),
        isDirty: true,
      }));
    },

    // ===========================================================================
    // Selection
    // ===========================================================================

    selectNode: (nodeId) => {
      set({ selectedId: nodeId });
    },

    // ===========================================================================
    // Template Operations
    // ===========================================================================

    loadTemplate: async (templateId) => {
      const response = await fetch(`/api/templates/${templateId}`);

      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }

      const data = await response.json();
      const template = data.data || data;
      const themePackId: string | null = template.themePackId ?? null;
      const graphNodes: Array<{
        id: string;
        blockDefId: string;
        lane: Lane;
        order: number;
        pinned?: boolean;
        overrides?: { promptFragment?: string };
      }> = template.graph?.nodes ?? [];

      // Hydrate blockDefs so nodes never stay as "Loading..." placeholders
      const defById = new Map<
        string,
        {
          id: string;
          name: string;
          type: BlockType;
          promptFragment: string;
          stageScope: Lane[];
        }
      >();

      if (themePackId) {
        try {
          const blocksRes = await fetch(
            `/api/blocks?themePackId=${encodeURIComponent(themePackId)}&limit=200&archived=false`
          );
          if (blocksRes.ok) {
            const blocksJson = (await blocksRes.json()) as {
              data?: Array<{
                id: string;
                name: string;
                type: BlockType;
                promptFragment: string;
                stageScope: Lane[];
              }>;
            };
            for (const b of blocksJson.data ?? []) {
              defById.set(b.id, b);
            }
          }
        } catch {
          // Graph still loads; missing defs show a clear fallback name
        }
      }

      const laneNodes = createLaneNodes();

      const blockNodes: Node<BlockNodeData>[] = graphNodes.map((node) => {
        const def = defById.get(node.blockDefId);
        const stageScope = def?.stageScope?.length
          ? def.stageScope
          : ([node.lane] as Lane[]);
        return {
          id: node.id,
          type: "block",
          parentId: node.lane,
          extent: "parent" as const,
          position: { x: 10, y: node.order * 100 + 40 },
          data: {
            blockDefId: node.blockDefId,
            name: def?.name ?? `Missing block (${node.blockDefId.slice(0, 8)})`,
            type: def?.type ?? ("CUSTOM" as BlockType),
            fragment: def?.promptFragment ?? "",
            stageScope,
            pinned: node.pinned ?? false,
            valid: def ? stageScope.includes(node.lane) : false,
            override: node.overrides?.promptFragment,
            order: node.order,
          },
          draggable: true,
          selectable: true,
        };
      });

      set({
        nodes: [...laneNodes, ...blockNodes],
        // Domain handshakes in graph JSON must NOT become RF edges (no Handles on lanes)
        edges: [],
        templateId: template.id,
        templateName: template.name,
        themePackId,
        currentVersion: template.currentVersion ?? 1,
        isDirty: false,
        saveState: "idle",
        selectedId: null,
        runConfig: template.graph.runConfig ?? {
          loopMode: true,
          languages: { hi: 3, ja: 2 },
          batchSize: 5,
        },
      });
    },

    saveTemplate: async () => {
      const state = get();

      // Don't save if no template is loaded
      if (!state.templateId) {
        return;
      }

      set({ saveState: "saving" });

      try {
        // Transform nodes back to graph format
        const blockNodes = state.nodes.filter((n) => n.type === "block");
        const graph = {
          version: 1 as const,
          lanes: [...LANE_ORDER] as [
            "GLOBAL",
            "IMAGE",
            "VIDEO_START",
            "EXTEND_MIDDLE",
            "EXTEND_END",
          ],
          nodes: blockNodes.map((n) => {
            const data = n.data as BlockNodeData;
            return {
              id: n.id,
              blockDefId: data.blockDefId,
              lane: n.parentId as Lane,
              order: data.order,
              pinned: data.pinned,
              overrides: data.override
                ? { promptFragment: data.override }
                : undefined,
            };
          }),
          // RF edges are optional visual connections. Domain handshakes are
          // lane→lane contracts. If the canvas has no RF edges (import / seed),
          // persist default verbatim handshakes so compiler/import knowledge remains.
          edges:
            state.edges.length > 0
              ? state.edges.map((e) => ({
                  from: e.source as Lane,
                  to: e.target as Lane,
                  handshake: (e.data?.handshake as {
                    strictness: "verbatim" | "paraphrase";
                    trackCrowdMembers: number;
                  }) ?? {
                    strictness: "verbatim" as const,
                    trackCrowdMembers: 2,
                  },
                }))
              : [
                  {
                    from: "VIDEO_START" as Lane,
                    to: "EXTEND_MIDDLE" as Lane,
                    handshake: {
                      strictness: "verbatim" as const,
                      trackCrowdMembers: 0,
                    },
                  },
                  {
                    from: "EXTEND_MIDDLE" as Lane,
                    to: "EXTEND_END" as Lane,
                    handshake: {
                      strictness: "verbatim" as const,
                      trackCrowdMembers: 0,
                    },
                  },
                ],
          // Always persist full runConfig so agent merge never sees undefined
          runConfig: {
            loopMode: state.runConfig?.loopMode ?? true,
            languages: {
              hi: state.runConfig?.languages?.hi ?? 3,
              ja: state.runConfig?.languages?.ja ?? 2,
            },
            batchSize: state.runConfig?.batchSize ?? 5,
          },
        };

        const response = await fetch(`/api/templates/${state.templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ graph }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save template: ${response.status}`);
        }

        // Update currentVersion from response if available
        const result = await response.json().catch(() => ({}));
        const newVersion = result.data?.currentVersion ?? result.currentVersion;
        set({
          isDirty: false,
          saveState: "saved",
          ...(newVersion ? { currentVersion: newVersion } : {}),
        });
      } catch (error) {
        set({ saveState: "error" });
        throw error;
      }
    },

    // ===========================================================================
    // Config
    // ===========================================================================

    setThemePackId: (themePackId) => {
      set({ themePackId });
    },

    setRunConfig: (config) => {
      set((state) => ({
        runConfig: { ...state.runConfig, ...config },
        isDirty: true,
      }));
    },
  }))
);

// =============================================================================
// Selectors
// =============================================================================

/**
 * Select a node by ID
 */
export const selectNodeById = (id: string) => (state: CanvasState) =>
  state.nodes.find((n) => n.id === id);

/**
 * Select all blocks in a specific lane
 */
export const selectBlocksInLane = (lane: Lane) => (state: CanvasState) =>
  state.nodes
    .filter((n) => n.type === "block" && n.parentId === lane)
    .sort((a, b) => {
      const aData = a.data as BlockNodeData;
      const bData = b.data as BlockNodeData;
      return aData.order - bData.order;
    });

/**
 * Select the currently selected node
 */
export const selectSelectedNode = (state: CanvasState) =>
  state.selectedId ? state.nodes.find((n) => n.id === state.selectedId) : null;

/**
 * Get count of blocks using a specific block definition
 */
export const selectBlockCount =
  (blockDefId: string) => (state: CanvasState) =>
    state.nodes.filter(
      (n) =>
        n.type === "block" && (n.data as BlockNodeData).blockDefId === blockDefId
    ).length;

/**
 * Type alias for backwards compatibility with tests
 */
export type CanvasStore = CanvasState;
