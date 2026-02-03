import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/key-utils";
import { goToProject } from "../utils/studio-utils";

test.describe("rich-text", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "rich-text" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("successfully edit text with format", async ({ page, models }) => {
    await models.studio.leftPanel.addNewFrame();
    const artboardFrame = models.studio.frame
      .locator("iframe")
      .first()
      .contentFrame();
    const artboardBody = artboardFrame.locator("body");

    await artboardBody.click();
    await models.studio.focusCreatedFrameRoot();
    await models.studio.leftPanel.insertNode("Text");

    const textEditor = artboardFrame.locator(".__wab_editor");
    await textEditor.dblclick({ force: true });

    const contentEditable = textEditor.locator('[contenteditable="true"]');
    await contentEditable.press(`${modifierKey}+a`);
    await contentEditable.press("Backspace");

    await page.keyboard.press(`${modifierKey}+i`);
    await page.keyboard.insertText("The ");
    await page.keyboard.press(`${modifierKey}+b`);
    await page.keyboard.insertText("Blue Moon");
    await page.keyboard.press(`${modifierKey}+i`);
    await page.keyboard.press(`${modifierKey}+b`);
    await page.keyboard.insertText(" was there.");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("...or ");
    await page.keyboard.press(`${modifierKey}+u`);
    await page.keyboard.insertText("so we thought!");
    await page.keyboard.press(`${modifierKey}+u`);
    await page.keyboard.press("Escape");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const textElement = liveFrame.locator(".__wab_text");
      const innerHTML = await textElement.innerHTML();
      expect(innerHTML).toBe(
        '<span class="plasmic_default__all plasmic_default__span" style="font-style: italic;">The </span><span class="plasmic_default__all plasmic_default__span" style="font-style: italic; font-weight: 700;">Blue Moon</span> was there.\n\n...or <span class="plasmic_default__all plasmic_default__span" style="text-decoration-line: underline;">so we thought!</span>'
      );
    });

    await models.studio.rightPanel.setTextNodeTag("a");

    await expect(textEditor).toContainText("so we thought!");
  });
});
