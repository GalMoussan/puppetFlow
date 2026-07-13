/**
 * Playwright smoke: full run experience (mocked API)
 *
 * Phase 4 - T407
 * Smoke #2: run viewer → 5 cards → copy image prompt
 * Smoke #3: export downloads markdown with date header
 */

import { test, expect } from "@playwright/test";

const RUN_ID = "run-e2e-001";

function buildMockRun(sceneCount = 5) {
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    id: `scene-${i + 1}`,
    runId: RUN_ID,
    index: i,
    combo: {
      stageArea: "Main Stage",
      festivalMoment: "Sunset",
      language: i % 2 === 0 ? "hi" : "ja",
    },
    lyrics: `Scene ${i + 1} lyrics\nShika! Shilshul!`,
    imagePrompt: `CRITICAL CHARACTER LOCK - SHIKA present. Scene ${i + 1} image festival stage UV violet.`,
    startPrompt: `Camera dollies in on scene ${i + 1}`,
    middlePrompt: `Camera pans across scene ${i + 1}`,
    endPrompt: `Camera cranes up scene ${i + 1} [DROP]`,
    boundaryFrame1: `ENDING FRAME [EXACT]: scene ${i + 1} start boundary`,
    boundaryFrame2: `ENDING FRAME [EXACT]: scene ${i + 1} end boundary`,
    finalFrame: `Final frame ${i + 1}`,
    lintReport: [],
    notes: null,
  }));

  return {
    id: RUN_ID,
    templateId: "tpl-e2e",
    status: "DONE",
    model: "claude-sonnet-4-20250514",
    scaffold: "# Scaffold for E2E\n\nCreative brief content",
    createdAt: "2024-06-15T12:00:00.000Z",
    updatedAt: "2024-06-15T12:02:00.000Z",
    template: { id: "tpl-e2e", name: "E2E Master Template" },
    scenes,
  };
}

test.describe("Run flow (mocked API)", () => {
  test("smoke #2: run viewer shows 5 cards and copy image prompt works", async ({
    page,
  }) => {
    const mockRun = buildMockRun(5);

    await page.route(`**/api/runs/${RUN_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRun),
      });
    });

    await page.goto(`/runs/${RUN_ID}`);

    await expect(
      page.getByRole("heading", { name: "E2E Master Template" })
    ).toBeVisible();

    const cards = page.locator('[data-testid^="scene-card-"]');
    await expect(cards).toHaveCount(5);

    // Grant clipboard permissions where supported
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    await page
      .getByRole("button", { name: /copy image prompt/i })
      .first()
      .click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("CRITICAL CHARACTER LOCK - SHIKA");
    expect(clipboard).toContain("Scene 1 image");
  });

  test("smoke #3: export scenes downloads markdown starting with date header", async ({
    page,
  }) => {
    const mockRun = buildMockRun(5);
    const exportBody = `# 2024-06-15\n\n## Scene 1\n\nExported scenes content\n`;

    await page.route(`**/api/runs/${RUN_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRun),
      });
    });

    await page.route(`**/api/export/${RUN_ID}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/markdown",
        headers: {
          "Content-Disposition": `attachment; filename="scenes-2024-06-15.md"`,
        },
        body: exportBody,
      });
    });

    await page.goto(`/runs/${RUN_ID}`);
    await expect(page.getByTestId("scene-cards-grid")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export scenes/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/2024-06-15/);

    const path = await download.path();
    expect(path).toBeTruthy();
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(path!, "utf-8");
    expect(content.startsWith("# 2024-06-15") || content.includes("2024-06-15")).toBe(
      true
    );
    expect(content).toMatch(/^#\s*2024-06-15/m);
  });

  test("canvas homepage still loads with Run control", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "PuppetFlow" })).toBeVisible();
    await expect(page.getByRole("button", { name: /run/i })).toBeVisible();
  });
});
