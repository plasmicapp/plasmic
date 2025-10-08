import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { undoAndRedo } from "../utils/undo-and-redo";

test.describe("image-slots", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({
      name: "image-slots",
    });
    await page.goto(`/projects/${projectId}`);
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

    const artboardFrame2 = await models.studio.createNewFrame();

    await page.keyboard.press("Shift+1");

    await models.studio.addNodeToSelectedFrame("Widget", 10, 10);
    await models.studio.addNodeToSelectedFrame("Widget", 10, 100);

    await models.studio.focusFrameRoot(widgetFrame);
    const widgetCanvas = widgetFrame;
    const widgetRootChildren = widgetCanvas.locator(".__wab_instance > *");
    await widgetRootChildren.last().click({ force: true });
    await models.studio.convertToSlot();

    await models.studio.focusFrameRoot(artboardFrame2);

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Delete");

    await models.studio.focusFrameRoot(artboardFrame2);

    const artboardCanvas = artboardFrame2.contentFrame();

    function getSecondImageSlotContent() {
      const artboardRoot = artboardCanvas.locator(".__wab_instance").first();
      return artboardRoot.locator("> .__wab_instance").last().locator("> *");
    }

    await getSecondImageSlotContent().click({ force: true });
    await models.studio.insertTextNodeWithContent("out here");

    await page.keyboard.press("Shift+Enter");
    const selectionTag = artboardFrame2
      .contentFrame()
      .locator(".__wab_img_instance");
    await selectionTag.click({ button: "right", force: true });
    const revertButton = models.studio.frame.getByText("Revert to");
    await revertButton.waitFor({ state: "visible" });
    await revertButton.click({ force: true });

    await models.studio.focusFrameRoot(widgetFrame);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    const imgUrl = "https://picsum.photos/50/50";
    const imageUrlInput = models.studio.rightPanel.frame.locator(
      '[data-test-id="image-url-input"]'
    );
    await imageUrlInput.clear();
    await imageUrlInput.fill(imgUrl);
    await page.keyboard.press("Enter");

    await models.studio.focusFrame(artboardFrame2);
    await page.waitForTimeout(500);
    await getSecondImageSlotContent().click({ force: true });
    await page.keyboard.press("Shift+Enter");

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.withinLiveMode(async (liveFrame) => {
      const img = liveFrame.locator("img");
      await expect(img).toHaveAttribute("src", imgUrl);
    });

    const checkEndState = async () => {
      await page.waitForTimeout(1000);

      await getSecondImageSlotContent().click({ force: true });
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
3;
