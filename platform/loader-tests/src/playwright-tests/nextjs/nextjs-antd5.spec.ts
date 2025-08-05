import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "plasmic-antd5.json",
          projectName: "Antd project",
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

      test(`it works`, async ({ page }) => {
        await page.goto(ctx.host);

        await page.locator("input.ant-input").type("hello input!");
        await expect(page.locator("input.ant-input")).toHaveValue(
          "hello input!"
        );
        await expect(page.locator(`[data-test-id="input-state"]`)).toHaveText(
          "hello input!"
        );

        await page.locator("textarea.ant-input").type("hello textarea!");
        await expect(page.locator("textarea.ant-input")).toHaveValue(
          "hello textarea!"
        );
        await expect(
          page.locator(`[data-test-id="textarea-state"]`)
        ).toHaveText("hello textarea!");

        await expect(
          page.locator(`[data-test-id="checkbox-state"]`)
        ).toHaveText("Not checked");
        await page.locator(".ant-checkbox-wrapper").click();
        await expect(
          page.locator(`[data-test-id="checkbox-state"]`)
        ).toHaveText("Checked!");
      });
    });
  }
});
