import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5 Collapse/Accordion`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/collapse.json",
          projectName: "Antd5 Collapse",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });
      test(`Accordion state`, async ({ page }) => {
        await page.goto(`${ctx.host}/accordion`);

        await expect(page.locator(`#accordion-state`)).toHaveText("b2"); // default assigned value
        await expect(
          page.locator(`.ant-collapse #a1.ant-collapse-item-active`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #b2.ant-collapse-item-active`)
        ).toBeVisible();
        await expect(
          page.locator(`.ant-collapse #b2 .ant-collapse-content-box`)
        ).toBeVisible();
        await expect(
          page.locator(`.ant-collapse #c3.ant-collapse-item-active`)
        ).not.toBeVisible();

        await expect(
          page.locator(`.ant-collapse #a1 .ant-collapse-content-box`)
        ).not.toBeVisible();
        await page.locator(".ant-collapse #a1 .ant-collapse-header").click();
        await expect(page.locator(`#accordion-state`)).toHaveText("a1");
        await expect(
          page.locator(`.ant-collapse #a1.ant-collapse-item-active`)
        ).toBeVisible();
        await expect(
          page.locator(`.ant-collapse #b2.ant-collapse-item-active`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #c3.ant-collapse-item-active`)
        ).not.toBeVisible();
        await page.waitForTimeout(1000);
        await expect(
          page.locator(`.ant-collapse #a1 .ant-collapse-content-box`)
        ).toBeVisible();

        await expect(
          page.locator(`.ant-collapse #c3 .ant-collapse-content-box`)
        ).not.toBeVisible();
        await page.locator(".ant-collapse #c3 .ant-collapse-header").click();
        await expect(page.locator(`#accordion-state`)).toHaveText("c3");
        await expect(
          page.locator(`.ant-collapse #a1.ant-collapse-item-active`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #b2.ant-collapse-item-active`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #c3.ant-collapse-item-active`)
        ).toBeVisible();
        await page.waitForTimeout(1000);
        await expect(
          page.locator(`.ant-collapse #c3 .ant-collapse-content-box`)
        ).toBeVisible();

        await page.locator(".ant-collapse #c3 .ant-collapse-header").click();
        await expect(page.locator(`#accordion-state`)).toHaveText("");
        await expect(
          page.locator(`.ant-collapse #a1.ant-collapse-item-active`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #b2.ant-collapse-item-active`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #c3.ant-collapse-item-active`)
        ).not.toBeVisible();
        await page.waitForTimeout(1000);
        await expect(
          page.locator(`.ant-collapse #a1 .ant-collapse-content-box`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #b2 .ant-collapse-content-box`)
        ).not.toBeVisible();
        await expect(
          page.locator(`.ant-collapse #c3 .ant-collapse-content-box`)
        ).not.toBeVisible();
      });

      test(`Collapse state`, async ({ page }) => {
        await page.goto(`${ctx.host}/single-collapse`);

        await expect(page.locator(`#collapse-state-text`)).toHaveText(
          "Collapsed!"
        );
        await page.locator(".ant-collapse .ant-collapse-header").click();
        await expect(page.locator(`#collapse-state-text`)).toHaveText(
          "Expanded!"
        );
        await page.locator(".ant-collapse .ant-collapse-header").click();
        await expect(page.locator(`#collapse-state-text`)).toHaveText(
          "Collapsed!"
        );
      });
    });
  }
});
