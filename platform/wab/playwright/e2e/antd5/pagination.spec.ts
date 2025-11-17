import { expect, FrameLocator, Page } from "@playwright/test";
import * as queryData from "../../../cypress/fixtures/northwind-orders-query.json";
import { test } from "../../fixtures/test";
import { goToProject } from "../../utils/studio-utils";

async function setHtmlId(page: Page, rightPanel: FrameLocator, id: string) {
  const collapseButton = rightPanel
    .locator('button[data-test-id="collapse"]')
    .first();
  if ((await collapseButton.count()) > 0) {
    const isCollapsed =
      (await collapseButton.locator("svg.icon-tabler-chevron-down").count()) >
      0;
    if (isCollapsed) {
      await collapseButton.click();
      await rightPanel
        .locator('div.templated-string-input[contenteditable="true"]')
        .nth(2)
        .waitFor({ state: "visible" });
    }
  }
  const idField = rightPanel
    .locator('div.templated-string-input[contenteditable="true"]')
    .nth(2);
  await idField.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(id);
  await page.keyboard.press("Tab");
}

test.describe("Antd5 pagination", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "antd5",
        npmPkg: ["@plasmicpkgs/antd5"],
      },
    });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProject(projectId);
    }
  });

  test("works", async ({ models, page }) => {
    await models.studio.createNewPageInOwnArena("Homepage");

    const frameCount = await models.studio.frames.count();
    const newFrame = models.studio.frames.nth(frameCount - 1);
    await newFrame.waitFor({ state: "visible", timeout: 5000 });
    await models.studio.focusFrameRoot(newFrame);

    await models.studio.turnOffDesignMode();

    await models.studio.leftPanel.insertNode("plasmic-antd5-pagination");
    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-total"]`)
      .waitFor({ state: "visible", timeout: 5000 });

    const disablePane1 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count1 = await disablePane1.count();
    if (count1 > 0) {
      await disablePane1
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-total"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode(`${queryData.data.length}`);

    await models.studio.rightPanel.frame
      .locator(`#component-props-section [data-test-id="show-extra-content"]`)
      .click();

    const disablePane2 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count2 = await disablePane2.count();
    if (count2 > 0) {
      await disablePane2
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-showQuickJumper"] label`)
      .first()
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode("true");

    const disablePane3 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count3 = await disablePane3.count();
    if (count3 > 0) {
      await disablePane3
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-paginatedUrl"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode(
      "`https://test.com?_page=${pageNo}&_limit=${pageSize}`"
    );

    const disablePane4 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count4 = await disablePane4.count();
    if (count4 > 0) {
      await disablePane4
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-showTotal"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode("`${range} / ${total}`");

    await models.studio.leftPanel.insertNode("Text");

    await setHtmlId(
      page,
      models.studio.rightPanel.frame,
      "pagination-state-current-page"
    );

    const disablePane5 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count5 = await disablePane5.count();
    if (count5 > 0) {
      await disablePane5
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();

    const stateOption = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="$state"')
      .first();
    if ((await stateOption.count()) > 0) {
      await stateOption.click();
    }

    const paginationOption = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="pagination"')
      .first();
    if ((await paginationOption.count()) > 0) {
      await paginationOption.click();
    }

    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("currentPage")
      .click();
    await models.studio.rightPanel.saveDataPicker();

    await models.studio.leftPanel.insertNode("Text");
    await setHtmlId(
      page,
      models.studio.rightPanel.frame,
      "pagination-state-page-size"
    );
    const disablePane6 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count6 = await disablePane6.count();
    if (count6 > 0) {
      await disablePane6
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();

    const stateOption2 = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="$state"')
      .first();
    if ((await stateOption2.count()) > 0) {
      await stateOption2.click();
    }

    const paginationOption2 = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="pagination"')
      .first();
    if ((await paginationOption2.count()) > 0) {
      await paginationOption2.click();
    }

    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("pageSize")
      .click();
    await models.studio.rightPanel.saveDataPicker();

    await models.studio.leftPanel.insertNode("Text");
    await setHtmlId(
      page,
      models.studio.rightPanel.frame,
      "pagination-state-start-index"
    );
    const disablePane7 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count7 = await disablePane7.count();
    if (count7 > 0) {
      await disablePane7
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();

    const stateOption3 = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="$state"')
      .first();
    if ((await stateOption3.count()) > 0) {
      await stateOption3.click();
    }

    const paginationOption3 = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="pagination"')
      .first();
    if ((await paginationOption3.count()) > 0) {
      await paginationOption3.click();
    }

    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("startIndex")
      .click();
    await models.studio.rightPanel.saveDataPicker();

    await models.studio.leftPanel.insertNode("Text");
    await setHtmlId(
      page,
      models.studio.rightPanel.frame,
      "pagination-state-end-index"
    );
    const disablePane8 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count8 = await disablePane8.count();
    if (count8 > 0) {
      await disablePane8
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();

    const stateOption4 = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="$state"')
      .first();
    if ((await stateOption4.count()) > 0) {
      await stateOption4.click();
    }

    const paginationOption4 = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .locator('text="pagination"')
      .first();
    if ((await paginationOption4.count()) > 0) {
      await paginationOption4.click();
    }

    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("endIndex")
      .click();
    await models.studio.rightPanel.saveDataPicker();

    await models.studio.leftPanel.insertNode("Vertical stack");
    await setHtmlId(page, models.studio.rightPanel.frame, "northwind-orders");

    await models.studio.leftPanel.insertNode("Text");

    const repeatButton = models.studio.rightPanel.frame.locator(
      `[data-test-id="btn-repeating-element-add"]`
    );
    await repeatButton.click();
    const collectionInput = models.studio.rightPanel.frame.locator(
      `[data-test-id="repeating-element-collection"] .code-editor-input`
    );
    await collectionInput.click();
    const switchToCodeBtn = models.studio.frame.getByText("Switch to Code");
    await switchToCodeBtn.click();
    const monacoContainer = models.studio.frame.locator(
      '[data-test-id="data-picker"] .react-monaco-editor-container'
    );
    await monacoContainer.click();

    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");

    const query = queryData;

    const repeatCode = `
const query = ${JSON.stringify(query.data)};
  query.slice(
      $state.pagination.startIndex,
      $state.pagination.endIndex + 1
  )
    `;

    const monacoInput = models.studio.frame
      .locator('[data-test-id="data-picker"] .monaco-editor textarea')
      .first();

    if ((await monacoInput.count()) > 0) {
      await monacoInput.evaluate(
        (element: HTMLTextAreaElement, codeToInject: string) => {
          const dataTransfer = new DataTransfer();
          dataTransfer.setData("text/plain", codeToInject);
          const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer as any,
          });
          element.dispatchEvent(pasteEvent);
        },
        repeatCode
      );
    } else {
      await page.keyboard.type(repeatCode);
    }
    await models.studio.rightPanel.saveDataPicker();

    const disablePane9 = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count9 = await disablePane9.count();
    if (count9 > 0) {
      await disablePane9
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right", force: true });
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode(
      "`${currentItem.order_id}. ${currentItem.ship_name}`"
    );

    await models.studio.waitForSave();

    await models.studio.withinLiveMode(async (liveFrame) => {
      await liveFrame.locator(".ant-pagination").waitFor({ state: "visible" });
      await liveFrame
        .locator("#pagination-state-current-page")
        .waitFor({ state: "visible" });
      await expect(
        liveFrame.locator("#pagination-state-current-page")
      ).toHaveText("1");
      await expect(liveFrame.locator("#pagination-state-page-size")).toHaveText(
        "10"
      );
      await expect(
        liveFrame.locator("#pagination-state-start-index")
      ).toHaveText("0");
      await expect(liveFrame.locator("#pagination-state-end-index")).toHaveText(
        "9"
      );
      await expect(liveFrame.locator(".ant-pagination-total-text")).toHaveText(
        "1,10 / 830"
      );

      const northwindOrders = liveFrame
        .locator("#northwind-orders")
        .locator("> *");
      await expect(northwindOrders).toHaveCount(10);
      await expect(northwindOrders.nth(0)).toHaveText(
        "10248. Vins et alcools Chevalier"
      );

      const quickJumperInput = liveFrame.locator(
        ".ant-pagination-options-quick-jumper input"
      );
      await quickJumperInput.fill("4");
      await quickJumperInput.press("Enter");

      await expect(
        liveFrame.locator("#pagination-state-current-page")
      ).toHaveText("4");
      await expect(liveFrame.locator("#pagination-state-page-size")).toHaveText(
        "10"
      );
      await expect(
        liveFrame.locator("#pagination-state-start-index")
      ).toHaveText("30");
      await expect(liveFrame.locator("#pagination-state-end-index")).toHaveText(
        "39"
      );
      await expect(liveFrame.locator(".ant-pagination-total-text")).toHaveText(
        "31,40 / 830"
      );
      await expect(northwindOrders).toHaveCount(10);
      await expect(northwindOrders.nth(0)).toHaveText(
        "10278. Berglunds snabbköp"
      );

      const pageSelector = liveFrame.locator(".ant-select-selector");
      await pageSelector.click();
      await liveFrame.getByText("20 / page").click();

      await expect(
        liveFrame.locator("#pagination-state-current-page")
      ).toHaveText("4");
      await expect(liveFrame.locator("#pagination-state-page-size")).toHaveText(
        "20"
      );
      await expect(
        liveFrame.locator("#pagination-state-start-index")
      ).toHaveText("60");
      await expect(liveFrame.locator("#pagination-state-end-index")).toHaveText(
        "79"
      );
      await expect(liveFrame.locator(".ant-pagination-total-text")).toHaveText(
        "61,80 / 830"
      );
      await expect(northwindOrders).toHaveCount(20);
      await expect(northwindOrders.nth(0)).toHaveText(
        "10308. Ana Trujillo Emparedados y helados"
      );

      const paginationLink = liveFrame.locator(
        ".ant-pagination-item[title='3'] a[href='https://test.com?_page=3&_limit=20'][rel='prev']"
      );
      await expect(paginationLink).toBeVisible();

      const paginationItem3 = liveFrame.locator(
        ".ant-pagination-item[title='3']"
      );
      await paginationItem3.click();

      await expect(
        liveFrame.locator("#pagination-state-current-page")
      ).toHaveText("3");
      await expect(liveFrame.locator("#pagination-state-page-size")).toHaveText(
        "20"
      );
      await expect(
        liveFrame.locator("#pagination-state-start-index")
      ).toHaveText("40");
      await expect(liveFrame.locator("#pagination-state-end-index")).toHaveText(
        "59"
      );
      await expect(liveFrame.locator(".ant-pagination-total-text")).toHaveText(
        "41,60 / 830"
      );
      await expect(northwindOrders).toHaveCount(20);
      await expect(northwindOrders.nth(0)).toHaveText(
        "10288. Reggiani Caseifici"
      );
    });
  });
});
