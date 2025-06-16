import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Radix UI Popover`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "radix-ui/popover.json",
          projectName: "Radix UI Popover",
          npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
          codegenHost: getEnvVar("WAB_HOST"),
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      const textId = "#popover-open-state-text";
      const popoverContentLocator = `text="Here is the popover content."`;
      test(`works`, async ({ page }) => {
        await page.goto(`${ctx.host}/popover-test`);

        await expect(page.locator(textId)).toHaveText("popover is closed");
        await expect(page.locator(popoverContentLocator)).not.toBeVisible();

        await page.locator(`text="Show popover"`).click();
        await expect(page.locator(textId)).toHaveText("popover is open");
        await expect(page.locator(popoverContentLocator)).toBeVisible();

        await page.locator(`text="Elsewhere"`).click();
        await expect(page.locator(textId)).toHaveText("popover is closed");
        await expect(page.locator(popoverContentLocator)).not.toBeVisible();
      });
    });
  }
});
