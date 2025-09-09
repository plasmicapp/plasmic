import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

for (const { loaderVersion, nextVersion } of LOADER_NEXTJS_VERSIONS) {
  test.describe(`NextJS Antd5 loader-nextjs@${loaderVersion}, next@${nextVersion}`, () => {
    let ctx: NextJsContext;

    test.beforeAll(async () => {
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

    test.afterAll(async () => {
      await teardownNextJs(ctx);
    });

    test(`should work`, async ({ page }) => {
      await page.goto(ctx.host);

      await expect(page.locator("input.ant-input").first()).toBeVisible();
      await page.locator("input.ant-input").fill("hello input!");
      await expect(page.locator("input.ant-input")).toHaveValue("hello input!");
      await expect(page.locator("text=hello input!")).toBeVisible();
      await page.locator("textarea.ant-input").fill("hello textarea!");
      await expect(page.locator("textarea.ant-input")).toHaveValue(
        "hello textarea!"
      );
      await expect(
        page.locator('[data-test-id="textarea-state"]')
      ).toContainText("hello textarea!");
      await expect(page.locator("text=Not checked")).toBeVisible();
      await page.locator(".ant-checkbox-wrapper").click();
      await expect(page.locator("text=Checked!")).toBeVisible();

      const datePicker = page.locator(".ant-picker input");
      await datePicker.click();
      await datePicker.clear();
      await datePicker.pressSequentially("2013-06-20");
      await datePicker.press("Enter");
      await page.waitForTimeout(500);
      await expect(page.locator("text=/2013.*06.*20/")).toBeVisible();
      await page
        .locator('input.ant-radio-input[value="radio-option2"]')
        .click();
      await expect(page.locator("text=radio-option2")).toBeVisible();
      await expect(page.locator("text=Switched off")).toBeVisible();
      await page.locator("button.ant-switch").click();
      await expect(page.locator("text=Switched on!")).toBeVisible();
      await page.goto(`${ctx.host}/forms`);
      await expect(page.locator('input[id="name"]')).toBeVisible();
      await page.locator('input[id="name"]').fill("My Name");
      await page
        .locator(
          '.ant-radio-group[id="message"] input.ant-radio-input[value="blue"]'
        )
        .click();
      await expect(
        page.locator('text={"name":"My Name","message":"blue"}')
      ).toBeVisible();

      await page.locator('input[id="my-name"]').fill("Another name");
      await page
        .locator(
          '.ant-radio-group[id="my-color"] input.ant-radio-input[value="red"]'
        )
        .click();
      await expect(
        page.locator('text={"my-name":"Another name","my-color":"red"}')
      ).toBeVisible();
    });
  });
}
