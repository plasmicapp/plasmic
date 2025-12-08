import { expect, Locator } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/key-utils";
import { goToProject } from "../utils/studio-utils";

test.describe("left-panel", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "left-panel" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("shows a blue indicator and popover to the left of an element if any non-default property", async ({
    models,
  }) => {
    await models.studio.leftPanel.addAndSelectNewArtboard();

    await models.studio.leftPanel.insertNode("Text");

    await models.studio.leftPanel.switchToTreeTab();
    const selectedNode = models.studio.leftPanel.focusedTreeNode;
    await selectedNode
      .locator('[data-test-class="left-panel-indicator"] > div')
      .hover();

    const indicators = models.studio.frame.locator(
      '[data-test-class="indicator-clear"]'
    );
    const count = await indicators.count();
    for (let i = count - 1; i >= 0; i -= 1) {
      await indicators.nth(i).click();
    }

    await expect(
      selectedNode.locator('[data-test-class="left-panel-indicator"] > div')
    ).toBeVisible();
  });

  test("should allow copy and paste from outline", async ({ page, models }) => {
    // Click a Tpl element selector `el`, wait for it to be selected, and press a key
    const selectElementAndPress = async (el: Locator, key: string) => {
      await el.click();
      await models.studio.frame
        .locator(".HoverBox__Dims")
        .waitFor({ state: "visible" });
      await page.keyboard.press(key);
    };

    await models.studio.leftPanel.addAndSelectNewArtboard();

    await models.studio.leftPanel.insertNode("Vertical stack");

    await models.studio.leftPanel.switchToTreeTab();
    const selectedNode = models.studio.leftPanel.focusedTreeNode;

    await selectElementAndPress(selectedNode, `${modifierKey}+c`);

    const PASTES_COUNT = 10;
    for (let i = 0; i < PASTES_COUNT; i++) {
      await selectElementAndPress(selectedNode, `${modifierKey}+v`);
    }

    await selectElementAndPress(selectedNode, `${modifierKey}+c`);

    await page.keyboard.press(`${modifierKey}+v`);
    const treeLabels = models.studio.leftPanel.treeLabels;
    const labelCount = await treeLabels.count();
    expect(labelCount).toBe(1 + 1 + PASTES_COUNT + 1);
    // free box + original + multiple pastes + 1 paste
  });
});
