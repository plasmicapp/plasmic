import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

for (const { loaderVersion, nextVersion } of LOADER_NEXTJS_VERSIONS) {
  test.describe(`NextJS App Hosting loader-nextjs@${loaderVersion}, next@${nextVersion}`, () => {
    let ctx: NextJsContext;

    test.beforeAll(async () => {
      ctx = await setupNextJs({
        bundleFile: "app-hosting.json",
        projectName: "App Hosting Example",
        npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
        codegenHost: getEnvVar("WAB_HOST"),
        removeComponentsPage: true,
        loaderVersion,
        nextVersion,
      });
    });

    test.afterAll(async () => {
      await teardownNextJs(ctx);
    });

    test(`should work`, async ({ page }) => {
      await page.goto(`${ctx.host}/badge`);

      await expect(
        page.locator('[data-test-id="badge"]').first()
      ).toBeVisible();
      await expect(page.locator('[data-test-id="badge"]').first()).toHaveCSS(
        "background-color",
        "rgb(51, 255, 0)"
      );
      await expect(
        page.locator('[data-test-id="badge"]').first()
      ).toContainText("Hello Plasmic!");

      await page.getByText("Click here").first().click();
      await page.waitForTimeout(50);
      await page.getByText("Click here").first().click();

      await expect(page.getByText("You clicked 2 times").first()).toBeVisible();
      await expect(page.getByText("super-secret").first()).toBeVisible();
      await expect(page.getByText("I'm in the fetcher!").first()).toBeVisible();
    });
  });
}
