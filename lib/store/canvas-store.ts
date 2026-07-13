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
  LANE_CONFIG,
  LANE_ORDER,
  type BlockNodeData,
  type LaneNodeData,
  type SaveState,
  type RunStatus,
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
  isDirty: boolean;
  saveState: SaveState;

  // Run state
  runStatus: RunStatus;
  currentRunId: string | null;
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
  setRunStatus: (status: RunStatus) => void;
  setCurrentRunId: (runId: string | null) => void;
  setRunConfig: (config: Partial<RunConfig>) => void;
}

/**
 * Create lane nodes for initial canvas setup
 */
function createLaneNodes(): Node<LaneNodeData>[] {
  return LANE_ORDER.map((lane) => ({
    id: lane,
    type: "lane",
    position: { x: LANE_CONFIG[lane].x, y: 0 },
    data: { lane },
    draggable: false,
    selectable: true,
  }));
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
    isDirty: false,
    saveState: "idle",
    runStatus: "idle",
    currentRunId: null,
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
      const isValid = blockDef.stageScope.includes(lane);

      const newNode: Node<BlockNodeData> = {
        id: nodeId,
        type: "block",
        parentId: lane,
        position: { x: 10, y: order * 100 + 50 },
        data: {
          blockDefId: blockDef.id,
          name: blockDef.name,
          type: blockDef.type,
          fragment: blockDef.promptFragment,
          stageScope: blockDef.stageScope,
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

      // Create lane nodes
      const laneNodes = createLaneNodes();

      // Transform graph nodes to React Flow nodes
      const blockNodes: Node<BlockNodeData>[] = template.graph.nodes.map(
        (node: {
          id: string;
          blockDefId: string;
          lane: Lane;
          order: number;
          pinned?: boolean;
          overrides?: { promptFragment?: string };
        }) => {
          // Note: In production, we'd fetch block definitions to get full data
          // For now, we create placeholder data that will be hydrated by the component
          return {
            id: node.id,
            type: "block",
            parentId: node.lane,
            position: { x: 10, y: node.order * 100 + 50 },
            data: {
              blockDefId: node.blockDefId,
              name: "Loading...",
              type: "CUSTOM" as BlockType,
              fragment: "",
              stageScope: [node.lane],
              pinned: node.pinned ?? false,
              valid: true,
              override: node.overrides?.promptFragment,
              order: node.order,
            },
            draggable: true,
            selectable: true,
          };
        }
      );

      set({
        nodes: [...laneNodes, ...blockNodes],
        edges: template.graph.edges?.map(
          (
            edge: { from: Lane; to: Lane; handshake?: unknown },
            i: number
          ) => ({
            id: `edge-${i}`,
            source: edge.from,
            target: edge.to,
            type: "handshake",
            data: { handshake: edge.handshake },
          })
        ) ?? [],
        templateId: template.id,
        templateName: template.name,
        themePackId: template.themePackId ?? null,
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
          version: 1,
          lanes: LANE_ORDER,
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
          edges: state.edges.map((e) => ({
            from: e.source,
            to: e.target,
            handshake: e.data?.handshake ?? {
              strictness: "verbatim",
              trackCrowdMembers: 2,
            },
          })),
          runConfig: state.runConfig,
        };

        const response = await fetch(`/api/templates/${state.templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ graph }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save template: ${response.status}`);
        }

        set({ isDirty: false, saveState: "saved" });
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

    setRunStatus: (runStatus) => {
      set({ runStatus });
    },

    setCurrentRunId: (currentRunId) => {
      set({ currentRunId });
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
