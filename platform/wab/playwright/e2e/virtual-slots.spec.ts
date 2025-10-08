import { expect } from "@playwright/test";
import {
  HORIZ_CONTAINER_CAP,
  VERT_CONTAINER_CAP,
} from "../../src/wab/shared/Labels";
import { test } from "../fixtures/test";
import { undoAndRedo } from "../utils/undo-and-redo";

test.describe("virtual-slots", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "virtual-slots" });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can work with virtual slots properly", async ({ page, models }) => {
    await models.studio.leftPanel.addComponent("MyButton");
    const myButtonFrame = await models.studio.focusCreatedFrameRoot();

    await models.studio.focusFrameRoot(myButtonFrame);
    await page.keyboard.press("Enter");
    await models.studio.insertTextNodeWithContent("Button");
    await models.studio.convertToSlot();

    await page.keyboard.press("Escape");

    await expect(models.studio.frame.locator(".hoverbox")).not.toBeVisible();

    await models.studio.leftPanel.insertNode("New component");
    await models.studio.leftPanel.setComponentName("MyPanel");
    await models.studio.waitForFrameToLoad();

    await page.keyboard.press("Enter");
    await models.studio.leftPanel.insertNode(HORIZ_CONTAINER_CAP);
    await models.studio.renameTreeNode("hstack");

    await models.studio.leftPanel.insertNode("MyButton");
    await models.studio.renameTreeNode("button1");

    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();

    await models.studio.leftPanel.frame.getByText(`Slot: "children"`).click();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`hstack`).click();
    await models.studio.leftPanel.insertNode("MyButton");
    await models.studio.renameTreeNode("button2");

    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(1)
      .click();
    await page.waitForTimeout(1000);
    await models.studio.leftPanel.frame.getByText('"Button"').nth(1).click();
    await page.waitForTimeout(1000);
    await page.keyboard.press("Enter");
    const myPanelFrame = models.studio.getComponentFrameByIndex(1);
    await page.waitForTimeout(1000);
    await page.keyboard.type("Weird");
    await page.keyboard.press("Escape");
    await expect(myPanelFrame.getByText("Weird")).toBeVisible();

    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(1)
      .click();
    const selectedNode = models.studio.leftPanel.focusedTreeNode;
    await selectedNode.click({ button: "right", force: true });
    const revertToItem = models.studio.frame
      .locator("text=/^revert to/i")
      .nth(1);
    await expect(revertToItem).toBeVisible();

    await selectedNode.click({ force: true });

    await models.studio.clickSelectedTreeNodeContextMenu("Revert to");
    await expect(myPanelFrame.getByText("Weird")).not.toBeVisible();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`"Button"`).nth(1).click();
    await page.keyboard.press("Enter");
    await myPanelFrame
      .locator(".__wab_editing")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.type("Weird");
    await page.keyboard.press("Escape");
    await expect(myPanelFrame.getByText("Weird")).toBeVisible();

    await models.studio.leftPanel.frame.getByText(`hstack`).click();
    await models.studio.clickSelectedTreeNodeContextMenu("Convert to a slot");

    await models.studio.leftPanel.frame.getByText(`button1`).click();
    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .first()
      .click();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`button2`).click();
    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(1)
      .click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();

    await models.studio.leftPanel.frame
      .getByText(`vertical stack`)
      .first()
      .click();

    await models.studio.leftPanel.insertNode(VERT_CONTAINER_CAP);
    await models.studio.renameTreeNode("vstack");
    await models.studio.leftPanel.insertNode("MyButton");
    await models.studio.renameTreeNode("button3");

    const sourceNode = models.studio.leftPanel.focusedTreeNode;
    const targetLocator = models.studio.leftPanel.treeRoot.getByText(
      `Slot Target: "hstack 2"`
    );
    const sourceBox = await sourceNode.boundingBox();
    const targetBox = await targetLocator.boundingBox();

    await page.mouse.move(
      sourceBox!.x + sourceBox!.width / 2,
      sourceBox!.y + sourceBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(targetBox!.x + targetBox!.width / 1.5, targetBox!.y, {
      steps: 20,
    });
    await page.mouse.up();

    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .first()
      .click();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(1)
      .click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();

    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(2)
      .click();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`button3`).click();

    const sourceNode2 = models.studio.leftPanel.focusedTreeNode;
    const targetLocator2 = models.studio.leftPanel.treeRoot.getByText(`vstack`);
    const sourceBox2 = await sourceNode2.boundingBox();
    const targetBox2 = await targetLocator2.boundingBox();

    await page.mouse.move(
      sourceBox2!.x + sourceBox2!.width / 2,
      sourceBox2!.y + sourceBox2!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(targetBox2!.x + 100, targetBox2!.y + 15, {
      steps: 10,
    });
    await page.mouse.up();

    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(2)
      .click();
    await models.studio.checkSelectedPropNodeAs("default");

    await page.keyboard.press("Escape");

    await page.waitForTimeout(1000);

    await models.studio.leftPanel.insertNode("New scratch artboard");
    const artboardFrame = models.studio.getComponentFrameByIndex(2);

    await models.studio.addNodeToSelectedFrame("MyPanel", 10, 10);
    await models.studio.renameTreeNode("panel1");

    await models.studio.leftPanel.frame.getByText(`Slot: "hstack 2"`).click();

    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`button1`).click();
    await models.studio.leftPanel.frame.getByText(`Slot: "children"`).click();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`button2`).click();
    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(1)
      .click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();

    await revertToItem.click();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`Slot: "hstack 2"`).click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();

    await revertToItem.click();
    await models.studio.checkSelectedPropNodeAs("default");

    await models.studio.leftPanel.frame.getByText(`button1`).click();
    await models.studio.leftPanel.frame.getByText(`Slot: "children"`).click();
    await models.studio.leftPanel.frame.getByText(`"Button"`).click();
    await page.keyboard.press("Enter");
    await artboardFrame
      .locator(".__wab_editing")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.type("Howdy");
    await page.keyboard.press("Escape");
    await models.studio.leftPanel.frame.getByText(`Slot: "children"`).click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();
    await expect(artboardFrame.getByText("Howdy")).toBeVisible();

    await models.studio.leftPanel.frame.getByText(`Slot: "hstack 2"`).click();
    await models.studio.clickSelectedTreeNodeContextMenu("Revert to");
    await models.studio.checkSelectedPropNodeAs("default");
    await expect(artboardFrame.getByText("Howdy")).not.toBeVisible();

    await models.studio.leftPanel.frame
      .getByText(`Slot: "hstack 2"`)
      .first()
      .click();
    await models.studio.leftPanel.insertNode("MyButton");
    await models.studio.renameTreeNode("button4");

    await models.studio.leftPanel.frame.getByText(`Slot: "children"`).click();
    await models.studio.leftPanel.frame.getByText(`"Button"`).click();
    await page.keyboard.press("Enter");
    await artboardFrame
      .locator(".__wab_editing")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.type("OMG");
    await page.keyboard.press("Escape");

    await models.studio.leftPanel.frame.getByText(`Slot: "hstack 2"`).click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();

    await models.studio.leftPanel.frame.getByText(`button1`).click();
    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .first()
      .click();
    await models.studio.checkSelectedPropNodeAs("default");
    await models.studio.leftPanel.frame.getByText(`button2`).click();
    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(1)
      .click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();
    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(2)
      .click();
    await selectedNode.click({ button: "right", force: true });
    await expect(revertToItem).toBeVisible();

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.getByText("Weird")).toBeVisible();
      await expect(liveFrame.getByText("Howdy")).not.toBeVisible();
      await expect(liveFrame.getByText("OMG")).toBeVisible();
    });

    const checkEndState = async () => {
      await models.studio.focusFrame(artboardFrame);
      await expect(artboardFrame.getByText("OMG")).toBeVisible();
      await models.studio.rightPanel.checkNoErrors();
    };

    await checkEndState();
    await undoAndRedo(page);
    await checkEndState();
  });
});
