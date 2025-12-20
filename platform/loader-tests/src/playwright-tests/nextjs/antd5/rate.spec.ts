import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5 Rate`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/rate.json",
          projectName: "Antd5 Rate",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test(`Rate state`, async ({ page }) => {
        await page.goto(`${ctx.host}/rate-test`);

        await expect(page.locator("#rate-state")).toHaveText("3");
        await expect(
          page.locator(".ant-rate-star.ant-rate-star-full")
        ).toHaveCount(3);
        await expect(
          page.locator(".ant-rate-star.ant-rate-star-zero")
        ).toHaveCount(7);
        await page.locator(".ant-rate-star:nth-child(5)").click();

        await expect(page.locator("#rate-state")).toHaveText("5");
        await expect(
          page.locator(".ant-rate-star.ant-rate-star-full")
        ).toHaveCount(5);
        await expect(
          page.locator(".ant-rate-star.ant-rate-star-zero")
        ).toHaveCount(5);
        await page.locator(".ant-rate-star:nth-child(10)").click();

        await expect(page.locator("#rate-state")).toHaveText("10");
        await expect(
          page.locator(".ant-rate-star.ant-rate-star-full")
        ).toHaveCount(10);
        await expect(
          page.locator(".ant-rate-star.ant-rate-star-zero")
        ).toHaveCount(0);
      });
    });
  }
});
