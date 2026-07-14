/**
 * T408 — Playwright smoke: unauthenticated requests get Basic auth challenge
 */

import { test, expect } from "@playwright/test";

test.describe("Basic auth challenge (T408)", () => {
  test.use({
    // Override global httpCredentials from playwright.config
    httpCredentials: undefined,
  });

  test("unauthenticated GET / returns 401 with WWW-Authenticate", async ({
    browser,
    baseURL,
  }) => {
    // Fresh context with no stored credentials
    const context = await browser.newContext({
      baseURL,
      httpCredentials: undefined,
    });
    const page = await context.newPage();

    const response = await page.goto("/", { waitUntil: "commit" });
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(401);

    const www = response!.headers()["www-authenticate"] ?? "";
    expect(www.toLowerCase()).toContain("basic");

    await context.close();
  });

  test("unauthenticated GET /api/runs returns 401", async ({
    playwright,
    baseURL,
  }) => {
    // Playwright test runner injects config httpCredentials into newContext
    // unless the key is present. Pass undefined explicitly to opt out
    // (same pattern as browser.newContext above).
    const api = await playwright.request.newContext({
      baseURL,
      httpCredentials: undefined,
    });
    try {
      const response = await api.get("/api/runs");
      expect(response.status()).toBe(401);
      const www = response.headers()["www-authenticate"] ?? "";
      expect(www.toLowerCase()).toContain("basic");
    } finally {
      await api.dispose();
    }
  });
});
