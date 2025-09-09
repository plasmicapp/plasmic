import { defineConfig, devices } from "@playwright/test";

// By default, runs in headless mode, unless PLAYWRIGHT_HEADFUL=true. That's because
// screenshots created may differ between headless and headful mode!
const headless = process.env["PLAYWRIGHT_HEADFUL"] !== "true";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./src/playwright-tests",
  fullyParallel: true,
  /* Run tests in files in parallel */
  // fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 1,
  // retries: process.env.CI ? 2 : 0,
  /* The `undefined` (default) number of workers is chosen based on the number of CPUs. */
  workers: undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [["github"], ["playwright-ctrf-json-reporter", {}]]
    : "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "retain-on-failure",
    video: "retain-on-failure",
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  },
  timeout: 900000, // 10 minutes, to saturate CI server parallelism - there are a lot of yarn mutexes
  expect: {
    timeout: 60000, // 1 minute,
    toHaveScreenshot: {},
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless,
        launchOptions: {
          args: ["--disable-web-security"],
        },
      },
    },
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     launchOptions: {
    //       firefoxUserPrefs: {
    //         'security.tls.insecure_fallback_hosts': 'localhost',
    //         'dom.disable_beforeunload': true,
    //         'security.mixed_content.block_active_content': false,
    //         'security.mixed_content.block_display_content': false,
    //         'security.fileuri.strict_origin_policy': false
    //       }
    //     }
    //   },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ..devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
