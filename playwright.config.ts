import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Load .env so APP_USER / APP_PASSWORD are available for httpCredentials
loadEnv({ path: ".env" });

const appUser = process.env.APP_USER?.trim() ?? "";
const appPassword = process.env.APP_PASSWORD ?? "";
const hasBasicAuth =
  process.env.DISABLE_BASIC_AUTH !== "true" &&
  process.env.DISABLE_BASIC_AUTH !== "1" &&
  appUser.length > 0 &&
  appPassword.length > 0;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Authenticated by default so smoke/run-flow pass behind T501 middleware
    ...(hasBasicAuth
      ? {
          httpCredentials: {
            username: appUser,
            password: appPassword,
          },
        }
      : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // Pass auth env through to Next middleware (string map only)
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
  },
});
