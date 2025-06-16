import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`Plasmic Slick Slider`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "slick-slider.json",
          projectName: "Slick Slider",
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

      test(`Slider state`, async ({ page }) => {
        await page.goto(`${ctx.host}/slick-slider-test`);
        await expect(page.locator("#slider-state-text")).toHaveText("1");
        await page.waitForTimeout(1000);
        await expect(page.locator("#slider-state-text")).toHaveText("2");
        await page.waitForTimeout(1000);
        await expect(page.locator("#slider-state-text")).toHaveText("3");
        await page.waitForTimeout(1000);
        await expect(page.locator("#slider-state-text")).toHaveText("0");
        await page.waitForTimeout(1000);
        await expect(page.locator("#slider-state-text")).toHaveText("1");
        await page.waitForTimeout(1000);
        await expect(page.locator("#slider-state-text")).toHaveText("2");

        await page.getByText(`Pause`).click();
        await page.waitForTimeout(2000);

        await expect(page.locator("#slider-state-text")).toHaveText("2");

        await page.getByText(`Back`).click();
        await page.waitForTimeout(500);
        await expect(page.locator("#slider-state-text")).toHaveText("1");
        await page.getByText(`Back`).click();
        await page.waitForTimeout(500);
        await expect(page.locator("#slider-state-text")).toHaveText("0");
        await page.getByText(`Back`).click();
        await page.waitForTimeout(500);
        await expect(page.locator("#slider-state-text")).toHaveText("3");

        await page.locator("#actions-container").getByText(`Next`).click();
        await page.waitForTimeout(500);
        await expect(page.locator("#slider-state-text")).toHaveText("0");

        await page.locator("#actions-container").getByText(`Next`).click();
        await page.waitForTimeout(500);
        await expect(page.locator("#slider-state-text")).toHaveText("1");

        await page.locator(`input[name="jump-to-slide"]`).type("3");
        await page.locator("#actions-container").getByText(`Go`).click();
        await page.waitForTimeout(500);
        await expect(page.locator("#slider-state-text")).toHaveText("3");

        await page.getByText(`Play`).click();
        await page.waitForTimeout(2000);
        await expect(page.locator("#slider-state-text")).toHaveText("1");
        await page.waitForTimeout(1000);
        await expect(page.locator("#slider-state-text")).toHaveText("2");
      });
    });
  }
});
