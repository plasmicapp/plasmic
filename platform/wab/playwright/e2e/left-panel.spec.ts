import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/modifier-key";

test.describe("left-panel", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "left-panel" });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("shows a blue indicator and popover to the left of an element if any non-default property", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addNewFrame();
    const artboardFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const artboardBody = artboardFrame.locator("body");
    await artboardBody.click();

    await models.studio.leftPanel.insertNode("Text");

    await models.studio.leftPanel.switchToTreeTab();
    const selectedNode = models.studio.leftPanel.focusedTreeNode;
    await selectedNode
      .locator('[data-test-class="left-panel-indicator"] > div')
      .hover();

    await models.studio.leftPanel.clearAllIndicators();

    await expect(
      selectedNode.locator('[data-test-class="left-panel-indicator"] > div')
    ).toBeVisible();
  });

  test("should allow copy and paste from outline", async ({ page, models }) => {
    await models.studio.leftPanel.addNewFrame();
    const artboardFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const artboardBody = artboardFrame.locator("body");
    await artboardBody.click();

    await models.studio.leftPanel.insertNode("Vertical stack");

    await models.studio.leftPanel.switchToTreeTab();
    const selectedNode = models.studio.leftPanel.focusedTreeNode;

    await selectedNode.click();
    await page.waitForTimeout(500); // When running headed, the copy instruction wil occur before actually selecting if there is no waiting
    await page.keyboard.press(`${modifierKey}+c`);

    const PASTES_COUNT = 10;

    for (let i = 0; i < PASTES_COUNT; i++) {
      await selectedNode.click();
      await page.keyboard.press(`${modifierKey}+v`);
    }

    await selectedNode.click();

    await page.keyboard.press(`${modifierKey}+c`);
    await selectedNode.click();
    await page.keyboard.press(`${modifierKey}+v`);
    const treeLabels = models.studio.leftPanel.treeLabels;
    const labelCount = await treeLabels.count();
    expect(labelCount).toBe(1 + 1 + PASTES_COUNT + 1);
    // free box + original + multiple pastes + 1 paste
  });
});
