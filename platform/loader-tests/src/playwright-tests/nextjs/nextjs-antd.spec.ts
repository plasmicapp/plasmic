import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

for (const { loaderVersion, nextVersion } of LOADER_NEXTJS_VERSIONS) {
  test.describe(`NextJS Antd loader-nextjs@${loaderVersion}, next@${nextVersion}`, () => {
    let ctx: NextJsContext;

    test.beforeAll(async () => {
      ctx = await setupNextJs({
        bundleFile: "plasmic-antd.json",
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

      await expect(page.locator(".ant-input")).toBeVisible();
      const inputElement = page.locator(".ant-input");
      await inputElement.click();
      await inputElement.clear();
      await inputElement.fill("hello input!");
      await expect(inputElement).toHaveValue("hello input!");
      await expect(page.getByText("hello input!")).toBeVisible();

      await expect(page.getByText("no checkee")).toBeVisible();

      await page.locator(".ant-checkbox-wrapper").click();
      await expect(page.getByText("CHECKED YO!")).toBeVisible();

      await page.getByText("Collapse1").first().click();
      await expect(page.getByText("Collapse1 stuff")).toBeVisible();
      await page.getByText("Collapse1").first().click();
      await expect(page.getByText("Collapse1 stuff")).not.toBeVisible();

      await page.goto(`${ctx.host}/page2`);
      await expect(page.getByText("Tab2 content")).toBeVisible();
      await page.getByText("Tab1").click();
      await expect(page.getByText("Tab2 content")).not.toBeVisible();
      await expect(page.getByText("Tab1 content")).toBeVisible();
    });
  });
}
