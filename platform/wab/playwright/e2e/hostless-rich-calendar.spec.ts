import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

/**
 * Adds a calendar and sets its default value.
 * NOTE: Setting a default value is important, because we are dealing with dates!
 * The calendar looks different depending on when the test runs
 * (e.g. Next year, the calendar will show year 2024 by default).
 * We don't want to break the test due to this variation, so we set a default value.
 * Now it will always show the same data no matter when.
 *
 * Also, the year and month dropdowns use virtual list, so the items in the list will vary depending on what month/year the test runs.
 * So it's also not recommended to get playwright to click on the items in virtual list and reach the desired date in the calendar.
 * @param defaultValue
 */
async function addCalendar(models: any, page: any, defaultValue?: string) {
  await models.studio.leftPanel.insertNode("hostless-rich-calendar");

  if (!defaultValue) {
    return;
  }

  const valueLabel = models.studio.rightPanel.frame
    .locator('[data-test-id="prop-editor-row-value"] label')
    .filter({ hasText: "Value" });
  await valueLabel.click({ button: "right" });

  const useDynamicValue = models.studio.frame
    .locator(".ant-dropdown-menu-title-content")
    .filter({ hasText: "Use dynamic value" });
  await useDynamicValue.waitFor({ state: "visible" });
  await useDynamicValue.click();
  await models.studio.rightPanel.frame
    .locator('[data-test-id="data-picker"]')
    .waitFor({ state: "visible" });

  const switchToCodeBtn = models.studio.frame.getByText("Switch to Code");
  await switchToCodeBtn.click();
  await models.studio.rightPanel.frame
    .locator('[data-test-id="data-picker"] .react-monaco-editor-container')
    .waitFor({ state: "visible" });

  const monacoContainer = models.studio.rightPanel.frame.locator(
    '[data-test-id="data-picker"] .react-monaco-editor-container'
  );
  await monacoContainer.waitFor({ state: "visible", timeout: 5000 });
  await monacoContainer.click();

  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(`"${defaultValue}"`);

  const saveButton = models.studio.rightPanel.frame
    .locator('[data-test-id="data-picker"]')
    .locator('button:has-text("Save")');
  await saveButton.click();
}

test.describe("hostless-rich-calendar", () => {
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
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test("calendar states work", async ({ page, models }) => {
    await page.goto(`/projects/${projectId}`);

    await models.studio.createNewPageInOwnArena("Homepage");
    await models.studio.frames
      .first()
      .contentFrame()
      .locator("body")
      .waitFor({ state: "visible" });

    await models.studio.turnOffDesignMode();

    await addCalendar(models, page, "2022-08-01");

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.renameTreeNode("text-calendar-mode");

    const textContentLabel = models.studio.rightPanel.frame.locator(
      '[data-test-id="text-content"] label'
    );
    await textContentLabel.click({ button: "right" });
    await models.studio.frame.getByText("Use dynamic value").click();

    const dataPicker = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"]'
    );
    await dataPicker.waitFor({ state: "visible", timeout: 5000 });
    const modeOption = dataPicker.locator("text=/calendar → mode/").first();
    await modeOption.waitFor({ state: "visible" });
    await modeOption.click();

    const saveButton = dataPicker.locator('button:has-text("Save")');
    await saveButton.click();

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.renameTreeNode("text-calendar-selected-date");

    const textContentLabel2 = models.studio.rightPanel.frame.locator(
      '[data-test-id="text-content"] label'
    );
    await textContentLabel2.click({ button: "right" });
    await models.studio.frame.getByText("Use dynamic value").click();

    const dataPicker2 = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"]'
    );
    await dataPicker2.waitFor({ state: "visible", timeout: 5000 });

    const selectedDateOption = dataPicker2
      .locator("text=/calendar → selectedDate/")
      .first();
    await selectedDateOption.waitFor({ state: "visible" });
    await selectedDateOption.click();

    const saveButton2 = dataPicker2.locator('button:has-text("Save")');
    await saveButton2.click();

    await models.studio.withinLiveMode(async (liveFrame: any) => {
      await expect(liveFrame.locator("body")).not.toContainText(
        /2022-08-2[456]T\d{2}:\d{2}:\d{2}\.\d{3}Z/
      );

      await liveFrame
        .locator(".ant-picker-content")
        .getByText("25", { exact: true })
        .click();

      await expect(liveFrame.locator("body")).toContainText(
        /2022-08-2[456]T\d{2}:\d{2}:\d{2}\.\d{3}Z/
      );

      await expect(liveFrame.locator("body")).not.toContainText("month");
      await expect(liveFrame.locator("body")).not.toContainText("year");

      await liveFrame.locator(".ant-radio-button-wrapper").nth(1).click();
      await expect(liveFrame.locator("body")).not.toContainText("month");
      await expect(liveFrame.locator("body")).toContainText("year");

      await liveFrame.locator(".ant-radio-button-wrapper").nth(0).click();
      await expect(liveFrame.locator("body")).toContainText("month");
      await expect(liveFrame.locator("body")).not.toContainText("year");
    });

    await models.studio.rightPanel.checkNoErrors();
  });

  test("calendar valid range works", async ({ page, models }) => {
    await page.goto(`/projects/${projectId}`);

    await models.studio.createNewPageInOwnArena("Homepage");
    await models.studio.frames
      .first()
      .contentFrame()
      .locator("body")
      .waitFor({ state: "visible" });

    await models.studio.turnOffDesignMode();

    await addCalendar(models, page);
    const showExtraContent = models.studio.rightPanel.frame.locator(
      '#component-props-section [data-test-id="show-extra-content"]'
    );
    await showExtraContent.click();

    const validRangeLabel = models.studio.rightPanel.frame
      .locator('[data-test-id="prop-editor-row-validRange"] label')
      .filter({ hasText: "Valid range" });
    await validRangeLabel.click({ button: "right" });
    await models.studio.frame
      .locator("#use-dynamic-value-btn")
      .waitFor({ state: "visible" });

    const dynamicValueBtn = models.studio.frame.locator(
      "#use-dynamic-value-btn"
    );
    await dynamicValueBtn.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .waitFor({ state: "visible" });

    const switchToCodeBtn = models.studio.frame.getByText("Switch to Code");
    await switchToCodeBtn.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"] .react-monaco-editor-container')
      .waitFor({ state: "visible" });

    const monacoContainer = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"] .react-monaco-editor-container'
    );
    await monacoContainer.waitFor({ state: "visible", timeout: 5000 });
    await monacoContainer.click();

    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await page.keyboard.type('["2022-09-06", "2022-11-26"]');

    const saveButton = models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .locator('button:has-text("Save")');
    await saveButton.click();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {
        return page.keyboard.press("Escape");
      });

    await models.studio.withinLiveMode(async (liveFrame: any) => {
      await liveFrame.locator(".ant-radio-button-wrapper").nth(1).click();

      await liveFrame.locator(".ant-select-selector").first().click();
      await liveFrame
        .locator(".ant-select-dropdown .rc-virtual-list-holder-inner")
        .waitFor({ state: "visible" });

      const virtualList = liveFrame.locator(
        ".ant-select-dropdown .rc-virtual-list-holder-inner"
      );
      await expect(virtualList).not.toContainText("2023");
      await expect(virtualList).toContainText("2022");

      await virtualList.getByText("2022", { exact: true }).click();

      const disabledCells = liveFrame.locator(".ant-picker-cell-disabled");
      await disabledCells.first().waitFor({ state: "visible" });
      await expect(disabledCells).toHaveCount(9);
    });

    await models.studio.rightPanel.checkNoErrors();
  });

  test("calendar events are rendered", async ({ page, models }) => {
    await page.goto(`/projects/${projectId}`);

    await models.studio.createNewPageInOwnArena("Homepage");
    await models.studio.frames
      .first()
      .contentFrame()
      .locator("body")
      .waitFor({ state: "visible" });

    await models.studio.turnOffDesignMode();

    await addCalendar(models, page, "2023");

    const eventsLabel = models.studio.rightPanel.frame
      .locator('[data-test-id="prop-editor-row-data"] label')
      .filter({ hasText: "Events" });
    await eventsLabel.click({ button: "right" });
    await models.studio.frame
      .locator("#use-dynamic-value-btn")
      .waitFor({ state: "visible" });

    const dynamicValueBtn = models.studio.frame.locator(
      "#use-dynamic-value-btn"
    );
    await dynamicValueBtn.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .waitFor({ state: "visible" });

    const switchToCodeBtn = models.studio.frame.getByText("Switch to Code");
    await switchToCodeBtn.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"] .react-monaco-editor-container')
      .waitFor({ state: "visible" });

    const monacoContainer = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"] .react-monaco-editor-container'
    );
    await monacoContainer.waitFor({ state: "visible", timeout: 5000 });
    await monacoContainer.click();

    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    const eventsData = `[
      {
          "date": "2023-05-10 09:24:15",
          "name": "Mustafa Birthday",
          "color": "gold",
          "image": "https://www.one-stop-party-ideas.com/images/First-Outfit-Boy.jpg"
      },
      {
          "date": "2023-05-15 09:24:15",
          "name": "Affan Birthday",
          "color": "red",
          "image": "https://aspenjay.com/wp-content/uploads/2021/08/baby-1st-birthday-photos.jpg"
      },
      {
          "date": "2023-01-02T22:30:00.000+00:00",
          "name": "Usman Birthday",
          "color": "blue",
          "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
      },
      {
          "date": "Sun, 25 Apr 2021 13:23:12 +0630",
          "name": "Sarah Birthday",
          "color": "purple",
          "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
      },
      {
          "date": "2023-01-13T22:30:00.000+00:00",
          "name": "Jaweria Birthday",
          "color": "pink",
          "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
      },
      {
          "date": "2023-11-26T22:30:00.000+00:00",
          "name": "Safi Birthday",
          "color": "silver",
          "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
      }
  ]`;

    await page.keyboard.insertText(eventsData);
    await page.waitForTimeout(1000);

    const saveButton = models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .locator('button:has-text("Save")');
    await saveButton.click();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .waitFor({ state: "hidden", timeout: 5000 });

    await models.studio.withinLiveMode(async (liveFrame: any) => {
      await liveFrame.locator(".ant-radio-button-wrapper").nth(1).click();
      const may2023Cell = liveFrame.locator(
        '.ant-picker-month-panel table td[title="2023-05"]'
      );
      await may2023Cell.waitFor({ state: "visible" });
      const mayItems = may2023Cell.locator("li");
      await expect(mayItems).toHaveCount(2);

      const firstMayItem = mayItems.first();
      await expect(firstMayItem.locator(".ant-badge-color-gold")).toBeVisible();
      await expect(firstMayItem).toContainText("Mustafa Birthday");

      const secondMayItem = mayItems.nth(1);
      await expect(secondMayItem.locator(".ant-badge-color-red")).toBeVisible();
      await expect(secondMayItem).toContainText("Affan Birthday");

      const jan2023Cell = liveFrame.locator(
        '.ant-picker-month-panel table td[title="2023-01"]'
      );
      await expect(jan2023Cell.locator("li")).toHaveCount(2);

      const oct2023Cell = liveFrame.locator(
        '.ant-picker-month-panel table td[title="2023-10"]'
      );
      await expect(oct2023Cell.locator("li")).toHaveCount(0);

      const nov2023Cell = liveFrame.locator(
        '.ant-picker-month-panel table td[title="2023-11"]'
      );
      await expect(nov2023Cell.locator("li")).toHaveCount(1);

      const dec2023Cell = liveFrame.locator(
        '.ant-picker-month-panel table td[title="2023-12"]'
      );
      await expect(dec2023Cell.locator("li")).toHaveCount(0);
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
