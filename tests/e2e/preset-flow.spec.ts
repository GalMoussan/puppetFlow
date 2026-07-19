/**
 * E2E Test: Preset to Run Flow
 *
 * Phase 6 - T613
 * Tests the full preset workflow:
 * - New Template button opens PresetPicker
 * - Selecting a preset shows name input
 * - Creating template loads it into canvas
 * - Run modal shows preset-aware config
 */

import { test, expect } from "@playwright/test";

// Mock preset data
const MOCK_PRESETS = [
  {
    id: "preset-brainrot",
    name: "Brainrot Chaos",
    description: "Maximum chaos, rapid cuts, glitch aesthetic",
    category: "BRAINROT",
    guidelines: ["0.5s beat intervals", "Chaotic pacing", "Jumpscare hooks"],
    isSystem: true,
  },
  {
    id: "preset-festival",
    name: "Festival Hype",
    description: "High energy festival vibes with build-ups",
    category: "FESTIVAL",
    guidelines: ["Build to drop", "UV violet aesthetic", "Crowd energy"],
    isSystem: true,
  },
  {
    id: "preset-educational",
    name: "Edutainment Explainer",
    description: "Educational content with engaging visuals",
    category: "EDUCATIONAL",
    guidelines: ["Clear explanations", "Visual aids", "Question hooks"],
    isSystem: true,
  },
];

// Mock template response after creation
function buildMockTemplate(presetId: string | null, name: string) {
  return {
    id: "tpl-new-001",
    name,
    themePackId: "pack-001",
    presetId,
    graph: {
      version: 1,
      lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      nodes: [],
      edges: [],
      runConfig: {
        loopMode: true,
        languages: { hi: 3, ja: 2 },
        batchSize: 5,
        pacingStyle: presetId === "preset-brainrot" ? "chaotic" : "normal",
        beatInterval: presetId === "preset-brainrot" ? 0.5 : 2,
        targetPlatform: "tiktok",
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Mock theme pack for canvas bootstrap
const MOCK_THEME_PACK = {
  id: "pack-001",
  name: "Master of Puppets",
  blockDefs: [
    {
      id: "bd-001",
      name: "Global Style",
      type: "GLOBAL_SETTING",
      promptFragment: "UV violet aesthetic",
      stageScope: ["GLOBAL"],
    },
  ],
};

test.describe("Preset Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints
    await page.route("**/api/presets", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: MOCK_PRESETS }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/templates/from-preset", async (route) => {
      const body = route.request().postDataJSON();
      const template = buildMockTemplate(body?.presetId, body?.name || "New Template");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: template }),
      });
    });

    await page.route("**/api/templates?limit=1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }), // No existing templates
      });
    });

    await page.route("**/api/templates/*", async (route) => {
      const template = buildMockTemplate(null, "Test Template");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(template),
      });
    });

    await page.route("**/api/theme-packs?limit=1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [{ id: MOCK_THEME_PACK.id }] }),
      });
    });

    await page.route(`**/api/theme-packs/${MOCK_THEME_PACK.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_THEME_PACK),
      });
    });

    await page.route("**/api/llm/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          provider: "deepseek",
          hasKey: true,
          defaultModel: "deepseek-chat",
          models: [
            { value: "deepseek-chat", label: "DeepSeek Chat" },
            { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
          ],
        }),
      });
    });
  });

  test("clicking New opens PresetPicker modal", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "PuppetFlow" })).toBeVisible();

    // Click New button
    await page.getByTestId("nav-new-template").click();

    // PresetPicker modal should be visible
    await expect(page.getByRole("heading", { name: /choose a template/i })).toBeVisible();

    // Should show category tabs
    await expect(page.getByRole("tab", { name: /all/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /brainrot/i })).toBeVisible();

    // Should show preset cards
    await expect(page.getByText("Brainrot Chaos")).toBeVisible();
    await expect(page.getByText("Festival Hype")).toBeVisible();

    // Should show blank template option
    await expect(page.getByText("Start from Scratch")).toBeVisible();
  });

  test("selecting Brainrot preset shows name input and creates template", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "PuppetFlow" })).toBeVisible();

    // Open preset picker
    await page.getByTestId("nav-new-template").click();
    await expect(page.getByRole("heading", { name: /choose a template/i })).toBeVisible();

    // Click on Brainrot Chaos card
    await page.getByText("Brainrot Chaos").click();

    // Use Preset button should be enabled
    const usePresetBtn = page.getByRole("button", { name: /use preset/i });
    await expect(usePresetBtn).toBeEnabled();

    // Click Use Preset
    await usePresetBtn.click();

    // Should show name input step
    await expect(page.getByRole("heading", { name: /name your template/i })).toBeVisible();
    await expect(page.getByText("Based on")).toBeVisible();
    await expect(page.getByText("Brainrot Chaos")).toBeVisible();

    // Name input should have default value
    const nameInput = page.getByLabel(/template name/i);
    await expect(nameInput).toHaveValue("Brainrot Chaos Template");

    // Clear and enter custom name
    await nameInput.clear();
    await nameInput.fill("My Brainrot Video");

    // Create template
    await page.getByRole("button", { name: /create template/i }).click();

    // Modal should close and template should load
    await expect(page.getByRole("heading", { name: /name your template/i })).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText(/template created/i)).toBeVisible();
  });

  test("selecting blank template skips preset selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "PuppetFlow" })).toBeVisible();

    // Open preset picker
    await page.getByTestId("nav-new-template").click();
    await expect(page.getByRole("heading", { name: /choose a template/i })).toBeVisible();

    // Click blank template option
    await page.getByText("Start from Scratch").click();

    // Should immediately show name input with blank template
    await expect(page.getByRole("heading", { name: /name your template/i })).toBeVisible();
    await expect(page.getByText("Blank Template")).toBeVisible();

    // Name input should have generic default
    const nameInput = page.getByLabel(/template name/i);
    await expect(nameInput).toHaveValue("New Template");
  });

  test("category tabs filter presets correctly", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-new-template").click();
    await expect(page.getByRole("heading", { name: /choose a template/i })).toBeVisible();

    // All tab shows all presets
    await expect(page.getByText("Brainrot Chaos")).toBeVisible();
    await expect(page.getByText("Festival Hype")).toBeVisible();
    await expect(page.getByText("Edutainment Explainer")).toBeVisible();

    // Click Brainrot tab
    await page.getByRole("tab", { name: /brainrot/i }).click();

    // Should only show Brainrot preset
    await expect(page.getByText("Brainrot Chaos")).toBeVisible();
    await expect(page.getByText("Festival Hype")).not.toBeVisible();

    // Click Festival tab
    await page.getByRole("tab", { name: /festival/i }).click();

    // Should only show Festival preset
    await expect(page.getByText("Festival Hype")).toBeVisible();
    await expect(page.getByText("Brainrot Chaos")).not.toBeVisible();
  });

  test("Run modal shows preset-aware config fields", async ({ page }) => {
    await page.goto("/");

    // Create a template from preset first
    await page.getByTestId("nav-new-template").click();
    await page.getByText("Brainrot Chaos").click();
    await page.getByRole("button", { name: /use preset/i }).click();
    await page.getByRole("button", { name: /create template/i }).click();

    // Wait for template to load
    await expect(page.getByText(/template created/i)).toBeVisible();

    // Click Run button
    await page.getByRole("button", { name: /run/i }).click();

    // Run modal should show preset-aware fields
    await expect(page.getByTestId("run-modal")).toBeVisible();

    // Check for pacing style selector
    await expect(page.getByLabel(/pacing/i)).toBeVisible();

    // Check for beat interval slider
    await expect(page.getByText(/beat interval/i)).toBeVisible();

    // Check for platform selector
    await expect(page.getByLabel(/platform/i)).toBeVisible();

    // Check for hook style selector
    await expect(page.getByLabel(/hook style/i)).toBeVisible();
  });

  test("back button in name step returns to preset picker", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-new-template").click();

    // Select a preset
    await page.getByText("Festival Hype").click();
    await page.getByRole("button", { name: /use preset/i }).click();

    // Should be on name step
    await expect(page.getByRole("heading", { name: /name your template/i })).toBeVisible();

    // Click back button
    await page.getByRole("button", { name: /back to preset selection/i }).click();

    // Should be back on preset picker
    await expect(page.getByRole("heading", { name: /choose a template/i })).toBeVisible();
    await expect(page.getByText("Festival Hype")).toBeVisible();
  });

  test("close button dismisses modal at any step", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-new-template").click();

    // Should be on preset picker
    await expect(page.getByRole("heading", { name: /choose a template/i })).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /close/i }).click();

    // Modal should be closed
    await expect(page.getByRole("heading", { name: /choose a template/i })).not.toBeVisible();

    // Open again and go to name step
    await page.getByTestId("nav-new-template").click();
    await page.getByText("Brainrot Chaos").click();
    await page.getByRole("button", { name: /use preset/i }).click();

    // Should be on name step
    await expect(page.getByRole("heading", { name: /name your template/i })).toBeVisible();

    // Close from name step
    await page.getByRole("button", { name: /close/i }).click();

    // Modal should be closed
    await expect(page.getByRole("heading", { name: /name your template/i })).not.toBeVisible();
  });
});
