/**
 * Tests for Run Viewer
 *
 * Phase 4 - T403: Run Viewer
 *
 * Tests cover:
 * - Run viewer page layout
 * - Scene cards rendering
 * - Copy functionality
 * - Reroll functionality
 * - Export functionality
 * - Lint badges
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// These imports will fail until implementation exists - expected for TDD
import { RunViewer } from "@/components/run/RunViewer";
import { SceneCard } from "@/components/run/SceneCard";
import { LintBadge } from "@/components/run/LintBadge";
import { useToastStore } from "@/lib/store/toast-store";

// =============================================================================
// Test Fixtures
// =============================================================================

const mockScene = {
  id: "scene-1",
  index: 1,
  lyrics: "Master, master, where's the dreams that I've been after?\nMaster, master, you promised only lies",
  imagePrompt: "Heavy metal puppet on a dark stage with dramatic lighting, red and black color scheme",
  videoStart: "Camera pushes in slowly from wide establishing shot",
  videoMiddle: "Dynamic cuts between puppet face and crowd",
  videoEnd: "Pull back to reveal full stage setup",
  boundaryFrames: {
    start: { description: "Wide stage view with fog" },
    end: { description: "Close up puppet face with stage lights" },
  },
  lintResult: {
    status: "pass" as const,
    violations: [],
  },
  notes: "",
};

const mockRun = {
  id: "run-001",
  templateId: "tpl-001",
  templateName: "Master of Puppets",
  sceneCount: 5,
  model: "claude-sonnet-4-20250514",
  status: "done" as const,
  createdAt: "2024-01-15T10:30:00Z",
  completedAt: "2024-01-15T10:32:45Z",
  duration: 165000,
  scenes: [
    mockScene,
    { ...mockScene, id: "scene-2", index: 2 },
    { ...mockScene, id: "scene-3", index: 3 },
    { ...mockScene, id: "scene-4", index: 4 },
    { ...mockScene, id: "scene-5", index: 5 },
  ],
};

// Mock clipboard API - use a configurable property so userEvent can set up its own
const mockWriteText = vi.fn();
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Suite: RunViewer
// =============================================================================

describe("RunViewer", () => {
  const defaultProps = {
    run: mockRun,
    onReroll: vi.fn(),
    onBackToCanvas: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockWriteText.mockResolvedValue(undefined);
    useToastStore.getState().clear();
  });

  afterEach(() => {
    useToastStore.getState().clear();
  });

  // ===========================================================================
  // Run Metadata
  // ===========================================================================

  describe("Run Metadata", () => {
    it("shows template name", () => {
      render(<RunViewer {...defaultProps} />);

      expect(screen.getByText("Master of Puppets")).toBeInTheDocument();
    });

    it("shows run date", () => {
      render(<RunViewer {...defaultProps} />);

      expect(screen.getByText(/jan 15, 2024/i)).toBeInTheDocument();
    });

    it("shows scene count", () => {
      render(<RunViewer {...defaultProps} />);

      expect(screen.getByText(/5 scenes/i)).toBeInTheDocument();
    });

    it("shows duration", () => {
      render(<RunViewer {...defaultProps} />);

      expect(screen.getByText(/2m 45s/i)).toBeInTheDocument();
    });

    it("shows model used", () => {
      render(<RunViewer {...defaultProps} />);

      expect(screen.getByText(/claude-sonnet/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Scene Cards Grid
  // ===========================================================================

  describe("Scene Cards Grid", () => {
    it("renders all scene cards", () => {
      render(<RunViewer {...defaultProps} />);

      const cards = screen.getAllByTestId(/^scene-card-/);
      expect(cards).toHaveLength(5);
    });

    it("displays scenes in order", () => {
      render(<RunViewer {...defaultProps} />);

      const cards = screen.getAllByTestId(/^scene-card-/);
      expect(cards[0]).toHaveAttribute("data-index", "1");
      expect(cards[4]).toHaveAttribute("data-index", "5");
    });

    it("uses responsive grid layout", () => {
      render(<RunViewer {...defaultProps} />);

      const grid = screen.getByTestId("scene-cards-grid");
      expect(grid).toHaveClass("grid");
    });
  });

  // ===========================================================================
  // Copy Functionality
  // ===========================================================================

  describe("Copy Functionality", () => {
    it("has Copy All button", () => {
      render(<RunViewer {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /copy all/i })
      ).toBeInTheDocument();
    });

    it("copies all scenes to clipboard in correct format", async () => {
      const user = userEvent.setup();
      render(<RunViewer {...defaultProps} />);

      // Spy on the clipboard after userEvent setup
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");

      await user.click(screen.getByRole("button", { name: /copy all/i }));

      await waitFor(() => {
        expect(writeTextSpy).toHaveBeenCalled();
      });

      const clipboardContent = writeTextSpy.mock.calls[0][0] as string;
      expect(clipboardContent).toContain("## Scene 1");
      expect(clipboardContent).toContain("## Scene 5");
    });

    it("shows success toast after copying", async () => {
      const user = userEvent.setup();
      render(<RunViewer {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /copy all/i }));

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
      // Global toast store also records success (Toaster renders it in layout)
      expect(
        useToastStore
          .getState()
          .toasts.some(
            (t) => t.type === "success" && /copied/i.test(t.message)
          )
      ).toBe(true);
    });
  });

  // ===========================================================================
  // Export formats (T406)
  // ===========================================================================

  // ===========================================================================
  // Export Functionality
  // ===========================================================================

  describe("Export Functionality", () => {
    function mockDownload() {
      const mockBlob = new Blob(["# Run Export\n2024-01-15"], {
        type: "text/markdown",
      });
      // Mock Content-Disposition header for filename
      mockFetch.mockImplementation(async (_url: string) => ({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: {
          get: (name: string) =>
            name === "Content-Disposition"
              ? `attachment; filename="export-2024-01-15.md"`
              : null,
        },
        json: () => Promise.resolve({}),
      }));
      global.URL.createObjectURL = vi.fn(() => "blob:url");
      global.URL.revokeObjectURL = vi.fn();
      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
        style: {} as CSSStyleDeclaration,
        setAttribute: vi.fn(),
        remove: vi.fn(),
      };
      const originalCreateElement = Document.prototype.createElement;
      vi.spyOn(document, "createElement").mockImplementation(function (
        this: Document,
        tagName: string,
        options?: ElementCreationOptions
      ) {
        // Only intercept ephemeral download anchors (export flow), not nav links
        if (String(tagName).toLowerCase() === "a") {
          const el = originalCreateElement.call(this, tagName, options);
          // Prefer real anchors for in-DOM nav; use mock only when not yet attached
          // Export creates an off-DOM <a> and calls click immediately.
          Object.defineProperty(el, "click", {
            configurable: true,
            value: () => {
              mockLink.href = (el as HTMLAnchorElement).href;
              mockLink.download = (el as HTMLAnchorElement).download;
              mockLink.click();
            },
          });
          return el;
        }
        return originalCreateElement.call(this, tagName, options);
      });
      return mockLink;
    }

    it("has Export dropdown with format options", async () => {
      const user = userEvent.setup();
      render(<RunViewer {...defaultProps} />);

      // Click Export dropdown button
      await user.click(screen.getByRole("button", { name: /export/i }));

      // Should show export format options in dropdown
      expect(screen.getByText(/scenes \(markdown\)/i)).toBeInTheDocument();
      expect(screen.getByText(/scaffold \(markdown\)/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf document/i)).toBeInTheDocument();
      expect(screen.getByText(/word document/i)).toBeInTheDocument();
    });

    it("triggers scenes download via dropdown", async () => {
      const user = userEvent.setup();
      const mockLink = mockDownload();

      render(<RunViewer {...defaultProps} />);

      // Open dropdown and click Scenes option
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText(/scenes \(markdown\)/i));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/export/run-001?format=scenes"
        );
        expect(mockLink.click).toHaveBeenCalled();
      });

      vi.restoreAllMocks();
    });

    it("triggers pdf download via dropdown", async () => {
      const user = userEvent.setup();
      const mockLink = mockDownload();

      render(<RunViewer {...defaultProps} />);

      // Open dropdown and click PDF option
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText(/pdf document/i));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/export/run-001?format=pdf"
        );
        expect(mockLink.click).toHaveBeenCalled();
      });

      vi.restoreAllMocks();
    });

    it("triggers scaffold download via dropdown", async () => {
      const user = userEvent.setup();
      const mockLink = mockDownload();

      render(<RunViewer {...defaultProps} />);

      // Open dropdown and click Scaffold option
      await user.click(screen.getByRole("button", { name: /export/i }));
      await user.click(screen.getByText(/scaffold \(markdown\)/i));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/export/run-001?format=scaffold"
        );
        expect(mockLink.click).toHaveBeenCalled();
      });

      vi.restoreAllMocks();
    });
  });

  // ===========================================================================
  // Back to Canvas
  // ===========================================================================

  describe("Back to Canvas", () => {
    it("has Back to Canvas button", () => {
      render(<RunViewer {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /back to canvas/i })
      ).toBeInTheDocument();
    });

    it("calls onBackToCanvas when clicked", async () => {
      const user = userEvent.setup();
      render(<RunViewer {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /back to canvas/i }));

      expect(defaultProps.onBackToCanvas).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Test Suite: SceneCard
// =============================================================================

describe("SceneCard", () => {
  const defaultProps = {
    scene: mockScene,
    onCopy: vi.fn(),
    onReroll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Scene Content
  // ===========================================================================

  describe("Scene Content", () => {
    it("shows scene index", () => {
      render(<SceneCard {...defaultProps} />);

      expect(screen.getByText("Scene 1")).toBeInTheDocument();
    });

    it("shows lyrics preview (first 2 lines)", () => {
      render(<SceneCard {...defaultProps} />);

      expect(
        screen.getByText(/Master, master, where's the dreams/i)
      ).toBeInTheDocument();
    });

    it("shows image prompt (truncated)", () => {
      render(<SceneCard {...defaultProps} />);

      const imagePrompt = screen.getByTestId("image-prompt");
      expect(imagePrompt).toHaveTextContent(/Heavy metal puppet/i);
    });

    it("expands image prompt on click", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      const expandButton = screen.getByTestId("expand-image-prompt");
      await user.click(expandButton);

      expect(screen.getByText(/red and black color scheme/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Video Prompts
  // ===========================================================================

  describe("Video Prompts", () => {
    it("shows video prompts section (collapsed by default)", () => {
      render(<SceneCard {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /video prompts/i })
      ).toBeInTheDocument();
    });

    it("expands video prompts on click", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /video prompts/i }));

      expect(screen.getByText(/video start/i)).toBeInTheDocument();
      expect(screen.getByText(/video middle/i)).toBeInTheDocument();
      expect(screen.getByText(/video end/i)).toBeInTheDocument();
    });

    it("shows all video prompt content when expanded", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /video prompts/i }));

      expect(screen.getByText(/Camera pushes in slowly/i)).toBeInTheDocument();
      expect(screen.getByText(/Dynamic cuts between/i)).toBeInTheDocument();
      expect(screen.getByText(/Pull back to reveal/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Per-prompt copy (T404)
  // ===========================================================================

  describe("Per-prompt Copy", () => {
    it("has copy buttons for image and each video stage", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /copy image prompt/i })
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /video prompts/i }));

      expect(
        screen.getByRole("button", { name: /copy video start/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /copy video middle/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /copy video end/i })
      ).toBeInTheDocument();
    });

    it("copies image prompt text to clipboard", async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");
      render(<SceneCard {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /copy image prompt/i })
      );

      await waitFor(() => {
        expect(writeTextSpy).toHaveBeenCalledWith(mockScene.imagePrompt);
      });
    });

    it("copies video start prompt when expanded", async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /video prompts/i }));
      await user.click(
        screen.getByRole("button", { name: /copy video start/i })
      );

      await waitFor(() => {
        expect(writeTextSpy).toHaveBeenCalledWith(mockScene.videoStart);
      });
    });
  });

  // ===========================================================================
  // Stage reroll (T405)
  // ===========================================================================

  describe("Stage Reroll", () => {
    it("offers stage-specific reroll options after opening menu", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /reroll menu/i }));

      expect(
        screen.getByRole("button", { name: /reroll full scene/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reroll image/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reroll video start/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reroll video middle/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reroll video end/i })
      ).toBeInTheDocument();
    });

    it("calls onReroll with stage when stage option confirmed", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /reroll menu/i }));
      await user.click(
        screen.getByRole("button", { name: /reroll video start/i })
      );
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      expect(defaultProps.onReroll).toHaveBeenCalledWith(
        mockScene.index,
        "VIDEO_START"
      );
    });

    it("calls onReroll without stage for full scene", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /reroll menu/i }));
      await user.click(
        screen.getByRole("button", { name: /reroll full scene/i })
      );
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      expect(defaultProps.onReroll).toHaveBeenCalledWith(mockScene.index);
    });
  });

  // ===========================================================================
  // Boundary Frames
  // ===========================================================================

  describe("Boundary Frames", () => {
    it("shows boundary frames section", () => {
      render(<SceneCard {...defaultProps} />);

      expect(screen.getByText(/boundary frames/i)).toBeInTheDocument();
    });

    it("shows start frame description", () => {
      render(<SceneCard {...defaultProps} />);

      expect(screen.getByText(/Wide stage view with fog/i)).toBeInTheDocument();
    });

    it("shows end frame description", () => {
      render(<SceneCard {...defaultProps} />);

      expect(
        screen.getByText(/Close up puppet face with stage lights/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Card Actions
  // ===========================================================================

  describe("Card Actions", () => {
    it("has copy button", () => {
      render(<SceneCard {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /copy scene/i })
      ).toBeInTheDocument();
    });

    it("calls onCopy when copy clicked", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /copy scene/i }));

      expect(defaultProps.onCopy).toHaveBeenCalledWith(mockScene);
    });

    it("has reroll menu button", () => {
      render(<SceneCard {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /reroll menu/i })
      ).toBeInTheDocument();
    });

    it("shows confirmation before full scene reroll", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /reroll menu/i }));
      await user.click(
        screen.getByRole("button", { name: /reroll full scene/i })
      );

      expect(screen.getByText(/regenerate this scene/i)).toBeInTheDocument();
    });

    it("calls onReroll after confirmation", async () => {
      const user = userEvent.setup();
      render(<SceneCard {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /reroll menu/i }));
      await user.click(
        screen.getByRole("button", { name: /reroll full scene/i })
      );
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      expect(defaultProps.onReroll).toHaveBeenCalledWith(mockScene.index);
    });
  });

  // ===========================================================================
  // Notes
  // ===========================================================================

  describe("Notes", () => {
    it("does not show notes section when empty", () => {
      render(<SceneCard {...defaultProps} />);

      expect(screen.queryByTestId("scene-notes")).not.toBeInTheDocument();
    });

    it("shows notes when present", () => {
      const sceneWithNotes = {
        ...mockScene,
        notes: "This scene needs darker lighting",
      };
      render(<SceneCard {...defaultProps} scene={sceneWithNotes} />);

      expect(screen.getByTestId("scene-notes")).toHaveTextContent(
        /This scene needs darker lighting/i
      );
    });
  });
});

// =============================================================================
// Test Suite: LintBadge
// =============================================================================

describe("LintBadge", () => {
  // ===========================================================================
  // Badge States
  // ===========================================================================

  describe("Badge States", () => {
    it("shows green checkmark for pass", () => {
      render(<LintBadge status="pass" violations={[]} />);

      const badge = screen.getByTestId("lint-badge");
      expect(badge).toHaveAttribute("data-status", "pass");
      expect(screen.getByLabelText(/all rules pass/i)).toBeInTheDocument();
    });

    it("shows yellow warning for soft violations", () => {
      render(
        <LintBadge
          status="warn"
          violations={[{ rule: "R5", severity: "soft", message: "Minor issue" }]}
        />
      );

      const badge = screen.getByTestId("lint-badge");
      expect(badge).toHaveAttribute("data-status", "warn");
    });

    it("shows red X for hard violations", () => {
      render(
        <LintBadge
          status="fail"
          violations={[
            { rule: "R1", severity: "hard", message: "Critical violation" },
          ]}
        />
      );

      const badge = screen.getByTestId("lint-badge");
      expect(badge).toHaveAttribute("data-status", "fail");
    });
  });

  // ===========================================================================
  // Violation Details
  // ===========================================================================

  describe("Violation Details", () => {
    it("shows violation count", () => {
      render(
        <LintBadge
          status="warn"
          violations={[
            { rule: "R5", severity: "soft", message: "Issue 1" },
            { rule: "R6", severity: "soft", message: "Issue 2" },
          ]}
        />
      );

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("shows violation details on hover", async () => {
      const user = userEvent.setup();
      render(
        <LintBadge
          status="fail"
          violations={[
            { rule: "R1", severity: "hard", message: "Camera move too fast" },
          ]}
        />
      );

      await user.hover(screen.getByTestId("lint-badge"));

      await waitFor(() => {
        expect(screen.getByText(/R1/)).toBeInTheDocument();
        expect(screen.getByText(/Camera move too fast/i)).toBeInTheDocument();
      });
    });

    it("groups violations by rule", async () => {
      const user = userEvent.setup();
      render(
        <LintBadge
          status="fail"
          violations={[
            { rule: "R1", severity: "hard", message: "Issue 1" },
            { rule: "R1", severity: "hard", message: "Issue 2" },
            { rule: "R3", severity: "hard", message: "Issue 3" },
          ]}
        />
      );

      await user.hover(screen.getByTestId("lint-badge"));

      await waitFor(() => {
        const tooltip = screen.getByTestId("lint-tooltip");
        expect(within(tooltip).getByText(/R1 \(2\)/)).toBeInTheDocument();
        expect(within(tooltip).getByText(/R3 \(1\)/)).toBeInTheDocument();
      });
    });
  });
});

// =============================================================================
// Test Suite: Scene Format (Clipboard)
// =============================================================================

describe("Scene Format", () => {
  it("formats scene correctly for clipboard", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(<SceneCard scene={mockScene} onCopy={onCopy} onReroll={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /copy scene/i }));

    expect(onCopy).toHaveBeenCalledWith(mockScene);

    // The actual formatting should match the spec:
    // ## Scene 1
    // **Lyrics:** ...
    // **Image Prompt:** ...
    // **Video Start:** ...
    // **Video Middle:** ...
    // **Video End:** ...
  });
});
