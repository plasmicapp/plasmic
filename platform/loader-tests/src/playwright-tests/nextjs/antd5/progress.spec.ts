import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5 Progress`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/progress.json",
          projectName: "Antd5 Progress",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });
      test(`Progress state`, async ({ page }) => {
        await page.goto(`${ctx.host}/progress-test`);

        await expect(page.locator(".ant-progress-text")).toHaveText("0/0");
        await expect(
          page.locator(`.ant-progress[aria-valuenow="0"]`)
        ).toBeVisible();
        await expect(
          page.locator(`.ant-progress[aria-valuenow="5"]`)
        ).not.toBeVisible();
        await page.locator(`#percent-control-panel button:first-child`).click();
        await page.locator(`#percent-control-panel button:first-child`).click();
        await page.locator(`#percent-control-panel button:first-child`).click();
        await page.locator(`#percent-control-panel button:first-child`).click();
        await page.locator(`#percent-control-panel button:first-child`).click();
        await page.locator(`#percent-control-panel button:last-child`).click();

        await page
          .locator(`#success-percent-control-panel button:first-child`)
          .click();
        await page
          .locator(`#success-percent-control-panel button:first-child`)
          .click();
        await page
          .locator(`#success-percent-control-panel button:last-child`)
          .click();

        await expect(page.locator(".ant-progress-text")).toHaveText("5/20");

        await expect(
          page.locator(`.ant-progress[aria-valuenow="0"]`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-progress[aria-valuenow="5"]`)
        ).toBeVisible();
      });
    });
  }
});
