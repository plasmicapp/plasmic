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
    const artboardFrame = models.studio.componentFrame;
    const artboardBody = artboardFrame.locator("body");
    await artboardBody.click();
    await models.studio.focusFrameRoot(artboardFrame);

    await models.studio.insertTextNodeWithContent("hello");
    await models.studio.waitStudioLoaded();
    await models.studio.publishVersion("first version");

    await models.studio.leftPanel.switchToTreeTab();
    await page.waitForTimeout(500);

    const selectedElt = await models.studio.getSelectedElt();
    await selectedElt.dblclick({ force: true });

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await page.waitForTimeout(500);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.type("goodbye");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await artboardFrame
      .locator('text="goodbye"')
      .waitFor({ state: "visible", timeout: 5000 });

    await artboardFrame.locator("body").click();
    await models.studio.waitForSave();

    await artboardFrame
      .locator('text="goodbye"')
      .waitFor({ state: "visible", timeout: 2000 });

    await models.studio.publishVersion("second version");
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.previewVersion("first version");
    await artboardFrame
      .locator('text="hello"')
      .waitFor({ state: "visible", timeout: 5000 });
    await artboardFrame
      .locator('text="goodbye"')
      .waitFor({ state: "hidden", timeout: 1000 });

    await models.studio.backToCurrentVersion();
    await artboardFrame
      .locator('text="goodbye"')
      .waitFor({ state: "visible", timeout: 5000 });
    await artboardFrame
      .locator('text="hello"')
      .waitFor({ state: "hidden", timeout: 1000 });

    await models.studio.revertToVersion("first version");
    await artboardFrame
      .locator('text="hello"')
      .waitFor({ state: "visible", timeout: 5000 });
    await artboardFrame
      .locator('text="goodbye"')
      .waitFor({ state: "hidden", timeout: 1000 });

    await page.reload();
    await models.studio.leftPanel.switchToTreeTab();
    await page.waitForTimeout(200);
    await models.studio.waitForFrameToLoad();
    const reloadedFrame = models.studio.componentFrame;
    await reloadedFrame
      .locator('text="hello"')
      .waitFor({ state: "visible", timeout: 5000 });
    await reloadedFrame
      .locator('text="goodbye"')
      .waitFor({ state: "hidden", timeout: 1000 });
  });
});
