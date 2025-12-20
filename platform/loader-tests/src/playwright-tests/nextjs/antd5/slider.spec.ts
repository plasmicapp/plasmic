import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../../env";
import { test } from "../../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../../nextjs/nextjs-setup";

test.describe(`Plasmic Antd5 Slider`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "antd5/slider.json",
          projectName: "Antd5 Slider",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test(`Slider state`, async ({ page }) => {
        await page.goto(`${ctx.host}/slider-test`);

        await expect(page.locator("#slider-state")).toHaveText("-30");
        await expect(page.getByRole(`tooltip`)).toHaveText("$-30M");
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(3);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(0);

        await page.getByText(`positive`).click();
        await expect(page.locator("#slider-state")).toHaveText("20");
        await expect(page.getByRole(`tooltip`)).toHaveText("$20M");
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(3);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(3);

        await page.getByText(`negative`).click();
        await expect(page.locator("#slider-state")).toHaveText("-20");
        await expect(page.getByRole(`tooltip`)).toHaveText("$-20M");
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(3);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(1);

        await page.getByText(`neutral`).click();
        await expect(page.locator("#slider-state")).toHaveText("0");
        await expect(page.getByRole(`tooltip`)).toHaveText("$0M");
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(3);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(2);
      });

      test(`Range Slider state`, async ({ page }) => {
        await page.goto(`${ctx.host}/slider-range-test`);

        await expect(page.locator("#range-slider-min-state")).toHaveText("-20");
        await expect(page.locator("#range-slider-max-state")).toHaveText("20");
        await expect(page.locator(`[role="tooltip"]`).nth(0)).toHaveText(
          "Rs. -20k"
        );
        await expect(page.locator(`[role="tooltip"]`).nth(1)).toHaveText(
          "Rs. 20k"
        );
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(21);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(5);

        await page
          .locator(`.ant-slider-handle-1`)
          .dragTo(await page.getByText("-ve"));

        await expect(page.locator("#range-slider-min-state")).toHaveText("-50");
        await expect(page.locator("#range-slider-max-state")).toHaveText("20");
        await expect(page.locator(`[role="tooltip"]`).nth(0)).toHaveText(
          "Rs. -50k"
        );
        await expect(page.locator(`[role="tooltip"]`).nth(1)).toHaveText(
          "Rs. 20k"
        );
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(21);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(8);

        await page
          .locator(`.ant-slider-handle-2`)
          .dragTo(await page.getByText("+ve"));

        await expect(page.locator("#range-slider-min-state")).toHaveText("-50");
        await expect(page.locator("#range-slider-max-state")).toHaveText("50");
        await expect(page.locator(`[role="tooltip"]`).nth(0)).toHaveText(
          "Rs. -50k"
        );
        await expect(page.locator(`[role="tooltip"]`).nth(1)).toHaveText(
          "Rs. 50k"
        );
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(21);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(11);

        await page
          .locator(`.ant-slider-handle-1`)
          .dragTo(await page.getByText("Neutral"));

        await expect(page.locator("#range-slider-min-state")).toHaveText("0");
        await expect(page.locator("#range-slider-max-state")).toHaveText("50");
        await expect(page.locator(`[role="tooltip"]`).nth(0)).toHaveText(
          "Rs. 0k"
        );
        await expect(page.locator(`[role="tooltip"]`).nth(1)).toHaveText(
          "Rs. 50k"
        );
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(21);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(6);

        await page
          .locator(`.ant-slider-handle-1`)
          .dragTo(await page.getByText("+ve"));

        await expect(page.locator("#range-slider-min-state")).toHaveText("50");
        await expect(page.locator("#range-slider-max-state")).toHaveText("50");
        await expect(page.locator(`[role="tooltip"]`).nth(0)).toHaveText(
          "Rs. 50k"
        );
        await expect(page.locator(`[role="tooltip"]`).nth(1)).toHaveText(
          "Rs. 50k"
        );
        await expect(page.locator(`.ant-slider-dot`)).toHaveCount(21);
        await expect(
          page.locator(`.ant-slider-dot.ant-slider-dot-active`)
        ).toHaveCount(1);
      });
    });
  }
});
