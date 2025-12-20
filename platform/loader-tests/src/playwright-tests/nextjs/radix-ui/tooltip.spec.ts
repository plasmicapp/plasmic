import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Radix UI Tooltip`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "radix-ui/tooltip.json",
          projectName: "Radix UI Tooltip",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      const locator = `text="Here is the tooltip content."`;
      test(`works`, async ({ page }) => {
        await page.goto(`${ctx.host}/tooltip-test`);

        await expect(page.locator(locator).nth(0)).not.toBeVisible();

        await page.locator(`text="I have a tooltip."`).hover();
        await page.waitForTimeout(1000);
        await expect(page.locator(locator).nth(0)).toBeVisible();

        await page.locator(`text="Elsewhere"`).click();
        await page.waitForTimeout(1000);
        await expect(page.locator(locator).nth(0)).not.toBeVisible();
      });
    });
  }
});
