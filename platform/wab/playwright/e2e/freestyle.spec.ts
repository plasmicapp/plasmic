import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { undoAndRedo } from "../utils/undo-and-redo";

test.describe("freestyle", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "freestyle" });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can draw tweet", async ({ page, models }) => {
    await models.studio.leftPanel.addNewFrame();

    const framed = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();

    await framed.locator("body").click();

    const initX = 5;
    const initY = 20;
    const lineHeight = 25;
    const spanInterval = 35;
    const imgSize = 30;
    const containerWidth = 176;
    const textLeft = initX + imgSize + 20;

    await page.keyboard.press("r");
    await models.studio.drawRectRelativeToElt(
      framed.locator("body"),
      initX + 10,
      initY + 10,
      imgSize,
      imgSize
    );

    await models.studio.plotText(
      framed,
      textLeft + spanInterval * 0,
      initY + 10,
      "Yang"
    );
    await models.studio.plotText(
      framed,
      textLeft + spanInterval * 1,
      initY + 10,
      "@yang"
    );
    await models.studio.plotText(
      framed,
      textLeft + spanInterval * 2 + 3,
      initY + 10,
      "23m ago"
    );
    await models.studio.plotText(
      framed,
      textLeft,
      initY + 10 + lineHeight * 1,
      "Hello world!"
    );
    await models.studio.plotText(
      framed,
      textLeft,
      initY + 10 + lineHeight * 2,
      "3 likes"
    );

    await page.keyboard.press("h");
    await models.studio.drawRectRelativeToElt(
      framed.locator("body"),
      textLeft - 3,
      initY + 8,
      containerWidth - textLeft + 1,
      25
    );

    await page.keyboard.press("v");
    await models.studio.drawRectRelativeToElt(
      framed.locator("body"),
      textLeft - 5,
      initY + 5,
      containerWidth - textLeft + 3,
      80
    );

    await page.keyboard.press("h");
    await models.studio.drawRectRelativeToElt(
      framed.locator("body"),
      initX + 5,
      initY + 3,
      containerWidth - 5,
      110
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("text=Yang").first()).toBeVisible();
      await expect(liveFrame.locator("text=@yang").first()).toBeVisible();
      await expect(liveFrame.locator("text=23m ago").first()).toBeVisible();
      await expect(
        liveFrame.locator("text=Hello world!").first()
      ).toBeVisible();
    });

    async function checkEndState() {
      await models.studio.leftPanel.expectDebugTplTree([
        "free box",
        "horizontal stack",
        "free box",
        "vertical stack",
        "horizontal stack",
        '"Yang"',
        '"@yang"',
        '"23m ago"',
        '"Hello world!"',
        '"3 likes"',
      ]);
    }
    await models.studio.leftPanel.switchToTreeTab();
    await checkEndState();
    await undoAndRedo(page);
    await checkEndState();
  });
});
