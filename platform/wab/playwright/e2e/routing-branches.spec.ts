import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

test.describe.skip("routing - branch text edit not applying reliably", () => {
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

    await goToProject(page, `/projects/${projectId}`);

    await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });

    async function getFrameWithText(text: string) {
      for (const index of [0, 1, 2]) {
        const frame = models.studio.getComponentFrameByIndex(index);
        const textLocator = frame.getByText(text).first();
        if (await textLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
          return frame;
        }
      }
      const fallback = models.studio.componentFrame;
      await expect(fallback.getByText(text).first()).toBeVisible();
      return fallback;
    }

    const mainFrame = await models.studio.createNewComponent("DisplayBranch");
    await models.studio.focusFrameRoot(mainFrame);

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.renameSelectionTag("text");

    await models.studio.rightPanel.textContentButton.click();
    await page.keyboard.insertText("Main");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await models.studio.leftPanel.switchToTreeTab();

    await models.studio.publishVersion("need to publish before branching");

    async function createNewBranch(branchName: string) {
      await models.studio.leftPanel.switchToTreeTab();
      await page.waitForTimeout(1000);

      const branchButton = models.studio.frame.locator("#branch-nav-button");
      await branchButton.waitFor({ state: "visible", timeout: 10000 });
      await branchButton.click();
      await page.waitForTimeout(500);

      const newBranchButton = models.studio.frame.getByRole("button", {
        name: "New",
        exact: true,
      });
      await newBranchButton.click();

      await page.keyboard.type(branchName);
      await page.keyboard.press("Enter");

      await page.waitForTimeout(2000);
      await waitForFrameToLoad(page);

      await expect(page).toHaveURL(new RegExp(`branch=${branchName}`), {
        timeout: 15_000,
      });

      const frame = await getFrameWithText("Main");
      const textElement = frame.getByText("Main").first();
      await expect(textElement).toBeVisible();

      await textElement.click({ force: true });
      await page.waitForTimeout(500);
      await models.studio.rightPanel.textContentButton.click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.insertText(branchName);
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
      await waitForFrameToLoad(page);

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
    await getFrameWithText("Main");

    await switchBranch("Feature");
    await getFrameWithText("Feature");

    await goToProject(page, `/projects/${projectId}?branch=main`);
    await getFrameWithText("Main");

    await goToProject(page, `/projects/${projectId}?branch=Feature`);
    await getFrameWithText("Feature");

    await goToProject(page, `/projects/${projectId}?branch=main`);
    await getFrameWithText("Main");

    await goToProject(page, `/projects/${projectId}?branch=NonExistentBranch`);
    await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });
    await getFrameWithText("Main");
  });
});
