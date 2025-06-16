import { expect, Page } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

async function checkActiveTab(page: Page, activeIndex: number) {
  await expect(page.locator(`#tabs-state`)).toHaveText(`${activeIndex}a`); // default assigned value
  await page.waitForTimeout(1000);
  for (let i = 1; i <= 6; i++) {
    if (i === activeIndex) {
      await expect(
        page.locator(
          `.ant-tabs-nav-list [data-node-key="${i}a"].ant-tabs-tab-active`
        )
      ).toBeVisible();
      await expect(
        page.locator(
          `.ant-tabs-content #rc-tabs-0-panel-${i}a.ant-tabs-tabpane-active`
        )
      ).toBeVisible();
    } else {
      await expect(
        page.locator(
          `.ant-tabs-nav-list [data-node-key="${i}a"].ant-tabs-tab-active`
        )
      ).not.toBeVisible();
      await expect(
        page.locator(
          `.ant-tabs-content #rc-tabs-0-panel-${i}a.ant-tabs-tabpane-active`
        )
      ).not.toBeVisible();
    }
  }
}

test.describe(`Plasmic Antd5 Tabs`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/tabs.json",
          projectName: "Antd5 Tabs",
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

      test(`Tabs state`, async ({ page }) => {
        await page.goto(`${ctx.host}/tabs-test`);

        await checkActiveTab(page, 2);

        await page.locator(`.ant-tabs-nav-list [data-node-key="1a"]`).click();
        await checkActiveTab(page, 1);

        await page.locator(`.ant-tabs-nav-list [data-node-key="3a"]`).click();
        await checkActiveTab(page, 3);

        await page.locator(`.ant-tabs-nav-list [data-node-key="6a"]`).click();
        await checkActiveTab(page, 6);

        await page.locator(`.ant-tabs-nav-list [data-node-key="4a"]`).click();
        await checkActiveTab(page, 4);
      });

      test(`One tab item repeated`, async ({ page }) => {
        await page.goto(`${ctx.host}/one-tab-item-repeated`);

        await checkActiveTab(page, 2);

        await page.locator(`.ant-tabs-nav-list [data-node-key="1a"]`).click();
        await checkActiveTab(page, 1);

        await page.locator(`.ant-tabs-nav-list [data-node-key="3a"]`).click();
        await checkActiveTab(page, 3);

        await page.locator(`.ant-tabs-nav-list [data-node-key="6a"]`).click();
        await checkActiveTab(page, 6);

        await page.locator(`.ant-tabs-nav-list [data-node-key="4a"]`).click();
        await checkActiveTab(page, 4);
      });
    });
  }
});
