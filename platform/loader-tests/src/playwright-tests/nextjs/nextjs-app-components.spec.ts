import { expect } from "@playwright/test";
import fs from "fs";
import { LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { ensure } from "../../utils";
import { waitUntilNoChanges } from "../playwright-utils";

test.describe(`Plasmic App Components`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "plasmic-app-components.json",
          projectName: "App test project",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test.skip(`it works`, async ({ page }) => {
        function t(text: string) {
          return page.getByText(text).first();
        }

        await page.goto(ctx.host);

        //
        // Chart
        //

        // Wait for animations
        const chart = page.locator("canvas");
        await waitUntilNoChanges(page, chart);
        await expect(await chart.screenshot()).toMatchSnapshot();

        //
        // Table
        //

        const table = page.locator("table").first();
        const rows = table.locator("tbody tr");
        await expect(rows).toHaveCount(10);

        // Sort for predictable tests
        await t("order_id").click();

        // Actions
        await t("View").first().click();
        await expect(t("View: 10248")).toBeVisible();

        await t("More").click();
        await t("Delete").click();
        await expect(t("Delete: 10248")).toBeVisible();

        // Interact
        await t("10,248").click();
        await expect(t("Click: 10248")).toBeVisible();
        const forms = page.locator("form");
        await expect(forms).toHaveCount(2);
        for (const form of await forms.all()) {
          await expect(form.locator("input")).toHaveValue(
            "Vins et alcools Chevalier"
          );
          await expect(form.locator("textarea")).toHaveValue(
            `59 rue de l'Abbaye`
          );
          await form.locator("textarea").fill("");
          await form.locator("textarea").type("123 Sesame St");
          await form.getByRole("button").click();
          const expectedValues = {
            ship_name: "Vins et alcools Chevalier",
            ship_address: "123 Sesame St",
          };
          await expect(
            t(
              `Submit: ${JSON.stringify(
                expectedValues,
                Object.keys(expectedValues).sort()
              )}`
            )
          ).toBeVisible();
        }

        // Download
        await page.locator('[aria-label="ellipsis"]').last().click();
        const pDownload = page.waitForEvent("download");
        await t("Download as CSV").click();
        const download = await pDownload;
        const contents = fs.readFileSync(ensure(await download.path()), "utf8");
        expect(
          contents.startsWith("order_id,customer_id,employee_id,order_date")
        ).toBeTruthy();

        // Filter
        await page.getByPlaceholder("Search").first().type("chops");
        await expect(rows).toHaveCount(8);

        //
        // List, grid
        //

        const listItems = page
          .locator(".ant-list-items")
          .first()
          .locator(".plasmic-list-item");
        await expect(listItems).toHaveCount(10);
        const gridItems = page
          .locator(".ant-list-items")
          .last()
          .locator(".plasmic-list-item");
        await expect(gridItems).toHaveCount(10);

        // Filter list
        await page.getByPlaceholder("Search").nth(1).type("iphone");
        await expect(listItems).toHaveCount(2);
        await expect(listItems.last()).toContainText("iPhone X");
        await expect(listItems.last()).toContainText(
          "smartphones • SIM-Free, Model A19211 6.5-inch Super Retina HD display with OLED technology A12 Bionic chip with"
        );

        //
        // Data details
        //

        for (const [key, value] of Object.entries({
          description: "An apple mobile which is nothing like apple",
          category: "smartphones",
          price: "549",
        })) {
          await expect(
            page.locator(`
          .ant-descriptions
            tr:has(
              th:has-text(${JSON.stringify(key)})
              +
              td:has-text(${JSON.stringify(value)})
            )
          `)
          ).toBeVisible();
        }

        //
        // Layout
        //

        // Nav items work
        function menu(selector: string) {
          return page
            .locator(`li:has-text(${JSON.stringify(selector)})`)
            .first();
        }
        await expect(menu("Home")).toHaveCSS(
          "background-color",
          "rgb(46, 108, 197)"
        );
        await expect(menu("Unhighlighted")).toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)"
        );
        await page.getByText("Nested").hover();
        await expect(menu("Test")).toBeVisible();

        // Responsive
        await page.setViewportSize({ width: 400, height: 800 });
        await expect(menu("Unhighlighted")).toBeHidden();
        await page.locator('[aria-label="menu"]').click();
        await expect(menu("Home")).toBeVisible();
        await expect(menu("Unhighlighted")).toBeVisible();
        await expect(menu("Nested")).toBeVisible();

        await expect(menu("Home")).toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0.15)"
        );
        await expect(menu("Unhighlighted")).toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)"
        );
      });
    });
  }
});
