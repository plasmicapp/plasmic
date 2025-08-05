import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5 Segmented`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/segmented.json",
          projectName: "Antd5 Segmented",
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

      test(`Segmented state`, async ({ page }) => {
        await page.goto(`${ctx.host}/segmented-test`);

        await expect(page.locator("#segmented-state")).toHaveText("");
        await page.getByText(`Option 2`).click();
        await expect(page.locator("#segmented-state")).toHaveText("Option 2");
        await page.getByText(`Option 4`).click();
        await expect(page.locator("#segmented-state")).toHaveText("Option 4");
      });
    });
  }
});
