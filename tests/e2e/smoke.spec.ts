import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage loads and displays PuppetFlow title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "PuppetFlow" })).toBeVisible();
  });

  test("page has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PuppetFlow/);
  });
});
