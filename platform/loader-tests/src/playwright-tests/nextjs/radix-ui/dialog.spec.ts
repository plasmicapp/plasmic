import { expect, Page } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

async function assertions(page: Page, dialogOpen: boolean) {
  if (dialogOpen) {
    await expect(page.locator("#dialog-open-state-text")).toHaveText(
      "dialog is open"
    );
    await expect(page.locator('text="Sheet title"')).toBeVisible();
  } else {
    await expect(page.locator("#dialog-open-state-text")).toHaveText(
      "dialog is closed"
    );
    await expect(page.locator('text="Sheet title"')).not.toBeVisible();
  }
}

test.describe(`Plasmic Radix UI Dialog`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "radix-ui/dialog.json",
          projectName: "Radix UI Dialog",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test(`works`, async ({ page }) => {
        await page.goto(`${ctx.host}/dialog-test`);

        await assertions(page, false);

        await page.locator(`text="Show dialog"`).click();
        await assertions(page, true);

        await page.locator(`[role="dialog"] svg`).click();
        await assertions(page, false);
      });
    });
  }
});
