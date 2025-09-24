import { expect } from "@playwright/test";
import { test } from "../../fixtures/test";

test.describe("Antd5 segmented", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "antd5",
        npmPkg: ["@plasmicpkgs/antd5"],
      },
    });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProject(projectId);
    }
  });

  test("state", async ({ models, page }) => {
    await models.studio.waitForFrameToLoad();

    await models.studio.createNewPageInOwnArena("Homepage");

    const frameCount = await models.studio.frames.count();
    const newFrame = models.studio.frames.nth(frameCount - 1);
    await newFrame.waitFor({ state: "visible", timeout: 5000 });
    await models.studio.focusFrameRoot(newFrame);

    await models.studio.turnOffDesignMode();

    await models.studio.leftPanel.insertNode("plasmic-antd5-segmented");

    await models.studio.leftPanel.insertNode("Text");

    const htmlAttributesSection = models.studio.rightPanel.frame.locator(
      'text="HTML attributes"'
    );
    await htmlAttributesSection.waitFor({ state: "visible", timeout: 5000 });
    await htmlAttributesSection.evaluate((element) => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await page.waitForTimeout(300);
    await htmlAttributesSection.click();
    await page.waitForTimeout(500);

    const idField = models.studio.rightPanel.frame
      .locator(
        'div[role="textbox"].templated-string-input[data-slate-editor="true"]'
      )
      .nth(2);

    await idField.waitFor({ state: "visible", timeout: 5000 });
    await idField.evaluate((element) => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await idField.click();
    await page.waitForTimeout(500);
    await page.keyboard.type("segmented-state");
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const outlineButton = models.studio.frame.locator(
      'button[data-test-tabkey="outline"]'
    );
    await outlineButton.click();

    const textElementInTree = models.studio.leftPanel.treeLabels
      .filter({ hasText: "Text" })
      .first();
    await textElementInTree.click();
    await page.waitForTimeout(500);

    await page.keyboard.press("Control+r");
    await page.waitForTimeout(500);
    await page.keyboard.type("text-segmented-state");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const renamedTextInTree = models.studio.leftPanel.treeLabels
      .filter({ hasText: "text-segmented-state" })
      .first();
    await renamedTextInTree.click();
    await page.waitForTimeout(500);

    const textContentLabel = models.studio.rightPanel.frame.locator(
      `[data-test-id="text-content"] label`
    );
    await textContentLabel.waitFor({ state: "visible", timeout: 15000 });

    const disablePane = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count = await disablePane.count();
    if (count > 0) {
      await disablePane
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await page.waitForTimeout(1000);
    await textContentLabel.click({ button: "right", force: true });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();

    const segmentedValueOption = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("segmented → value");
    await segmentedValueOption.waitFor({ state: "visible", timeout: 5000 });
    await segmentedValueOption.click();

    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.waitForSave();

    await models.studio.withinLiveMode(async (liveFrame) => {
      const segmented = liveFrame.locator(".ant-segmented");
      await segmented.waitFor({ state: "visible", timeout: 5000 });

      const textElement = liveFrame.locator("#segmented-state");

      const option2 = segmented.getByText("Option 2");
      await option2.click();
      await expect(textElement).toHaveText("Option 2");

      const option3 = segmented.getByText("Option 3");
      await option3.click();
      await expect(textElement).toHaveText("Option 3");
      const option1 = segmented.getByText("Option 1");
      await option1.click();
      await expect(textElement).toHaveText("Option 1");
    });
  });

  test("custom actions for slot Options", async ({ models, page }) => {
    await models.studio.waitForFrameToLoad();

    await models.studio.createNewPageInOwnArena("Homepage");

    const frameCount = await models.studio.frames.count();
    const newFrame = models.studio.frames.nth(frameCount - 1);
    await newFrame.waitFor({ state: "visible", timeout: 5000 });
    await models.studio.focusFrameRoot(newFrame);

    await models.studio.turnOffDesignMode();

    await models.studio.leftPanel.switchToTreeTab();

    await models.studio.leftPanel.insertNode("plasmic-antd5-segmented");

    const segmentedElement = models.studio.frame.locator(
      '[data-test-id="prop-editor-row-options"]'
    );
    await segmentedElement.waitFor({ state: "visible", timeout: 5000 });

    await models.studio.rightPanel.frame
      .locator(`#component-props-section [data-test-id="show-extra-content"]`)
      .click();

    const optionsLabel = models.studio.rightPanel.frame.locator(
      `[data-test-id="prop-editor-row-options"] label`
    );
    await expect(optionsLabel).toBeVisible();

    const slotOptions = models.studio.rightPanel.frame.locator(
      'text="Slot: Options"'
    );
    await expect(slotOptions).not.toBeVisible();

    const addNewOption = models.studio.rightPanel.frame.locator(
      'text="Add new option"'
    );
    await expect(addNewOption).not.toBeVisible();

    const deleteCurrentOption = models.studio.rightPanel.frame.locator(
      'text="Delete current option"'
    );
    await expect(deleteCurrentOption).not.toBeVisible();

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-useSlotOptions"] label`)
      .first()
      .click({ button: "right" });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();
    const switchToCode = models.studio.frame.getByText("Switch to Code");
    await switchToCode.waitFor({ state: "visible" });
    await switchToCode.click();
    await models.studio.rightPanel.insertMonacoCode("true");

    await slotOptions.waitFor({ state: "visible", timeout: 5000 });

    await expect(optionsLabel).not.toBeVisible();
    await expect(slotOptions).toBeVisible();
    await expect(addNewOption).toBeVisible();
    await expect(deleteCurrentOption).not.toBeVisible();

    for (let i = 0; i < 4; i++) {
      await addNewOption.click();
      await expect(addNewOption).toBeVisible();
    }

    const valueDropdown = models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-value"] button`)
      .nth(1);
    await valueDropdown.click();

    const option5 = models.studio.rightPanel.frame
      .locator(`[role="listbox"]`)
      .getByText("Option 5");
    await option5.waitFor({ state: "visible" });
    await option5.click();

    await expect(deleteCurrentOption).toBeVisible();
    await deleteCurrentOption.click();

    await models.studio.leftPanel.insertNode("Text");

    const textContent = models.studio.rightPanel.frame.locator(
      '[data-test-id="text-content"]'
    );
    await textContent.waitFor({ state: "visible", timeout: 5000 });

    const htmlAttributesSection = models.studio.rightPanel.frame.locator(
      'text="HTML attributes"'
    );
    await htmlAttributesSection.waitFor({ state: "visible", timeout: 5000 });
    await htmlAttributesSection.evaluate((element) => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await page.waitForTimeout(300);
    await htmlAttributesSection.click();
    await page.waitForTimeout(500);

    const idField = models.studio.rightPanel.frame
      .locator(
        'div[role="textbox"].templated-string-input[data-slate-editor="true"]'
      )
      .nth(2);

    await idField.waitFor({ state: "visible", timeout: 5000 });
    await idField.evaluate((element) => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await idField.click();
    await page.waitForTimeout(500);
    await page.keyboard.type("segmented-state");
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const textElementInTree = models.studio.leftPanel.treeLabels
      .filter({ hasText: "Text" })
      .first();
    await textElementInTree.click();
    await page.waitForTimeout(500);

    await page.keyboard.press("Control+r");
    await page.waitForTimeout(500);
    await page.keyboard.type("text-segmented-state");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await models.studio.waitForSave();

    const textInTree = models.studio.leftPanel.treeLabels
      .filter({ hasText: "text-segmented-state" })
      .first();
    await textInTree.click();
    await page.waitForTimeout(500);

    const textContentLabel = models.studio.rightPanel.frame.locator(
      `[data-test-id="text-content"] label`
    );
    await textContentLabel.waitFor({ state: "visible", timeout: 15000 });

    const disablePane = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count = await disablePane.count();
    if (count > 0) {
      await disablePane
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await page.waitForTimeout(1000);
    await textContentLabel.click({ button: "right", force: true });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();

    const segmentedValueOption2 = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("segmented → value");
    await segmentedValueOption2.waitFor({ state: "visible" });
    await segmentedValueOption2.click();

    const saveButton = models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByRole("button", { name: "Save" });
    await saveButton.waitFor({ state: "visible" });
    await saveButton.click();

    await models.studio.waitForSave();

    await models.studio.withinLiveMode(async (liveFrame) => {
      const segmented = liveFrame.locator(".ant-segmented");
      await segmented.waitFor({ state: "visible", timeout: 10000 });

      const segmentedItems = liveFrame.locator(".ant-segmented-item");
      await expect(segmentedItems).toHaveCount(5);

      await expect(segmentedItems.nth(0)).toContainText("Option 1");
      await expect(segmentedItems.nth(1)).toContainText("Option 2");
      await expect(segmentedItems.nth(2)).toContainText("Option 3");
      await expect(segmentedItems.nth(3)).toContainText("Option 4");
      await expect(segmentedItems.nth(4)).toContainText("Option 6");

      const selectedItem = liveFrame.locator(".ant-segmented-item-selected");
      await expect(selectedItem).toContainText("Option 4");
    });
  });
});
