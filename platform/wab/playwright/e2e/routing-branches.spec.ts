import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe.skip("routing - branch UI not appearing", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProject(projectId);
    }
  });

  test("should switch branches", async ({ models, page, apiClient }) => {
    projectId = await apiClient.setupNewProject({
      name: "routing-branches",
      devFlags: { branching: true },
    });

    await page.goto(`/projects/${projectId}?devFlags=branching`);
    await models.studio.waitForFrameToLoad();

    await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });

    const mainFrame = await models.studio.createNewComponent("DisplayBranch");
    await models.studio.focusFrameRoot(mainFrame);

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.renameSelectionTag("text");

    const canvasBounds = await mainFrame.boundingBox();
    if (canvasBounds) {
      await page.mouse.dblclick(
        canvasBounds.x + canvasBounds.width / 2,
        canvasBounds.y + canvasBounds.height / 2
      );
      await page.waitForTimeout(500);
    }

    await page.keyboard.type("Main");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await models.studio.publishVersion("need to publish before branching");

    async function createNewBranch(branchName: string) {
      await models.studio.leftPanel.switchToTreeTab();
      await page.waitForTimeout(1000);

      const branchButton = models.studio.frame.locator("#branch-nav-button");
      await branchButton.waitFor({ state: "visible", timeout: 10000 });
      await branchButton.click();
      await page.waitForTimeout(500);

      const newBranchButton = models.studio.frame
        .locator("button")
        .filter({ hasText: "New" });
      await newBranchButton.click();

      await page.keyboard.type(branchName);
      await page.keyboard.press("Enter");

      await page.waitForTimeout(2000);
      await models.studio.waitForFrameToLoad();

      await expect(page).toHaveURL(new RegExp(`branch=${branchName}`), {
        timeout: 15_000,
      });

      await models.studio.leftPanel.selectTreeNode(["text"]);

      const frame = models.studio.frames.first();
      const textElement = frame
        .locator('div[data-plasmic-role="text"]')
        .first();
      await expect(textElement).toContainText("Main");

      const frameBounds = await frame.boundingBox();
      if (frameBounds) {
        await page.mouse.dblclick(
          frameBounds.x + frameBounds.width / 2,
          frameBounds.y + frameBounds.height / 2
        );
        await page.waitForTimeout(500);
      }

      await page.keyboard.press("Control+a");
      await page.keyboard.type(branchName);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    async function switchBranch(branchName: string) {
      await models.studio.waitForSave();

      const branchButton = models.studio.frame.locator("#branch-nav-button");
      await branchButton.click();
      await page.waitForTimeout(500);

      const branchItem = models.studio.frame
        .locator("text=" + branchName)
        .first();
      await branchItem.click({ force: true });

      await page.waitForTimeout(2000);
      await models.studio.waitForFrameToLoad();

      if (branchName === "main") {
        await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });
      } else {
        await expect(page).toHaveURL(new RegExp(`branch=${branchName}`), {
          timeout: 15_000,
        });
      }
    }

    await createNewBranch("Feature");

    await switchBranch("main");
    await models.studio.leftPanel.selectTreeNode(["text"]);
    const textInMainBranch = models.studio.frames
      .first()
      .locator('div[data-plasmic-role="text"]')
      .first();
    await expect(textInMainBranch).toContainText("Main");

    await switchBranch("Feature");
    await models.studio.leftPanel.selectTreeNode(["text"]);
    const textInFeatureBranch = models.studio.frames
      .first()
      .locator('div[data-plasmic-role="text"]')
      .first();
    await expect(textInFeatureBranch).toContainText("Feature");

    await page.goto(`/projects/${projectId}?branch=main`);
    await models.studio.waitForFrameToLoad();
    await models.studio.leftPanel.selectTreeNode(["text"]);
    let textAfterUrlSwitch = models.studio.frames
      .first()
      .locator('div[data-plasmic-role="text"]')
      .first();
    await expect(textAfterUrlSwitch).toContainText("Main");

    await page.goto(`/projects/${projectId}?branch=Feature`);
    await models.studio.waitForFrameToLoad();
    await models.studio.leftPanel.selectTreeNode(["text"]);
    textAfterUrlSwitch = models.studio.frames
      .first()
      .locator('div[data-plasmic-role="text"]')
      .first();
    await expect(textAfterUrlSwitch).toContainText("Feature");

    await page.goto(`/projects/${projectId}?branch=main`);
    await models.studio.waitForFrameToLoad();
    await models.studio.leftPanel.selectTreeNode(["text"]);
    textAfterUrlSwitch = models.studio.frames
      .first()
      .locator('div[data-plasmic-role="text"]')
      .first();
    await expect(textAfterUrlSwitch).toContainText("Main");

    await page.goto(`/projects/${projectId}?branch=NonExistentBranch`);
    await models.studio.waitForFrameToLoad();
    await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });
    await models.studio.leftPanel.selectTreeNode(["text"]);
    const textInNonExistent = models.studio.frames
      .first()
      .locator('div[data-plasmic-role="text"]')
      .first();
    await expect(textInNonExistent).toContainText("Main");
  });
});
