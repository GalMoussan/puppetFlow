/**
 * Tests for Run Viewer page container
 *
 * Phase 4 - T403: /runs/[id] loads run and renders RunViewer
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RunViewerPage } from "@/components/run/RunViewerPage";

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const apiRun = {
  id: "run-001",
  templateId: "tpl-001",
  status: "DONE",
  model: "claude-sonnet-4-20250514",
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:32:45.000Z",
  template: { id: "tpl-001", name: "Master of Puppets" },
  scenes: [
    {
      id: "scene-1",
      runId: "run-001",
      index: 0,
      combo: {},
      lyrics: "Master, master\nDreams after",
      imagePrompt: "Heavy metal puppet on stage",
      startPrompt: "Camera pushes in",
      middlePrompt: "Dynamic cuts",
      endPrompt: "Pull back",
      boundaryFrame1: "Wide stage",
      boundaryFrame2: "Close up",
      finalFrame: "Final",
      lintReport: [],
      notes: null,
    },
  ],
};

describe("RunViewerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows loading state while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<RunViewerPage runId="run-001" />);
    expect(screen.getByTestId("run-viewer-loading")).toBeInTheDocument();
  });

  it("loads run from GET /api/runs/[id] and renders viewer", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => apiRun,
    });

    render(<RunViewerPage runId="run-001" />);

    await waitFor(() => {
      expect(screen.getByText("Master of Puppets")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/runs/run-001");
    expect(screen.getByTestId("scene-cards-grid")).toBeInTheDocument();
    expect(screen.getByTestId("scene-card-scene-1")).toBeInTheDocument();
  });

  it("shows error when run is not found", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Run not found" }),
    });

    render(<RunViewerPage runId="missing" />);

    await waitFor(() => {
      expect(screen.getByText(/run not found/i)).toBeInTheDocument();
    });
  });

  it("navigates to canvas on Back to Canvas", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => apiRun,
    });

    render(<RunViewerPage runId="run-001" />);

    await waitFor(() => {
      expect(screen.getByText("Master of Puppets")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /back to canvas/i }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("calls reroll API when scene reroll is confirmed", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => apiRun,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...apiRun.scenes[0],
          lyrics: "Rerolled lyrics",
          index: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...apiRun,
          scenes: [
            {
              ...apiRun.scenes[0],
              lyrics: "Rerolled lyrics",
            },
          ],
        }),
      });

    render(<RunViewerPage runId="run-001" />);

    await waitFor(() => {
      expect(screen.getByTestId("scene-card-scene-1")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^reroll$/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/runs/run-001/reroll",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ sceneIndex: 0 }),
        })
      );
    });
  });
});
