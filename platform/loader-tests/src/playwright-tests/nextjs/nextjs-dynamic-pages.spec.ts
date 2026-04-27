import { expect } from "@playwright/test";

import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { matchScreenshot } from "../playwright-utils";

test.describe(`NextJS Dynamic Pages`, async () => {
  let ctx: NextJsContext;

  test.beforeEach(async () => {
    ctx = await setupNextJs({
      bundleFile: "dynamic-pages.json",
      projectName: "Dynamic Pages",
      removeComponentsPage: true,
    });
  });

  test.afterEach(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work`, async ({ page }) => {
    await page.goto(ctx.host);

    await expect(page.locator("text=Donald Knuth")).toBeVisible();
    await matchScreenshot(page, "dynamic-pages.png");

    await page.locator("text=Donald Knuth").click();
    await expect(page).toHaveTitle("Donald Knuth");
  });
});
