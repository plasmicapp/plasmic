import { expect } from "@playwright/test";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import { NextJsContext, teardownNextJs } from "../../nextjs/nextjs-setup";
import { authNextJsSetup } from "../auth-test-utils";

test.describe(`Plasmic Auth`, async () => {
  test.describe("Flow navigation with PageGuard", async () => {
    let ctx: NextJsContext;
    test.beforeEach(async ({ request }) => {
      const bundleFile = "auth-e2e.json";

      ctx = await authNextJsSetup({
        request,
        bundleFile,
        template: "plasmic-auth",
        projectName: "Plasmic Auth",
        npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
        codegenHost: getEnvVar("WAB_HOST"),
        wabHost: getEnvVar("WAB_HOST"),
        appAuthOpts: {
          provider: "plasmic-auth",
        },
      });
    });

    test.afterEach(async () => {
      await teardownNextJs(ctx);
    });

    test(`it works`, async ({ page }) => {
      const waitForAuthorizationPagePromise = page.waitForURL("**/authorize**");
      await page.goto(`${ctx.host}/normal-user`);
      await waitForAuthorizationPagePromise;

      await page.waitForSelector('text="Authe2e"');

      await page
        .getByPlaceholder("Email address")
        .fill("admin@admin.example.com");
      await page.getByPlaceholder("Password").fill("!53kr3tz!");

      const waitForNormalUserPagePromise = page.waitForURL("**/normal-user**");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await waitForNormalUserPagePromise;

      await page.waitForSelector("text=normal user role required");

      await page.waitForSelector('text="normal user role required"');
      await page.waitForSelector('text="Email: admin@admin.example.com"');
    });
  });

  test.describe("Flow navigation with interaction", async () => {
    let ctx: NextJsContext;
    test.beforeEach(async ({ request }) => {
      const bundleFile = "simpler-auth.json";

      ctx = await authNextJsSetup({
        request,
        bundleFile,
        template: "plasmic-auth",
        projectName: "Plasmic Auth",
        npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
        codegenHost: getEnvVar("WAB_HOST"),
        wabHost: getEnvVar("WAB_HOST"),
        keepRedirectUri: true,
        appAuthOpts: {
          provider: "plasmic-auth",
        },
      });
    });

    test.afterEach(async () => {
      await teardownNextJs(ctx);
    });

    test(`it works`, async ({ page }) => {
      const home = `${ctx.host}/`;
      page.on("request", (request) => {
        const rawUrl = request.url();
        if (
          rawUrl.startsWith("https:") ||
          rawUrl.includes("_next") ||
          rawUrl.includes("static")
        ) {
          return;
        }

        const url = new URL(rawUrl);

        // Be sure that we will never pass through the home page
        expect(home).not.toEqual(url.origin + url.pathname);
      });

      // Load first page
      await page.goto(`${ctx.host}/page-1`);

      await page.waitForSelector("text=Current User: Unlogged");

      // Request first login
      const waitForAuthorizationPagePromise = page.waitForURL("**/authorize**");
      await page.getByRole("button", { name: "Login" }).click();
      await waitForAuthorizationPagePromise;

      await page.waitForSelector('text="Authe2e"');

      // Login
      await page
        .getByPlaceholder("Email address")
        .fill("admin@admin.example.com");
      await page.getByPlaceholder("Password").fill("!53kr3tz!");

      // Wait for page 2
      const waitForPage2Promise = page.waitForURL("**/page-2**");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await waitForPage2Promise;

      // Check that we are logged in
      await page.waitForSelector("text=Current User: admin@admin.example.com");

      // Request another login, now just required to authorize
      const waitForAuthorizationPage2Promise =
        page.waitForURL("**/authorize**");
      await page.getByRole("button", { name: "Login" }).click();
      await waitForAuthorizationPage2Promise;

      await page.waitForSelector('text="Authe2e"');

      // Wait for page 3
      const waitForPage3Promise = page.waitForURL("**/page-3**");
      await page.getByRole("button", { name: "Sign in" }).click();
      await waitForPage3Promise;

      // Check that we are logged in
      await page.waitForSelector("text=Current User: admin@admin.example.com");

      // Logout
      await page.getByRole("button", { name: "Logout" }).click();
      await page.waitForSelector("text=Current User: Unlogged");

      // Trigger login again
      const waitForAuthorizationPage1Promise =
        page.waitForURL("**/authorize**");
      await page.getByRole("button", { name: "Login" }).click();
      await waitForAuthorizationPage1Promise;

      await page.waitForSelector('text="Authe2e"');

      const waitForPage1Promise = page.waitForURL("**/page-1**");
      await page.getByRole("button", { name: "Sign in" }).click();
      await waitForPage1Promise;

      // Check that we are back to page1 and logged in
      await page.waitForSelector("text=Page 1");
      await page.waitForSelector("text=Current User: admin@admin.example.com");
    });
  });
});
