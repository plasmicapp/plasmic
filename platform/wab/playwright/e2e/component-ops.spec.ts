import { expect, FrameLocator } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("component-ops - tricky operations", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "component-ops" });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can extract component with VarRefs, states, implicit states", async ({
    page,
    models,
  }) => {
    models.studio.leftPanel.addComponent("CompA");
    const compAFrame: FrameLocator = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("div")
      .filter({ hasText: /^CompA800 ✕ 500CompA800 × 500$/ })
      .locator("iframe")
      .contentFrame();
    await compAFrame.locator("body").click();
    await models.studio.rightPanel.switchToComponentDataTab();

    await models.studio.rightPanel.addComponentProp(
      "withDefaultValue",
      "text",
      "defaultValue1"
    );

    await models.studio.rightPanel.addState({
      name: "count",
      variableType: "number",
      accessType: "writable",
      initialValue: "5",
    });

    await models.studio.leftPanel.addComponent("CompB");
    await models.studio.leftPanel.insertNode("Vertical stack");
    await page.keyboard.press("Enter");
    await models.studio.leftPanel.insertNode("CompA");
    await page.keyboard.press("Enter");

    await models.studio.rightPanel.switchToSettingsTab();

    const withDefaultValueProp = models.studio.frame
      .locator('[data-plasmic-prop="withDefaultValue"]')
      .first();
    await withDefaultValueProp.click({ button: "right" });
    await models.studio.allowExternalAccess();
    await models.studio.createNewProp();
    await models.studio.linkNewProp("linkProp1");

    await models.studio.leftPanel.insertNode("Vertical stack");
    await models.studio.rightPanel.expandHtmlAttributesSection();

    const tabIndexProp = models.studio.frame
      .locator('[data-plasmic-prop="tabIndex"]')
      .first();
    await tabIndexProp.fill("5");
    await tabIndexProp.press("Enter");
    await tabIndexProp.click({ button: "right" });
    await models.studio.allowExternalAccess();
    await models.studio.createNewProp();
    await models.studio.linkNewProp("linkProp2");

    const titleProp = models.studio.frame
      .locator('[data-plasmic-prop="title"]')
      .first();
    await titleProp.pressSequentially("5");
    await titleProp.press("Enter");
    await titleProp.click({ button: "right" });
    await models.studio.allowExternalAccess();
    await models.studio.linkToExistingProp("linkProp2");
    await page.keyboard.press("Shift+Enter");

    await models.studio.extractComponentNamed("CompC");

    const propCount = await models.studio.rightPanel.getPropEditorRowsCount();
    expect(propCount).toBe(2);
  });

  test("can hide element on hover", async ({ models, page }) => {
    await models.studio.leftPanel.addComponent("CompA");

    await models.studio.leftPanel.editComponentWithName("CompA");

    const frame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .nth(1)
      .contentFrame();
    await models.studio.leftPanel.switchToTreeTab();
    await frame.locator("body").click();

    await models.studio.leftPanel.insertText();
    await models.studio.renameTreeNode("text1");
    await models.studio.leftPanel.insertText();

    await models.studio.renameTreeNode("text2");

    await models.studio.rightPanel.switchToComponentDataTab();

    await models.studio.rightPanel.addInteractionVariant("Hover");

    const newFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("div")
      .filter({
        hasText: /^CompA800 ✕ 500Base \+ Interactions1180 ✕ 540Combinations$/,
      })
      .locator("iframe")
      .nth(2)
      .contentFrame();
    await newFrame.locator("body").click();
    await models.studio.leftPanel.selectTreeNode(["vertical stack", "text2"]);
    await models.studio.deleteSelection();

    await models.studio.deleteInsteadButton.waitFor({ state: "visible" });
  });

  test("Can de-slot a slot whose args also have tpl slots", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addComponent("CompA");
    await models.studio.leftPanel.addComponent("CompB");
    await models.studio.leftPanel.addComponent("CompC");

    const compAFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator(".canvas-editor__viewport")
      .first()
      .contentFrame();
    const compBFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator(
        "div:nth-child(2) > .CanvasFrame__Container > .canvas-editor__viewport"
      )
      .contentFrame();
    const compCFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator(
        "div:nth-child(3) > .CanvasFrame__Container > .canvas-editor__viewport"
      )
      .contentFrame();

    await page.keyboard.press("Shift+Digit1");
    await compAFrame.locator("body").click();
    await models.studio.leftPanel.insertText();
    await models.studio.convertToSlot();

    await compBFrame.locator("body").click();

    await models.studio.leftPanel.insertNode("CompA");
    await page.keyboard.press("Enter");
    await models.studio.deleteSelection();
    await models.studio.leftPanel.insertText();
    await models.studio.leftPanel.insertText();
    await models.studio.convertToSlot();
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.press("Enter");
    await models.studio.convertToSlot();
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode([
      "vertical stack",
      "CompA",
      'Slot: "children"',
      'Slot Target: "children"',
    ]);
    await models.studio.leftPanel.selectTreeNode([
      "vertical stack",
      "CompA",
      'Slot: "children"',
      'Slot Target: "slot"',
    ]);

    await compCFrame.locator("body").click();

    await models.studio.leftPanel.insertNode("CompB");
    await models.studio.leftPanel.selectTreeNode([
      "vertical stack",
      "CompB",
      'Slot: "children"',
    ]);
    await models.studio.leftPanel.insertText();
    await models.studio.convertToSlot();

    await compAFrame.locator("body").click();

    const childrenLocator = await models.studio.leftPanel.selectTreeNode([
      "vertical stack",
      'Slot Target: "children"',
    ]);
    await childrenLocator.click({ button: "right" });
    await models.studio.deslotButton.click();

    await models.studio.leftPanel.selectTreeNode(["vertical stack"]);
    await page.keyboard.press("Enter");
    await models.studio.rightPanel.textContentButton.click({ force: true });

    await page.keyboard.insertText("--->Hello!");
    await page.keyboard.press("Escape");

    await page.waitForTimeout(500);

    await compCFrame.locator("body").click();

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    const selectedNode = models.studio.leftPanel.focusedTreeNode;
    await expect(selectedNode).toContainText("CompB");

    await expect(compCFrame.getByText("--->Hello!")).toBeVisible({
      timeout: 10000,
    });
    await models.studio.rightPanel.checkNoErrors();
  });
});
