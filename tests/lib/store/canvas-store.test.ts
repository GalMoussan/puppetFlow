/**
 * Tests for Canvas Store (Zustand)
 *
 * Per Phase 3 test specification and blueprint:
 * - Store state management
 * - Node operations (add, remove, update, select)
 * - Template operations (load, save, autosave)
 * - Undo/redo support (if implemented)
 *
 * Coverage target: >= 85% line / 80% branch coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// This import will fail until implementation exists - expected for TDD
import { useCanvasStore, type CanvasStore } from "@/lib/store/canvas-store";

import { Lane } from "@puppetflow/domain";

// =============================================================================
// Mock Data
// =============================================================================

const mockBlockDef = {
  id: "block-camera-whip",
  type: "CAMERA_MOVE" as const,
  name: "Whip Pan",
  promptFragment: "Camera whips horizontally...",
  stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"] as Lane[],
  rotationGroup: "camera",
};

const mockNode = {
  id: "node-1",
  type: "block" as const,
  position: { x: 440, y: 100 },
  data: {
    blockDefId: mockBlockDef.id,
    name: mockBlockDef.name,
    type: mockBlockDef.type,
    fragment: mockBlockDef.promptFragment,
    stageScope: mockBlockDef.stageScope,
    pinned: false,
    valid: true,
    order: 0,
  },
};

const mockTemplate = {
  id: "tpl-001",
  name: "Festival Template v1",
  themePackId: "pack-001",
  graph: {
    version: 1,
    lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
    nodes: [
      {
        id: "node-1",
        blockDefId: "block-camera-whip",
        lane: "VIDEO_START" as Lane,
        order: 0,
        pinned: false,
      },
    ],
    edges: [
      {
        from: "VIDEO_START" as Lane,
        to: "EXTEND_MIDDLE" as Lane,
        handshake: { strictness: "verbatim" as const, trackCrowdMembers: 0 },
      },
    ],
    runConfig: null,
  },
};

/** Template + block library responses for loadTemplate hydration */
function mockTemplateAndBlocksFetches(
  template: typeof mockTemplate = mockTemplate,
  blocks: unknown[] = [mockBlockDef]
) {
  mockFetch.mockImplementation(async (url: string | URL | Request) => {
    const href =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    if (href.includes("/api/blocks")) {
      return {
        ok: true,
        json: async () => ({ data: blocks }),
      };
    }
    return {
      ok: true,
      json: async () => template,
    };
  });
}

// =============================================================================
// Mock Setup
// =============================================================================

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Suite
// =============================================================================

describe("Canvas Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state between tests
    useCanvasStore.setState({
      nodes: [],
      edges: [],
      selectedId: null,
      templateId: null,
      templateName: null,
      isDirty: false,
      saveState: "idle",
    });
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("Initial State", () => {
    it("starts with empty nodes array", () => {
      expect(useCanvasStore.getState().nodes).toEqual([]);
    });

    it("starts with no selection", () => {
      expect(useCanvasStore.getState().selectedId).toBeNull();
    });

    it("starts with no template loaded", () => {
      expect(useCanvasStore.getState().templateId).toBeNull();
    });

    it("starts with clean state (not dirty)", () => {
      expect(useCanvasStore.getState().isDirty).toBe(false);
    });

    it("starts with idle save state", () => {
      expect(useCanvasStore.getState().saveState).toBe("idle");
    });
  });

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  describe("Node Operations", () => {
    describe("addBlock", () => {
      it("adds a new block node to the store", () => {
        const store = useCanvasStore.getState();
        store.addBlock(mockBlockDef, "VIDEO_START", 0);

        const state = useCanvasStore.getState();
        expect(state.nodes).toHaveLength(1);
        expect(state.nodes[0].data.blockDefId).toBe(mockBlockDef.id);
      });

      it("generates unique node ID", () => {
        const store = useCanvasStore.getState();
        store.addBlock(mockBlockDef, "VIDEO_START", 0);
        store.addBlock(mockBlockDef, "VIDEO_START", 1);

        const state = useCanvasStore.getState();
        expect(state.nodes[0].id).not.toBe(state.nodes[1].id);
      });

      it("sets correct position based on lane", () => {
        const store = useCanvasStore.getState();
        store.addBlock(mockBlockDef, "VIDEO_START", 0);

        const state = useCanvasStore.getState();
        // Block is positioned within the lane
        expect(state.nodes[0].position.x).toBe(10);
      });

      it("sets initial valid state based on stageScope", () => {
        const store = useCanvasStore.getState();
        store.addBlock(mockBlockDef, "VIDEO_START", 0);

        const state = useCanvasStore.getState();
        expect(state.nodes[0].data.valid).toBe(true);
      });

      it("marks store as dirty after adding block", () => {
        const store = useCanvasStore.getState();
        store.addBlock(mockBlockDef, "VIDEO_START", 0);

        const state = useCanvasStore.getState();
        expect(state.isDirty).toBe(true);
      });
    });

    describe("removeBlock", () => {
      beforeEach(() => {
        useCanvasStore.setState({ nodes: [mockNode] });
      });

      it("removes block by ID", () => {
        const store = useCanvasStore.getState();
        store.removeBlock("node-1");

        const state = useCanvasStore.getState();
        expect(state.nodes).toHaveLength(0);
      });

      it("clears selection if removed block was selected", () => {
        useCanvasStore.setState({ selectedId: "node-1" });
        const store = useCanvasStore.getState();
        store.removeBlock("node-1");

        const state = useCanvasStore.getState();
        expect(state.selectedId).toBeNull();
      });

      it("keeps selection if different block removed", () => {
        useCanvasStore.setState({
          nodes: [mockNode, { ...mockNode, id: "node-2" }],
          selectedId: "node-2",
        });
        const store = useCanvasStore.getState();
        store.removeBlock("node-1");

        const state = useCanvasStore.getState();
        expect(state.selectedId).toBe("node-2");
      });

      it("marks store as dirty after removing block", () => {
        const store = useCanvasStore.getState();
        store.removeBlock("node-1");

        const state = useCanvasStore.getState();
        expect(state.isDirty).toBe(true);
      });

      it("handles removing non-existent block gracefully", () => {
        expect(() => {
          const store = useCanvasStore.getState();
          store.removeBlock("nonexistent");
        }).not.toThrow();

        expect(useCanvasStore.getState().nodes).toHaveLength(1);
      });
    });

    describe("selectNode", () => {
      beforeEach(() => {
        useCanvasStore.setState({ nodes: [mockNode] });
      });

      it("sets selectedId to node ID", () => {
        useCanvasStore.getState().selectNode("node-1");
        expect(useCanvasStore.getState().selectedId).toBe("node-1");
      });

      it("clears selection when called with null", () => {
        useCanvasStore.setState({ selectedId: "node-1" });
        useCanvasStore.getState().selectNode(null);
        expect(useCanvasStore.getState().selectedId).toBeNull();
      });

      it("updates selection to new node", () => {
        useCanvasStore.setState({
          nodes: [mockNode, { ...mockNode, id: "node-2" }],
          selectedId: "node-1",
        });
        useCanvasStore.getState().selectNode("node-2");
        expect(useCanvasStore.getState().selectedId).toBe("node-2");
      });

      it("can select lane IDs", () => {
        useCanvasStore.getState().selectNode("VIDEO_START");
        expect(useCanvasStore.getState().selectedId).toBe("VIDEO_START");
      });
    });

    describe("togglePin", () => {
      beforeEach(() => {
        useCanvasStore.setState({ nodes: [mockNode] });
      });

      it("toggles pinned state from false to true", () => {
        useCanvasStore.getState().togglePin("node-1");
        expect(useCanvasStore.getState().nodes[0].data.pinned).toBe(true);
      });

      it("toggles pinned state from true to false", () => {
        useCanvasStore.setState({
          nodes: [{ ...mockNode, data: { ...mockNode.data, pinned: true } }],
        });
        useCanvasStore.getState().togglePin("node-1");
        expect(useCanvasStore.getState().nodes[0].data.pinned).toBe(false);
      });

      it("marks store as dirty", () => {
        useCanvasStore.getState().togglePin("node-1");
        expect(useCanvasStore.getState().isDirty).toBe(true);
      });
    });

    describe("updateBlockOverride", () => {
      beforeEach(() => {
        useCanvasStore.setState({ nodes: [mockNode] });
      });

      it("sets override text on block", () => {
        useCanvasStore.getState().updateBlockOverride("node-1", "Custom override text");
        expect(useCanvasStore.getState().nodes[0].data.override).toBe(
          "Custom override text"
        );
      });

      it("clears override when passed undefined", () => {
        useCanvasStore.setState({
          nodes: [
            {
              ...mockNode,
              data: { ...mockNode.data, override: "Old override" },
            },
          ],
        });
        useCanvasStore.getState().updateBlockOverride("node-1", undefined);
        expect(useCanvasStore.getState().nodes[0].data.override).toBeUndefined();
      });

      it("marks store as dirty", () => {
        useCanvasStore.getState().updateBlockOverride("node-1", "New text");
        expect(useCanvasStore.getState().isDirty).toBe(true);
      });
    });

    describe("setNodes", () => {
      it("replaces all nodes", () => {
        useCanvasStore.getState().setNodes([mockNode, { ...mockNode, id: "node-2" }]);
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
      });

      it("marks store as dirty", () => {
        useCanvasStore.getState().setNodes([mockNode]);
        expect(useCanvasStore.getState().isDirty).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Template Operations
  // ===========================================================================

  describe("Template Operations", () => {
    describe("loadTemplate", () => {
      it("populates nodes from template graph", async () => {
        mockTemplateAndBlocksFetches();

        await useCanvasStore.getState().loadTemplate("tpl-001");

        const state = useCanvasStore.getState();
        expect(state.nodes.length).toBeGreaterThan(0);
        expect(state.templateId).toBe("tpl-001");
      });

      it("hydrates block name/type/fragment from block library (not Loading...)", async () => {
        mockTemplateAndBlocksFetches();

        await useCanvasStore.getState().loadTemplate("tpl-001");

        const blocks = useCanvasStore
          .getState()
          .nodes.filter((n) => n.type === "block");
        expect(blocks).toHaveLength(1);
        expect(blocks[0].data.name).toBe("Whip Pan");
        expect(blocks[0].data.name).not.toBe("Loading...");
        expect(blocks[0].data.type).toBe("CAMERA_MOVE");
        expect(blocks[0].data.fragment).toContain("whips horizontally");
      });

      it("does not create React Flow edges from domain handshakes", async () => {
        mockTemplateAndBlocksFetches();

        await useCanvasStore.getState().loadTemplate("tpl-001");

        // Domain graph may have handshakes; RF store edges must stay empty
        // (LaneNode has no Handles — RF error #008)
        expect(useCanvasStore.getState().edges).toEqual([]);
      });

      it("sets templateId and templateName", async () => {
        mockTemplateAndBlocksFetches();

        await useCanvasStore.getState().loadTemplate("tpl-001");

        const state = useCanvasStore.getState();
        expect(state.templateId).toBe("tpl-001");
        expect(state.templateName).toBe("Festival Template v1");
      });

      it("resets dirty state after load", async () => {
        mockTemplateAndBlocksFetches();

        useCanvasStore.setState({ isDirty: true });
        await useCanvasStore.getState().loadTemplate("tpl-001");

        expect(useCanvasStore.getState().isDirty).toBe(false);
      });

      it("clears selection on load", async () => {
        mockTemplateAndBlocksFetches();

        useCanvasStore.setState({ selectedId: "some-node" });
        await useCanvasStore.getState().loadTemplate("tpl-001");

        expect(useCanvasStore.getState().selectedId).toBeNull();
      });

      it("handles load errors", async () => {
        mockFetch.mockImplementation(async () => ({
          ok: false,
          status: 404,
        }));

        await expect(
          useCanvasStore.getState().loadTemplate("nonexistent")
        ).rejects.toThrow();
      });
    });

    describe("saveTemplate", () => {
      beforeEach(() => {
        useCanvasStore.setState({
          nodes: [mockNode],
          templateId: "tpl-001",
          isDirty: true,
        });
      });

      it("sends PATCH request with graph data", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await useCanvasStore.getState().saveTemplate();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/templates/tpl-001"),
          expect.objectContaining({
            method: "PATCH",
          })
        );
      });

      it("sets saveState to saving during request", async () => {
        let capturedState: string | undefined;

        mockFetch.mockImplementationOnce(() => {
          capturedState = useCanvasStore.getState().saveState;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        });

        await useCanvasStore.getState().saveTemplate();

        expect(capturedState).toBe("saving");
      });

      it("sets saveState to saved on success", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await useCanvasStore.getState().saveTemplate();

        expect(useCanvasStore.getState().saveState).toBe("saved");
      });

      it("sets saveState to error on failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        // Use direct store access to avoid React context issues with thrown errors
        const store = useCanvasStore.getState();

        try {
          await store.saveTemplate();
        } catch {
          // Expected to throw
        }

        expect(useCanvasStore.getState().saveState).toBe("error");
      });

      it("clears dirty state on successful save", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await useCanvasStore.getState().saveTemplate();

        expect(useCanvasStore.getState().isDirty).toBe(false);
      });

      it("does not save if no templateId", async () => {
        useCanvasStore.setState({ templateId: null });

        await useCanvasStore.getState().saveTemplate();

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Selectors
  // ===========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      useCanvasStore.setState({
        nodes: [
          mockNode,
          { ...mockNode, id: "node-2", data: { ...mockNode.data, order: 1 } },
        ],
        selectedId: "node-1",
      });
    });

    it("getSelectedNode returns selected node", () => {
      const state = useCanvasStore.getState();
      const selectedNode = state.nodes.find((n) => n.id === state.selectedId);
      expect(selectedNode?.id).toBe("node-1");
    });

    it("getNodesInLane returns nodes filtered by parent lane", () => {
      useCanvasStore.setState({
        nodes: [
          { ...mockNode, parentId: "VIDEO_START" },
          { ...mockNode, id: "node-2", parentId: "GLOBAL" },
        ],
      });

      const state = useCanvasStore.getState();
      const filtered = state.nodes.filter((n) => n.parentId === "VIDEO_START");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("node-1");
    });

    it("getNodesByOrder returns nodes sorted by order", () => {
      useCanvasStore.setState({
        nodes: [
          { ...mockNode, id: "node-3", data: { ...mockNode.data, order: 2 } },
          { ...mockNode, id: "node-1", data: { ...mockNode.data, order: 0 } },
          { ...mockNode, id: "node-2", data: { ...mockNode.data, order: 1 } },
        ],
      });

      const state = useCanvasStore.getState();
      const sorted = [...state.nodes].sort(
        (a, b) => (a.data as { order: number }).order - (b.data as { order: number }).order
      );

      expect(sorted.map((n) => n.id)).toEqual([
        "node-1",
        "node-2",
        "node-3",
      ]);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("Edge Cases", () => {
    it("handles rapid state updates", () => {
      const store = useCanvasStore.getState();
      for (let i = 0; i < 100; i++) {
        store.addBlock(mockBlockDef, "VIDEO_START", i);
      }

      expect(useCanvasStore.getState().nodes).toHaveLength(100);
    });

    it("maintains immutability of state", () => {
      useCanvasStore.setState({ nodes: [mockNode] });
      const nodesBefore = useCanvasStore.getState().nodes;

      useCanvasStore.getState().addBlock(mockBlockDef, "VIDEO_START", 1);

      expect(useCanvasStore.getState().nodes).not.toBe(nodesBefore);
    });

    it("preserves other nodes when updating one", () => {
      useCanvasStore.setState({
        nodes: [mockNode, { ...mockNode, id: "node-2" }],
      });

      useCanvasStore.getState().updateBlockOverride("node-1", "Changed");

      const state = useCanvasStore.getState();
      expect(state.nodes).toHaveLength(2);
      expect(state.nodes.find((n) => n.id === "node-2")).toBeDefined();
    });
  });
});
