import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("data-rep", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({
      name: "data-rep",
    });
    await goToProject(page, `/projects/${projectId}`);
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

  test("can repeat select options and have multiple levels of repetition", async ({
    page,
    models,
  }) => {
    await models.studio.createNewFrame();
    const frame = models.studio.componentFrame;

    await models.studio.focusFrameRoot(frame);
    await models.studio.leftPanel.insertNode("Select");

    await models.studio.rightPanel.removePropValue("Options");

    const variantSection = models.studio.frame.locator(
      '[data-test-id="variants-picker-section"]'
    );
    const isOpenVariant = variantSection
      .locator('[data-plasmic-role="labeled-item"]')
      .filter({ hasText: "Is open" })
      .locator("input");
    await isOpenVariant.click({ force: true });

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode([
      "Select",
      'Slot: "children"',
    ]);

    await models.studio.leftPanel.insertNode("Option Group");
    await models.studio.rightPanel.repeatOnCustomCode('["Group A", "Group B"]');

    await page.waitForTimeout(1000);
    const treeLabels = models.studio.leftPanel.treeLabels;
    const selectLabel = treeLabels.filter({ hasText: "Select" }).first();
    await selectLabel.click();

    const selectExpander = selectLabel.locator(
      '.tpltree__label__expander[data-state-isopen="false"]'
    );
    if (await selectExpander.isVisible({ timeout: 1000 }).catch(() => false)) {
      await selectExpander.click();
    }

    const childrenSlot = treeLabels
      .filter({ hasText: 'Slot: "children"' })
      .first();
    await childrenSlot.click();

    const slotExpander = childrenSlot.locator(
      '.tpltree__label__expander[data-state-isopen="false"]'
    );
    if (await slotExpander.isVisible({ timeout: 1000 }).catch(() => false)) {
      await slotExpander.click();
    }

    const optionGroup = treeLabels.filter({ hasText: "Option Group" }).first();
    await optionGroup.click();

    const ogExpander = optionGroup.locator(
      '.tpltree__label__expander[data-state-isopen="false"]'
    );
    if (await ogExpander.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ogExpander.click();
    }

    const ogChildrenSlot = treeLabels
      .filter({ hasText: 'Slot: "children"' })
      .last();
    await ogChildrenSlot.click();

    const focusedNode = models.studio.leftPanel.focusedTreeNode;
    await focusedNode.click({ button: "right" });
    await models.studio.frame.getByText("Clear slot content").click();

    await models.studio.leftPanel.insertNode("Option");
    await models.studio.rightPanel.repeatOnCustomCode(
      '[{label: "Opt 1", value: 1}, {label: "Opt 2", value: 2}, {label: "Opt 3", value: 3}]'
    );

    const titleSlot = treeLabels.filter({ hasText: 'Slot: "title"' }).first();
    await titleSlot.click();

    const titleExpander = titleSlot.locator(
      '.tpltree__label__expander[data-state-isopen="false"]'
    );
    if (await titleExpander.isVisible({ timeout: 1000 }).catch(() => false)) {
      await titleExpander.click();
    }

    const groupNameText = treeLabels.filter({ hasText: "Group Name" }).first();
    await groupNameText.click();
    await models.studio.rightPanel.bindTextContentToCustomCode("currentItem");

    const optionLabel = treeLabels.filter({ hasText: "Option" }).first();
    await optionLabel.click();

    const optionExpander = optionLabel.locator(
      '.tpltree__label__expander[data-state-isopen="false"]'
    );
    if (await optionExpander.isVisible({ timeout: 1000 }).catch(() => false)) {
      await optionExpander.click();
    }

    const optionChildrenSlot = treeLabels
      .filter({ hasText: 'Slot: "children"' })
      .last();
    await optionChildrenSlot.click();

    const optionChildExpander = optionChildrenSlot.locator(
      '.tpltree__label__expander[data-state-isopen="false"]'
    );
    if (
      await optionChildExpander.isVisible({ timeout: 1000 }).catch(() => false)
    ) {
      await optionChildExpander.click();
    }

    const optionText = treeLabels.filter({ hasText: '"Option"' }).first();
    await optionText.click();
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "currentItem.label"
    );

    const expectedGroups = ["Group A", "Group B"];
    const expectedOptions = [
      "Opt 1",
      "Opt 2",
      "Opt 3",
      "Opt 1",
      "Opt 2",
      "Opt 3",
    ];

    await models.studio.withinLiveMode(async (liveFrame) => {
      await liveFrame.locator("#plasmic-app button").click();

      const groups = liveFrame.locator('[role="presentation"]');
      await expect(groups).toHaveCount(expectedGroups.length);
      for (let i = 0; i < expectedGroups.length; i++) {
        await expect(groups.nth(i)).toContainText(expectedGroups[i]);
      }

      const options = liveFrame.locator('[role="option"]');
      await expect(options).toHaveCount(expectedOptions.length);
      for (let i = 0; i < expectedOptions.length; i++) {
        await expect(options.nth(i)).toContainText(expectedOptions[i]);
      }
    });
  });

  test("can repeat rich text children", async ({ page, models }) => {
    await models.studio.createNewFrame();
    const frame = models.studio.componentFrame;

    await models.studio.focusFrameRoot(frame);
    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(500);

    const editor = frame.locator(".__wab_editor").first();
    await editor.dblclick({ force: true });
    await page.waitForTimeout(500);

    const contentEditable = frame.locator('[contenteditable="true"]').first();
    await contentEditable.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await contentEditable.pressSequentially("Hello World!");
    await page.waitForTimeout(100);

    await contentEditable.evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let textNode = walker.nextNode();
      while (textNode) {
        if (textNode.textContent?.includes("Hello World!")) {
          const text = textNode.textContent;
          const worldIndex = text.indexOf("World");
          if (worldIndex !== -1) {
            const range = document.createRange();
            range.setStart(textNode, worldIndex);
            range.setEnd(textNode, worldIndex + 5);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
        textNode = walker.nextNode();
      }
    });

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await page.keyboard.press(`${cmdKey}+k`);
    await page.waitForTimeout(500);
    await page.keyboard.type("/");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await models.studio.focusFrameRoot(frame);
    await models.studio.leftPanel.switchToTreeTab();
    await page.waitForTimeout(500);

    const treeLabels = models.studio.leftPanel.treeLabels;

    const textLabel = treeLabels
      .filter({ hasText: '"Hello [child]!"' })
      .first();
    if ((await textLabel.count()) > 0) {
      await textLabel.click();
      const expander = textLabel.locator(
        '.tpltree__label__expander[data-state-isopen="false"]'
      );
      if ((await expander.count()) > 0) {
        await expander.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    const worldLabel = treeLabels.filter({ hasText: '"World"' }).first();
    if ((await worldLabel.count()) > 0) {
      await worldLabel.click();
    }

    await models.studio.rightPanel.repeatOnCustomCode('["foo", "bar", "baz"]');

    const elementNameInput = models.studio.frame.locator(
      '[data-test-id="repeating-element-name"] input'
    );
    await elementNameInput.press("Control+a");
    await elementNameInput.fill("item");
    await elementNameInput.press("Enter");

    const textContentLabel = models.studio.frame.locator(
      '[data-test-id="text-content"] label'
    );
    await textContentLabel.click({ button: "right" });
    await models.studio.frame.getByText("Use dynamic value").click();
    await models.studio.rightPanel.selectPathInDataPicker(["item"]);

    await models.studio.focusFrameRoot(frame);
    await page.waitForTimeout(1000);

    const rootElt = frame.locator(".__wab_root");
    await expect(rootElt).toContainText("foobarbaz");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const app = liveFrame.locator("#plasmic-app");
      await expect(app).toContainText("foobarbaz");
    });
  });
});
