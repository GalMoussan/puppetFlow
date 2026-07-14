/**
 * Tests for Generation Library page
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { LibraryPage } from "@/components/library/LibraryPage";
import { RunLibraryCard } from "@/components/library/RunLibraryCard";
import type { LibraryRunItem } from "@/lib/map-run";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockListResponse(
  runs: object[],
  opts: { hasMore?: boolean; cursor?: string | null; total?: number } = {}
) {
  return {
    ok: true,
    json: async () => ({
      data: runs,
      cursor: opts.cursor ?? null,
      hasMore: opts.hasMore ?? false,
      total: opts.total ?? runs.length,
    }),
  };
}

const sampleApiRun = {
  id: "run-abc",
  templateId: "tpl-1",
  status: "DONE",
  model: "deepseek-chat",
  error: null,
  createdAt: "2026-07-14T10:00:00.000Z",
  updatedAt: "2026-07-14T10:05:00.000Z",
  template: { id: "tpl-1", name: "Master of Puppets" },
  scenes: [
    {
      id: "sc-1",
      index: 0,
      lyrics: "Shika! Shika!",
      imagePrompt: "UV festival stage",
    },
  ],
  _count: { scenes: 5 },
};

describe("RunLibraryCard", () => {
  const item: LibraryRunItem = {
    id: "run-1",
    templateId: "tpl-1",
    templateName: "Master of Puppets",
    status: "DONE",
    model: "deepseek-chat",
    sceneCount: 5,
    createdAt: "2026-07-14T10:00:00.000Z",
    updatedAt: "2026-07-14T10:05:00.000Z",
    error: null,
    previewLyrics: "Shika!",
    previewImage: "Stage",
  };

  it("links to run detail page", () => {
    render(<RunLibraryCard run={item} />);
    const link = screen.getByTestId("library-run-card");
    expect(link).toHaveAttribute("href", "/runs/run-1");
  });

  it("shows template, status, model, and preview", () => {
    render(<RunLibraryCard run={item} />);
    expect(screen.getByText("Master of Puppets")).toBeInTheDocument();
    expect(screen.getByTestId("library-run-status")).toHaveTextContent(/done/i);
    expect(screen.getByText(/deepseek-chat/)).toBeInTheDocument();
    expect(screen.getByTestId("library-run-preview")).toHaveTextContent("Shika!");
  });
});

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("loads and lists generations from GET /api/runs", async () => {
    mockFetch.mockResolvedValueOnce(mockListResponse([sampleApiRun], { total: 1 }));

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("library-run-list")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/runs?")
    );
    expect(screen.getByText("Master of Puppets")).toBeInTheDocument();
    expect(screen.getByText(/1 generation/i)).toBeInTheDocument();
    expect(screen.getByTestId("library-run-card")).toHaveAttribute(
      "href",
      "/runs/run-abc"
    );
  });

  it("shows empty state when no runs", async () => {
    mockFetch.mockResolvedValueOnce(mockListResponse([], { total: 0 }));

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("library-empty")).toBeInTheDocument();
    });
    expect(screen.getByText(/no generations yet/i)).toBeInTheDocument();
  });

  it("shows filter-specific empty copy when filtered list is empty", async () => {
    mockFetch.mockResolvedValue(mockListResponse([], { total: 0 }));

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("library-empty")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /^failed$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no failed generations/i)).toBeInTheDocument();
    });
  });

  it("shows error when API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Internal server error" }),
    });

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/internal server error/i);
    });
  });

  it("loads more when hasMore", async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockListResponse([sampleApiRun], {
          hasMore: true,
          cursor: "run-abc",
          total: 2,
        })
      )
      .mockResolvedValueOnce(
        mockListResponse(
          [
            {
              ...sampleApiRun,
              id: "run-def",
              template: { id: "tpl-1", name: "Second Run" },
            },
          ],
          { hasMore: false, cursor: null, total: 2 }
        )
      );

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("library-load-more")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("library-load-more"));

    await waitFor(() => {
      expect(screen.getByText("Second Run")).toBeInTheDocument();
    });
  });

  it("filters by DONE status via API query", async () => {
    mockFetch.mockResolvedValue(mockListResponse([sampleApiRun], { total: 1 }));

    render(<LibraryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("library-run-list")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /^done$/i }));

    await waitFor(() => {
      const calls = mockFetch.mock.calls.map((c) => String(c[0]));
      expect(calls.some((u) => u.includes("status=DONE"))).toBe(true);
    });
  });
});
