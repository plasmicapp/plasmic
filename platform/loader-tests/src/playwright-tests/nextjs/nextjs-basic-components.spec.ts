import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

for (const { loaderVersion, nextVersion } of LOADER_NEXTJS_VERSIONS) {
  test.describe(`NextJS Basic Components loader-nextjs@${loaderVersion}, next@${nextVersion}`, () => {
    let ctx: NextJsContext;

    test.beforeAll(async () => {
      ctx = await setupNextJs({
        bundleFile: "plasmic-basic-components-example.json",
        projectName: "Basic Components",
        removeComponentsPage: true,
        loaderVersion,
        nextVersion,
      });
    });

    test.afterAll(async () => {
      await teardownNextJs(ctx);
    });

    test(`should work`, async ({ page }) => {
      await page.goto(ctx.host);

      await expect(page.getByText("Test embed")).toBeVisible();
      await expect(page.getByText("Test embed")).toHaveCSS(
        "background-color",
        "rgb(255, 0, 0)"
      );
      await expect(page.locator("div.video-wrapper > video")).toBeVisible();
      await expect(page.locator("div.iframe-wrapper > iframe")).toBeVisible();
    });
  });
}
