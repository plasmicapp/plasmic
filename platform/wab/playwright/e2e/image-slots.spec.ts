import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";
import { undoAndRedo } from "../utils/undo-and-redo";

test.describe("image-slots", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({
      name: "image-slots",
    });
    await goToProject(page, `/projects/${projectId}?plexus=true`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create, override content, edit default content", async ({
    page,
    models,
  }) => {
    const widgetFrame = models.studio.getComponentFrameByIndex(0);
    await models.studio.leftPanel.addComponent("Widget");

    await models.studio.leftPanel.addButton.click({ force: true });
    await page.waitForTimeout(500);
    await models.studio.leftPanel.addSearchInput.fill("Image");
    await page.waitForTimeout(500);

    const item = models.studio.leftPanel.frame
      .locator(`li[data-plasmic-add-item-name="Image"]`)
      .first();
    await item.waitFor({ state: "visible", timeout: 10000 });

    const sourceBox = await item.boundingBox();
    const targetBox = await widgetFrame.locator("body").boundingBox();

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
    const imageInWidget = widgetFrame.locator(".__wab_img_instance");
    await imageInWidget.waitFor({ state: "visible", timeout: 5000 });

    const artboardFrame2 = await models.studio.createNewFrame();

    await page.keyboard.press("Shift+1");

    await models.studio.addNodeToSelectedFrame("Widget", 10, 10);
    await page.waitForTimeout(300);
    await models.studio.addNodeToSelectedFrame("Widget", 10, 100);
    await page.waitForTimeout(300);

    await models.studio.focusFrameRoot(widgetFrame);
    const widgetCanvas = widgetFrame;
    const widgetRootChildren = widgetCanvas.locator(".__wab_instance > *");
    await widgetRootChildren.last().waitFor({ state: "visible" });
    await widgetRootChildren.last().click({ force: true });
    await models.studio.convertToSlot();
    await page.waitForTimeout(300);

    await models.studio.focusFrameRoot(artboardFrame2);

    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    const frame2 = models.studio.getComponentFrameByIndex(1);
    await models.studio.focusFrameRoot(frame2);
    await page.waitForTimeout(500);

    const artboardCanvas = artboardFrame2.contentFrame();

    function getSecondImageSlotContent() {
      const artboardRoot = artboardCanvas.locator(".__wab_instance").first();
      return artboardRoot.locator("> .__wab_instance").last().locator("> *");
    }

    async function selectSecondImageSlotContent() {
      const slotContent = getSecondImageSlotContent();
      await slotContent.waitFor({ state: "visible", timeout: 15000 });
      await slotContent.scrollIntoViewIfNeeded();
      await slotContent.click({ force: true });
    }

    await selectSecondImageSlotContent();
    await models.studio.insertTextNodeWithContent("out here");

    await page.keyboard.press("Shift+Enter");
    const selectionTag = artboardFrame2
      .contentFrame()
      .locator(".__wab_img_instance");
    await selectionTag.click({ button: "right", force: true });
    const revertButton = models.studio.frame.getByText("Revert to");
    await revertButton.scrollIntoViewIfNeeded();
    await revertButton.click();

    await models.studio.focusFrameRoot(widgetFrame);
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    const imgUrl = "https://picsum.photos/50/50";
    const imageUrlInput = models.studio.rightPanel.frame.locator(
      '[data-test-id="image-url-input"]'
    );
    await imageUrlInput.clear();
    await imageUrlInput.fill(imgUrl);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await models.studio.focusFrameRoot(artboardFrame2);
    await page.waitForTimeout(1000);
    await selectSecondImageSlotContent();
    await page.keyboard.press("Shift+Enter");

    await models.studio.leftPanel.switchToTreeTab();
    await page.waitForTimeout(1000);
    await models.studio.withinLiveMode(async (liveFrame) => {
      const img = liveFrame.locator("img");
      await img.waitFor({ state: "visible", timeout: 10000 });
      await expect(img).toHaveAttribute("src", imgUrl);
    });

    const checkEndState = async () => {
      await page.waitForTimeout(1000);

      await selectSecondImageSlotContent();
      await page.keyboard.press("Shift+Enter");

      const tag = models.studio.frame
        .locator(".tpltree__label--focused")
        .first();
      await expect(tag).toContainText('Slot: "children"');

      const finalImage = artboardFrame2
        .contentFrame()
        .locator(".__wab_img_instance");
      await expect(finalImage).toHaveAttribute("src", imgUrl);

      const artboardRoot = artboardCanvas.locator(".__wab_instance").first();
      const firstWidgetChild = artboardRoot
        .locator("> .__wab_instance")
        .first()
        .locator("> *");
      await expect(firstWidgetChild).toHaveClass("__wab_placeholder");
    };

    await checkEndState();
    await undoAndRedo(page, { repetitions: 20 });
    await checkEndState();
  });
});
