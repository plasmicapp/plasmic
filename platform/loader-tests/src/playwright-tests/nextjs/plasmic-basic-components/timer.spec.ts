import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Timer`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "plasmic-basic-components/timer.json",
          projectName: "Timer",
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
      test(`works`, async ({ page }) => {
        await page.goto(`${ctx.host}/timer-test`);

        await expect(page.locator("#count-text")).toHaveText("0");
        await page.waitForTimeout(5000);
        await expect(page.locator("#count-text")).toHaveText("0");
        await page.locator(`text=Start`).click();
        await page.waitForTimeout(1000);
        await expect(page.locator("#count-text")).toHaveText("1");
        await page.waitForTimeout(2000);
        await expect(page.locator("#count-text")).toHaveText("3");
        await page.locator(`text=Stop`).click();
        await page.waitForTimeout(5000);
        await expect(page.locator("#count-text")).toHaveText("3");
      });
    });
  }
});
