import { expect, FrameLocator, Locator } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/key-utils";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

test.describe("routing", () => {
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

    // Edit the rendered text node by entering the canvas contenteditable —
    // the right-panel text-content path used to flake (PLA: branch edits
    // weren't applying), and double-click into the editor matches what the
    // Cypress original did.
    function toFrameLocator(frame: Locator | FrameLocator): FrameLocator {
      return "contentFrame" in frame ? frame.contentFrame() : frame;
    }
    async function setCanvasText(frame: Locator | FrameLocator, value: string) {
      const fl = toFrameLocator(frame);
      const editor = fl.locator(".__wab_editor").first();
      await editor.dblclick({ force: true });
      // After dblclick the element gets class `.__wab_editing`; the
      // contenteditable lives inside it. Wait for the editing state so
      // keystrokes land in the right place (matches Cypress
      // enterIntoTplTextBlock).
      const editing = fl.locator(".__wab_editing").first();
      await editing.waitFor({ state: "visible", timeout: 10_000 });
      const contentEditable = editing.locator('[contenteditable="true"]');
      await contentEditable.waitFor({ state: "visible", timeout: 10_000 });
      await page.waitForTimeout(500);
      await contentEditable.press(`${modifierKey}+a`);
      await contentEditable.press("Backspace");
      await page.keyboard.type(value, { delay: 50 });
      await page.keyboard.press("Escape");
      // Wait for the editing state to clear, then for save to settle, so
      // the branch's tplTree actually persists.
      await expect(editing).toHaveCount(0, { timeout: 5_000 });
      await page.waitForTimeout(300);
    }

    const mainFrame = await models.studio.createNewComponent("DisplayBranch");
    await models.studio.focusFrameRoot(mainFrame);

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.renameSelectionTag("text");

    await setCanvasText(mainFrame, "Main");
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

      await setCanvasText(frame, branchName);
      // Sanity-check that the edit landed on the canvas before relying on
      // the save round-trip — branch text edits used to silently no-op.
      await expect(frame.getByText(branchName).first()).toBeVisible({
        timeout: 10_000,
      });
      await models.studio.waitForSave();
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

    // URL-based branch switching: open the project URL with a branch qs and
    // assert the studio loads that branch's tplTree. Each reopen is a full
    // SPA navigation, so wait for the URL match before reading the canvas.
    async function openBranchByUrl(branchName: string) {
      const url = `/projects/${projectId}?branch=${branchName}`;
      await goToProject(page, url);
      if (branchName === "main") {
        await expect(page).not.toHaveURL(/branch=/, { timeout: 30_000 });
      } else {
        await expect(page).toHaveURL(new RegExp(`branch=${branchName}`), {
          timeout: 30_000,
        });
      }
      // Give the canvas an extra beat to rehydrate the branch's tplTree.
      await page.waitForTimeout(1000);
    }

    await openBranchByUrl("main");
    await getFrameWithText("Main");

    await openBranchByUrl("Feature");
    await getFrameWithText("Feature");

    await openBranchByUrl("main");
    await getFrameWithText("Main");

    // Non-existent branch should redirect back to main.
    await goToProject(page, `/projects/${projectId}?branch=NonExistentBranch`);
    await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });
    await page.waitForTimeout(1000);
    await getFrameWithText("Main");
  });
});
