import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5 Popover`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/popover.json",
          projectName: "Antd5 Popover",
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

      test(`Popover state`, async ({ page }) => {
        await page.goto(`${ctx.host}/popover-test`);

        await expect(page.locator("#popover-state-text")).toHaveText("Closed!");
        await expect(page.locator(`.ant-popover`)).not.toBeVisible();

        await page.getByText(`Click me!`).click();

        await expect(page.locator("#popover-state-text")).toHaveText("Opened!");
        await expect(page.locator(`.ant-popover`)).toBeVisible();

        await page.getByText(`Click me!`).click();

        await expect(page.locator("#popover-state-text")).toHaveText("Closed!");
        await expect(page.locator(`.ant-popover`)).not.toBeVisible();
      });
    });
  }
});
