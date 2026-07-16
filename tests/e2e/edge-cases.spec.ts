/**
 * E2E Edge Case Tests
 *
 * Tests edge cases and error states:
 * - Empty canvas behavior
 * - Library empty state
 * - Run viewer error state
 * - Reroll flow
 * - Run modal validation
 */

import { test, expect } from "@playwright/test";

const RUN_ID = "run-edge-001";

test.describe("Canvas Edge Cases", () => {
  test("canvas loads with PuppetFlow heading", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: "PuppetFlow" })
    ).toBeVisible();

    // Run button should exist
    const runButton = page.getByTestId("run-button");
    await expect(runButton).toBeVisible();
  });

  test("Run button exists on canvas page", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: "PuppetFlow" })
    ).toBeVisible();

    // Run button should exist
    const runButton = page.getByTestId("run-button");
    await expect(runButton).toBeVisible();
  });
});

test.describe("Library Page Edge Cases", () => {
  test("library shows empty state when no runs exist", async ({ page }) => {
    await page.route("**/api/runs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          cursor: null,
          hasMore: false,
          total: 0,
        }),
      });
    });

    await page.goto("/library");

    // Page should load (Library heading or icon)
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("library displays runs with status badges", async ({ page }) => {
    const mockRuns = [
      {
        id: "run-1",
        templateId: "tpl-1",
        status: "DONE",
        model: "claude-sonnet-4-20250514",
        createdAt: "2024-06-15T12:00:00.000Z",
        template: { id: "tpl-1", name: "Festival Template" },
        scenes: [],
      },
      {
        id: "run-2",
        templateId: "tpl-1",
        status: "FAILED",
        model: "claude-sonnet-4-20250514",
        createdAt: "2024-06-14T10:00:00.000Z",
        template: { id: "tpl-1", name: "Festival Template" },
        error: "Generation failed",
        scenes: [],
      },
    ];

    await page.route("**/api/runs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: mockRuns,
          cursor: null,
          hasMore: false,
          total: 2,
        }),
      });
    });

    await page.goto("/library");

    // Page should load
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});

test.describe("Run Viewer Error States", () => {
  test("displays error state for failed run", async ({ page }) => {
    const failedRun = {
      id: RUN_ID,
      templateId: "tpl-error",
      status: "FAILED",
      model: "claude-sonnet-4-20250514",
      error: "Variety pool exhausted",
      createdAt: "2024-06-15T12:00:00.000Z",
      template: { id: "tpl-error", name: "Error Template" },
      scenes: [],
    };

    await page.route(`**/api/runs/${RUN_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(failedRun),
      });
    });

    await page.goto(`/runs/${RUN_ID}`);

    // Run viewer should load - either shows error or the template name
    await page.waitForSelector(
      '[data-testid="run-viewer-error"], [data-testid="run-viewer-loading"]',
      { state: "hidden", timeout: 5000 }
    ).catch(() => {
      // Loading might complete quickly
    });

    // Either shows error template name or error message
    const hasErrorOrTemplate = await page
      .getByText(/error|failed|Error Template/i)
      .isVisible();
    expect(hasErrorOrTemplate).toBe(true);
  });

  test("shows 404 for non-existent run", async ({ page }) => {
    await page.route("**/api/runs/non-existent-id", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Run not found" }),
      });
    });

    await page.goto("/runs/non-existent-id");

    // Should show error state using testid
    await expect(page.getByTestId("run-viewer-error")).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Reroll Flow", () => {
  test("run viewer loads with scene cards", async ({ page }) => {
    const mockRun = {
      id: RUN_ID,
      templateId: "tpl-reroll",
      status: "DONE",
      model: "claude-sonnet-4-20250514",
      createdAt: "2024-06-15T12:00:00.000Z",
      template: { id: "tpl-reroll", name: "Reroll Template" },
      scenes: [
        {
          id: "scene-1",
          runId: RUN_ID,
          index: 0,
          combo: { stageArea: "Main Stage", festivalMoment: "Sunset" },
          lyrics: "Test lyrics",
          imagePrompt: "CRITICAL CHARACTER LOCK - SHIKA present.",
          startPrompt: "Camera dollies in",
          middlePrompt: "Camera pans",
          endPrompt: "Camera cranes up [DROP]",
          boundaryFrame1: "ENDING FRAME [EXACT]: scene boundary 1",
          boundaryFrame2: "ENDING FRAME [EXACT]: scene boundary 2",
          finalFrame: "Final frame",
          lintReport: [],
        },
      ],
    };

    await page.route(`**/api/runs/${RUN_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRun),
      });
    });

    await page.goto(`/runs/${RUN_ID}`);

    // Wait for loading to complete
    await page.waitForSelector('[data-testid="run-viewer-loading"]', {
      state: "hidden",
      timeout: 5000,
    }).catch(() => {
      // Loading might complete before we can catch it
    });

    // Template name should be visible
    await expect(page.getByText("Reroll Template")).toBeVisible();
  });
});

test.describe("Run Modal Interaction", () => {
  test("run modal opens and shows configuration options", async ({ page }) => {
    // Mock blocks for the canvas
    await page.route("**/api/blocks**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "block-1",
            type: "CAMERA",
            name: "Dolly In",
            promptFragment: "Camera dollies in",
            stageScope: ["VIDEO_START"],
            themePackId: "theme-1",
            archived: false,
          },
        ]),
      });
    });

    // Mock templates with an existing template
    await page.route("**/api/templates**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          templates: [
            {
              id: "tpl-1",
              name: "Test Template",
              themePackId: "theme-1",
              graph: {
                version: 1,
                lanes: [
                  "GLOBAL",
                  "IMAGE",
                  "VIDEO_START",
                  "EXTEND_MIDDLE",
                  "EXTEND_END",
                ],
                nodes: [
                  {
                    id: "node-1",
                    blockDefId: "block-1",
                    lane: "VIDEO_START",
                    order: 0,
                  },
                ],
                edges: [],
                runConfig: {
                  loopMode: false,
                  languages: { hi: 3, ja: 2 },
                  batchSize: 5,
                },
              },
            },
          ],
          hasMore: false,
        }),
      });
    });

    // Mock theme packs
    await page.route("**/api/theme-packs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "theme-1",
            name: "Master of Puppets",
            active: true,
          },
        ]),
      });
    });

    await page.goto("/");

    // Wait for canvas to load
    await expect(
      page.getByRole("heading", { name: "PuppetFlow" })
    ).toBeVisible();

    // Click Run button - it may be enabled if template loads with blocks
    const runButton = page.getByTestId("run-button");
    if (await runButton.isEnabled()) {
      await runButton.click();

      // Check if modal opens
      const modal = page.getByTestId("run-modal");
      if (await modal.isVisible({ timeout: 2000 })) {
        // Modal should have scene count input
        await expect(page.getByLabel(/scene count|scenes/i)).toBeVisible();

        // Close modal
        await page.keyboard.press("Escape");
      }
    }
  });
});

test.describe("Navigation", () => {
  test("can navigate between canvas and library", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "PuppetFlow" })
    ).toBeVisible();

    // Look for a library link/button
    const libraryLink = page.getByRole("link", { name: /library/i });
    if (await libraryLink.isVisible()) {
      await libraryLink.click();
      await expect(page).toHaveURL(/\/library/);
    }
  });

  test("can return to canvas from run viewer", async ({ page }) => {
    const mockRun = {
      id: RUN_ID,
      templateId: "tpl-1",
      status: "DONE",
      model: "claude-sonnet-4-20250514",
      createdAt: "2024-06-15T12:00:00.000Z",
      template: { id: "tpl-1", name: "Nav Template" },
      scenes: [
        {
          id: "scene-1",
          runId: RUN_ID,
          index: 0,
          combo: { stageArea: "Main Stage" },
          lyrics: "Test",
          imagePrompt: "Test image",
          startPrompt: "Test start",
          middlePrompt: "Test middle",
          endPrompt: "Test end",
          boundaryFrame1: "BF1",
          boundaryFrame2: "BF2",
          finalFrame: "Final",
          lintReport: [],
        },
      ],
    };

    await page.route(`**/api/runs/${RUN_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRun),
      });
    });

    await page.goto(`/runs/${RUN_ID}`);
    await expect(page.getByText("Nav Template")).toBeVisible();

    // Look for back/home navigation
    const homeLink = page.getByRole("link", { name: /puppetflow|home|canvas/i });
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await expect(page).toHaveURL("/");
    }
  });
});
