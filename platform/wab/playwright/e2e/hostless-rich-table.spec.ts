import { expect } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";
import { test } from "../fixtures/test";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

const queryData = JSON.parse(
  readFileSync(
    path.join(__dirname, "../../cypress/fixtures/northwind-orders-query.json"),
    "utf-8"
  )
);

test.describe("hostless-rich-components", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
        {
          name: "plasmic-rich-components",
          npmPkg: [
            "@plasmicpkgs/plasmic-rich-components",
            "@ant-design/icons",
            "@ant-design/pro-components",
          ],
          deps: ["antd5"],
        },
      ],
    });
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("RichTable works", async ({ page, models }) => {
    await goToProject(page, `/projects/${projectId}`);
    await waitForFrameToLoad(page);

    await models.studio.createNewPageInOwnArena("Homepage");
    await waitForFrameToLoad(page);
    await models.studio.frames
      .first()
      .contentFrame()
      .locator("body")
      .waitFor({ state: "visible" });

    await models.studio.turnOffDesignMode();
    await waitForFrameToLoad(page);

    await models.studio.leftPanel.insertNode("hostless-rich-table");
    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="data"]')
      .waitFor({ state: "visible" });

    const dataProp = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="data"]'
    );
    await dataProp.click();
    await models.studio.frame
      .locator('[data-plasmic-role="overlay"]')
      .waitFor({ state: "visible" });

    const dynamicValueOption = models.studio.frame.locator(
      '[data-plasmic-role="overlay"] [data-key="\'[[dynamic value]]\'"]'
    );
    await dynamicValueOption.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .waitFor({ state: "visible" });

    const dataPicker = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"]'
    );
    const dataPickerContent = await dataPicker.textContent();
    const monacoContainer = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"] .react-monaco-editor-container'
    );

    if (dataPickerContent && dataPickerContent.includes("Switch to Code")) {
      await dataPicker.locator('text="Switch to Code"').click();
      await monacoContainer.waitFor({ state: "visible", timeout: 5000 });
    }

    await monacoContainer.click();
    await page.waitForTimeout(300);

    const monacoInput = models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"] .monaco-editor textarea')
      .first();

    if ((await monacoInput.count()) > 0) {
      await monacoInput.focus();
      await page.waitForTimeout(200);

      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+a" : "Control+a"
      );
      await page.keyboard.press("Delete");
      await page.waitForTimeout(100);

      const jsonString = JSON.stringify(queryData);

      await monacoInput.evaluate(
        (element: HTMLTextAreaElement, dataToInject: string) => {
          const dataTransfer = new DataTransfer();
          dataTransfer.setData("text/plain", dataToInject);
          const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer as any,
          });
          element.dispatchEvent(pasteEvent);
        },
        jsonString
      );
    }

    await page.waitForTimeout(1000);

    const saveButton = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"] button:has-text("Save")'
    );
    await saveButton.waitFor({ state: "visible" });
    await saveButton.click();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {
        return page.keyboard.press("Escape");
      });

    await page.waitForTimeout(2000);

    const tableFrame = models.studio.frames.first().contentFrame();

    await tableFrame
      .locator(".ant-table")
      .waitFor({ state: "visible", timeout: 5000 });

    await expect(async () => {
      const headers = await tableFrame.locator("thead th").allTextContents();
      const nonEmptyHeaders = headers.filter((h) => h && h.trim().length > 0);
      expect(nonEmptyHeaders.length).toBeGreaterThanOrEqual(14);
      expect(headers.some((h) => h.includes("order_id"))).toBeTruthy();
    }).toPass({ timeout: 5000, intervals: [500, 1000, 1500] });

    const canSelectRowsProp = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="canSelectRows"]'
    );
    await canSelectRowsProp.click();
    await models.studio.frame
      .locator('[data-plasmic-role="overlay"]')
      .waitFor({ state: "visible" });

    const byClickingRowOption = models.studio.frame.locator(
      '[data-plasmic-role="overlay"] [data-key]:has-text("By clicking a row")'
    );
    await byClickingRowOption.click();
    await models.studio.frame
      .locator('[data-plasmic-role="overlay"]')
      .waitFor({ state: "hidden" });

    await models.studio.frame.locator("#interactive-canvas-switch").click();
    const frame = models.studio.frames.first().contentFrame();
    await frame
      .locator("thead th")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });

    async function checkAndInteract() {
      // Wait for table to fully render
      await frame
        .locator("thead")
        .waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(1000);

      await expect(async () => {
        const headers = await frame.locator("thead th").allTextContents();
        expect(headers.length).toBeGreaterThanOrEqual(14);
        expect(headers).toContain("order_id");
      }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });

      const headers = await frame.locator("thead th").allTextContents();
      expect(headers).toEqual([
        "order_id",
        "customer_id",
        "employee_id",
        "order_date",
        "required_date",
        "shipped_date",
        "ship_via",
        "freight",
        "ship_name",
        "ship_address",
        "ship_city",
        "ship_region",
        "ship_postal_code",
        "ship_country",
      ]);

      const paginationLocator = frame.locator(".ant-pagination").first();
      await paginationLocator.scrollIntoViewIfNeeded({ timeout: 5000 });

      await expect(frame.locator("text=1-10 of 830 items")).toBeVisible();

      const lastPageButton = frame
        .locator(".ant-pagination-item")
        .filter({ hasText: "83" });
      await expect(lastPageButton).toBeVisible();

      const searchInput = frame.locator('input[placeholder="Search"]');
      await searchInput.fill("10248");
      await expect(frame.locator("tbody tr")).toHaveCount(1, { timeout: 5000 });

      await searchInput.clear();
      await expect(frame.locator("tbody tr")).toHaveCount(10, {
        timeout: 5000,
      });

      const targetCell = frame.locator("tbody tr").nth(2).locator("td").nth(2);
      await targetCell.click();

      await expect(targetCell).toHaveCSS(
        "background-color",
        "rgb(186, 224, 255)"
      );
    }

    await checkAndInteract();

    await models.studio.rightPanel.checkNoErrors();
  });
});
