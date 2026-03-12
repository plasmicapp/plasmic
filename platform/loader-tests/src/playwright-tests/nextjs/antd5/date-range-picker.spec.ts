import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";
import { makeEnvName } from "../../setup-utils";

test.describe(`Plasmic Antd5 Date Range Picker`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    test.describe(makeEnvName({ type: "nextjs", ...versions }), async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/date-range-picker.json",
          projectName: "Antd5 Date Range Picker",
          removeComponentsPage: true,
          ...versions,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test(`Date Range Picker state`, async ({ page }) => {
        await page.goto(`${ctx.host}/date-range-picker-test`);

        await expect(page.locator(`#date-range-start-state`)).toHaveText(
          "2023-09-04T14:22:30.351Z"
        );
        await expect(page.locator(`#date-range-end-state`)).toHaveText(
          "2023-09-28T14:22:36.386Z"
        );
        await page.locator(`.ant-picker-range`).click();
        await page.waitForTimeout(1000);
        await page.getByText(`My December`).click();
        await expect(page.locator(`#date-range-start-state`)).toHaveText(
          "2023-12-01T00:00:00.000Z"
        );
        await expect(page.locator(`#date-range-end-state`)).toHaveText(
          "2023-12-31T11:59:59.999Z"
        );
      });
    });
  }
});
