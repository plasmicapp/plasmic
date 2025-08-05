import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5 Pagination`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/pagination.json",
          projectName: "Antd5 Pagination",
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

      test(`Pagination state`, async ({ page }) => {
        await page.goto(`${ctx.host}/pagination-test`);

        await expect(page.locator("#pagination-current-page-state")).toHaveText(
          "4"
        );
        await expect(page.locator("#pagination-page-size-state")).toHaveText(
          "20"
        );
        await expect(page.locator("#pagination-start-index-state")).toHaveText(
          "60"
        );
        await expect(page.locator("#pagination-end-index-state")).toHaveText(
          "79"
        );
        await expect(page.locator("#countries > div:first-child")).toHaveText(
          "61. Dominica"
        );
        await expect(page.locator("#countries > div:last-child")).toHaveText(
          "80. Georgia"
        );

        await expect(
          page.locator(
            ".ant-pagination-item[title='3'] a[href='https://test.com?_page=3&_limit=20'][rel='prev']"
          )
        ).toBeVisible();

        await page.locator(`.ant-pagination-item[title='3']`).click();

        await expect(page.locator("#pagination-current-page-state")).toHaveText(
          "3"
        );
        await expect(page.locator("#pagination-page-size-state")).toHaveText(
          "20"
        );
        await expect(page.locator("#pagination-start-index-state")).toHaveText(
          "40"
        );
        await expect(page.locator("#pagination-end-index-state")).toHaveText(
          "59"
        );
        await expect(page.locator("#countries > div:first-child")).toHaveText(
          "41. Cayman Islands"
        );
        await expect(page.locator("#countries > div:last-child")).toHaveText(
          "60. Djibouti"
        );
      });
    });
  }
});
