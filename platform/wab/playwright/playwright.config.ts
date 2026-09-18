import { defineConfig, devices } from "@playwright/test";
import { E2E_DEVFLAGS_COOKIE_NAME } from "../src/wab/shared/e2e";

const baseURL = process.env.WAB_HOST ?? "http://localhost:3003";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 8 : undefined,
  reporter: process.env.CI
    ? [["github"], ["playwright-ctrf-json-reporter", {}]]
    : [
        [
          "html",
          {
            host: "127.0.0.1",
            port: Number(process.env.PLAYWRIGHT_REPORTER_PORT ?? 9323),
            open: process.env.PLAYWRIGHT_REPORTER_OPEN ?? "on-failure",
          },
        ],
      ],
  timeout: 400_000,
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    baseURL,
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    video: process.env.CI ? "on-first-retry" : "retain-on-failure",
    storageState: {
      cookies: [
        {
          name: E2E_DEVFLAGS_COOKIE_NAME,
          value: "1",
          domain: new URL(baseURL).hostname,
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
