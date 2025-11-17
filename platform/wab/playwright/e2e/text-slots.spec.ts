import { expect } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";
import { undoAndRedo } from "../utils/undo-and-redo";

async function chooseFont(models: PageModels, fontName: string) {
  await models.studio.rightPanel.switchToDesignTab();
  await models.studio.rightPanel.fontFamilyInput.click();
  await models.studio.rightPanel.fontFamilyInput.type(fontName);
  await models.studio.rightPanel.fontFamilyInput.press("Enter");
}

test.describe("text-slots", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "text-slots" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create, override content, edit default content/styles", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addComponent("Widget");
    const widgetFrame = models.studio.getComponentFrameByIndex(0);
    await models.studio.leftPanel.insertNode("Text");

    const frame2 = await models.studio.createNewFrame();

    await page.keyboard.press("Shift+1");

    await page.waitForTimeout(500);

    await models.studio.focusFrameRoot(frame2);
    await page.waitForTimeout(500);

    await page.keyboard.press("Shift+A");
    await page.waitForTimeout(500);

    await models.studio.leftPanel.addButton.click();
    await page.waitForTimeout(500);
    await models.studio.leftPanel.addSearchInput.fill("Widget");
    await page.waitForTimeout(500);

    const widgetItem = models.studio.leftPanel.frame
      .locator('li[data-plasmic-add-item-name="Widget"]')
      .first();
    await widgetItem.waitFor({ state: "visible", timeout: 10000 });

    const sourceBox = await widgetItem.boundingBox();

    const artboardFrame = models.studio
      .getComponentFrameByIndex(1)
      .locator("body");
    const targetBox = await artboardFrame.locator(".__wab_root").boundingBox();

    await page.mouse.move(
      sourceBox!.x + sourceBox!.width / 2,
      sourceBox!.y + sourceBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 1.5,
      targetBox!.y + targetBox!.y / 2,
      {
        steps: 20,
      }
    );
    await page.mouse.up();
    await page.waitForTimeout(500);
    await models.studio.renameTreeNode("widget1");
    await page.waitForTimeout(500);

    await models.studio.focusFrameRoot(artboardFrame);
    await page.waitForTimeout(100);

    await models.studio.leftPanel.insertNode("Widget");
    await models.studio.renameTreeNode("widget2");

    await models.studio.focusFrameRoot(widgetFrame);
    await page.keyboard.press("Enter");
    await models.studio.convertToSlot();

    await models.studio.focusFrameRoot(artboardFrame);

    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.type("Hello");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");

    await models.studio.rightPanel.chooseFontSize("24px");

    await models.studio.focusFrameRoot(frame2);

    const isLeftPanelVisible = await models.studio.leftPanel.frame
      .locator(".tpltree__root")
      .isVisible();

    if (!isLeftPanelVisible) {
      await models.studio.leftPanel.switchToTreeTab();
      await page.waitForTimeout(500);
    }

    await models.studio.focusFrameRoot(artboardFrame);

    await models.studio.leftPanel.treeLabels
      .filter({ hasText: `Slot: "children"` })
      .nth(1)
      .click();
    await models.studio.leftPanel.frame.getByText(`"Enter some text"`).click();

    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.type("World");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");

    await models.studio.leftPanel.frame
      .getByText(`Slot: "children"`)
      .nth(1)
      .click({ button: "right" });
    await models.studio.leftPanel.frame
      .locator(".ant-dropdown-menu-item", {
        hasText: "Revert to default slot content",
      })
      .click();

    await models.studio.focusFrameRoot(widgetFrame);
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.type("Goodbye");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");

    await chooseFont(models, "couri");

    await models.studio.leftPanel.switchToTreeTab();

    await page.waitForTimeout(1000);

    await models.studio.focusFrameRoot(widgetFrame);

    await page.waitForTimeout(2000);

    if (!isLeftPanelVisible) {
      await models.studio.leftPanel.switchToTreeTab();
    }

    await models.studio.leftPanel.frame.getByText(/^Slot/).first().click();

    await chooseFont(models, "couri");

    await models.studio.focusFrameRoot(frame2);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await page.keyboard.press("ArrowRight");

      await expect(liveFrame.getByText("Hello")).toHaveCSS(
        "font-family",
        '"Courier New"'
      );
      await expect(liveFrame.getByText("Hello")).toHaveCSS("font-size", "24px");
      await expect(liveFrame.getByText("Goodbye")).toHaveCSS(
        "font-family",
        '"Courier New"'
      );
      await expect(liveFrame.getByText("Goodbye")).toHaveCSS(
        "font-size",
        "16px"
      );
    });

    const checkEndState = async () => {
      await page.waitForTimeout(1000);
      await models.studio.focusFrameRoot(widgetFrame);
      await page.keyboard.press("Enter");
      const selectionTag = models.studio.frame.locator(".node-outline-tag");
      await expect(selectionTag).toContainText('Slot Target: "children"');

      await models.studio.focusFrameRoot(frame2);
      const frame2root = frame2.contentFrame();

      await expect(frame2root.getByText("Hello")).toBeVisible();
      await expect(frame2root.getByText("Goodbye")).toBeVisible();
      await expect(frame2root.getByText("Hello")).toHaveCSS(
        "font-size",
        "24px"
      );

      for (const msg of ["Hello", "Goodbye"]) {
        await expect(frame2root.getByText(msg)).toHaveCSS(
          "font-family",
          '"Courier New"'
        );
      }

      await models.studio.rightPanel.checkNoErrors();
    };

    await checkEndState();
    await undoAndRedo(page);
    await checkEndState();
  });
});
