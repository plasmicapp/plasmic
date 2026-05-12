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

    // Poll across up to 3 arena artboards for text, until one matches or timeout expires.
    async function getFrameWithText(text: string, timeout = 30_000) {
      let found: FrameLocator | undefined;
      await expect
        .poll(
          async () => {
            for (const index of [0, 1, 2]) {
              const frame = models.studio.getComponentFrameByIndex(index);
              if (
                await frame
                  .getByText(text)
                  .first()
                  .isVisible()
                  .catch(() => false)
              ) {
                found = frame;
                return true;
              }
            }
            return false;
          },
          { timeout }
        )
        .toBe(true);
      return found!;
    }

    // Edit the rendered text node by editing the canvas (mirrors canvas text-edit flow).
    // dblclick → wait for `.__wab_editing` → type → Escape, mirroring the
    // canvas text-edit flow.
    async function setCanvasText(frame: Locator | FrameLocator, value: string) {
      const fl = "contentFrame" in frame ? frame.contentFrame() : frame;
      const editor = fl.locator(".__wab_editor").first();
      await editor.dblclick({ force: true });
      const editing = fl.locator(".__wab_editing").first();
      await editing.waitFor({ state: "visible", timeout: 10_000 });
      const contentEditable = editing.locator('[contenteditable="true"]');
      await contentEditable.waitFor({ state: "visible", timeout: 10_000 });
      // contenteditable becomes visible before Slate installs its selection listener.
      // Without this wait the first key event can be dropped.
      await page.waitForTimeout(500);
      await contentEditable.press(`${modifierKey}+a`);
      await contentEditable.press("Backspace");
      await page.keyboard.type(value, { delay: 50 });
      await page.keyboard.press("Escape");
      await expect(editing).toHaveCount(0, { timeout: 5_000 });
      await models.studio.waitForSave();
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

      const branchButton = models.studio.frame.locator("#branch-nav-button");
      await branchButton.click();

      const newBranchButton = models.studio.frame.getByRole("button", {
        name: "New",
        exact: true,
      });
      await newBranchButton.click();

      await page.keyboard.type(branchName);
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(new RegExp(`branch=${branchName}`), {
        timeout: 15_000,
      });
      await waitForFrameToLoad(page);

      const frame = await getFrameWithText("Main");
      await setCanvasText(frame, branchName);
      await expect(frame.getByText(branchName).first()).toBeVisible({
        timeout: 10_000,
      });
    }

    async function switchBranch(branchName: string) {
      await models.studio.waitForSave();

      const branchButton = models.studio.frame.locator("#branch-nav-button");
      await branchButton.click();

      const popover = models.studio.frame
        .locator(".ant-popover--dropdown-like:not(.ant-popover-hidden)")
        .first();
      const branchItem = popover.locator(`[value="${branchName}"]`).first();
      await branchItem.waitFor({ state: "visible", timeout: 10_000 });
      await branchItem.click();

      if (branchName === "main") {
        await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });
      } else {
        await expect(page).toHaveURL(new RegExp(`branch=${branchName}`), {
          timeout: 15_000,
        });
      }
      await waitForFrameToLoad(page);
      await models.studio.waitStudioLoaded();
      await models.studio.waitForSave();
    }

    await createNewBranch("Feature");

    await switchBranch("main");
    await getFrameWithText("Main");

    await switchBranch("Feature");
    await getFrameWithText("Feature");

    // Open the project URL with branch qs and assert the studio loads that branch's tplTree.
    async function openBranchByUrl(branchName: string, expectedText: string) {
      const url = `/projects/${projectId}?branch=${branchName}`;
      await goToProject(page, url);
      if (branchName === "main") {
        await expect(page).not.toHaveURL(/branch=/, { timeout: 30_000 });
      } else {
        await expect(page).toHaveURL(new RegExp(`branch=${branchName}`), {
          timeout: 30_000,
        });
      }
      await getFrameWithText(expectedText);
    }

    await openBranchByUrl("main", "Main");
    await openBranchByUrl("Feature", "Feature");
    await openBranchByUrl("main", "Main");

    // Non-existent branch should redirect back to main.
    await goToProject(page, `/projects/${projectId}?branch=NonExistentBranch`);
    await expect(page).not.toHaveURL(/branch=/, { timeout: 15_000 });
    await getFrameWithText("Main");
  });
});
