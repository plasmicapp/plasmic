import { test } from "../fixtures/test";

test.describe("publish", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "publish" });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("allows external users to see other projects in read mode.", async ({
    page,
    models,
  }) => {
    await models.studio.createNewFrame();
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
    await models.studio.focusFrameRoot(artboardFrame);

    await models.studio.insertTextNodeWithContent("hello");
    await models.studio.waitStudioLoaded();
    await models.studio.publishVersion("first version");
    await models.studio.leftPanel.switchToTreeTab();
    const selectedElt = await models.studio.getSelectedElt();
    await selectedElt.dblclick({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.insertText("goodbye");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await models.studio.publishVersion("second version");

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.previewVersion("first version");
    await models.studio.leftPanel.expectDebugTplTree(["free box", '"hello"']);

    await models.studio.backToCurrentVersion();
    await models.studio.leftPanel.expectDebugTplTree(["free box", '"goodbye"']);

    await models.studio.revertToVersion("first version");
    await models.studio.leftPanel.expectDebugTplTree(["free box", '"hello"']);

    await page.reload();
    await models.studio.leftPanel.switchToTreeTab();
    await page.waitForTimeout(200);
    await models.studio.waitForFrameToLoad();
    await models.studio.leftPanel.expectDebugTplTree(["free box", '"hello"']);
  });
});
