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
      const default_span_class = `plasmic_default__all plasmic_default__span plasmic_default__span__${projectId.slice(
        0,
        5
      )}`;
      expect(innerHTML).toBe(
        `<span class="${default_span_class}" style="font-style: italic;">The </span><span class="${default_span_class}" style="font-style: italic; font-weight: 700;">Blue Moon</span> was there.\n\n...or <span class="${default_span_class}" style="text-decoration-line: underline;">so we thought!</span>`
      );
    });

    await models.studio.rightPanel.setTextNodeTag("a");

    await expect(textEditor).toContainText("so we thought!");
  });

  test("create list in text", async ({ page, models }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const baseVariantErrors = () =>
      pageErrors.filter((message) =>
        message.includes("Cannot add base vs to tpl that already has base vs")
      );

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

    await page.keyboard.insertText("-");
    await page.keyboard.press("Space");
    await page.keyboard.insertText("First item");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("Second item");
    await page.keyboard.press("Escape");

    await page.waitForTimeout(500);
    expect(baseVariantErrors()).toEqual([]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      const listItems = liveFrame.locator(".__wab_text ul li");
      await expect(listItems).toHaveCount(2);
      await expect(listItems.nth(0)).toContainText("First item");
      await expect(listItems.nth(1)).toContainText("Second item");
    });

    expect(baseVariantErrors()).toEqual([]);
  });

  test("renders a fresh inline tag inline while still editing", async ({
    page,
    models,
  }) => {
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
    await page.keyboard.press(`${modifierKey}+Shift+b`);

    // The fresh <strong> is not in the model yet, so it renders through the
    // fallback branch of renderElement in CanvasText. That branch used to
    // omit __wab_inline, so the __wab_defaults__all reset made the element
    // display: block (pushing it onto its own line, as if it had margins)
    // until the editing session ended.
    const strongEl = contentEditable.locator("strong");
    await expect(strongEl).toHaveText("Enter some text");
    await expect(strongEl).toHaveCSS("display", "inline");
  });

  test("exits text editing when clicking outside the canvas", async ({
    page,
    models,
  }) => {
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
    const contentEditable = textEditor.locator('[contenteditable="true"]');
    const textElement = artboardFrame.locator(".__wab_text");

    const editText = async (text: string) => {
      await textEditor.dblclick({ force: true });
      await contentEditable.press(`${modifierKey}+a`);
      await page.keyboard.insertText(text);
    };

    // Clicking empty space at the right end of the right pane's tab bar
    // should end the editing session and save the text.
    await editText("Hello world");
    const rightPaneTabBar = models.studio.frame.locator(
      ".canvas-editor__right-pane .hilite-tabs"
    );
    const tabBarBox = await rightPaneTabBar.boundingBox();
    await rightPaneTabBar.click({
      position: { x: tabBarBox!.width - 10, y: tabBarBox!.height / 2 },
    });
    await expect(contentEditable).toHaveCount(0);
    await expect(textElement).toContainText("Hello world");

    // Same for empty space at the bottom of the left pane (open the outline
    // tab first so the pane is expanded).
    await models.studio.leftPanel.treeTabButton.click();
    await editText("Goodbye world");
    const leftPane = models.studio.leftPanel.leftPane;
    const leftPaneBox = await leftPane.boundingBox();
    await leftPane.click({
      position: { x: leftPaneBox!.width / 2, y: leftPaneBox!.height - 10 },
    });
    await expect(contentEditable).toHaveCount(0);
    await expect(textElement).toContainText("Goodbye world");
  });

  // Playwright's "Desktop Chrome" device always reports a Windows user
  // agent, so slate's platform-aware redo hotkey expects the Windows combo
  // on every host. (Undo's generic "mod+z" instead resolves "mod" via
  // navigator.platform, which is NOT spoofed — hence modifierKey works
  // there.)
  const redoKey = "Control+Shift+z";

  test("undo/redo while editing text", async ({ page, models }) => {
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
    const contentEditable = textEditor.locator('[contenteditable="true"]');
    const textElement = artboardFrame.locator(".__wab_text");

    await textEditor.dblclick({ force: true });
    const initialText = (await contentEditable.textContent()) ?? "";

    await contentEditable.press(`${modifierKey}+a`);
    await contentEditable.pressSequentially("Hello");
    await expect(contentEditable).toHaveText("Hello");

    // Pausing typing for longer than UNDO_BATCH_PAUSE_MS starts a new undo
    // batch, so "Hello" and " world" should undo/redo separately.
    await page.waitForTimeout(1100);
    await contentEditable.pressSequentially(" world");
    await expect(contentEditable).toHaveText("Hello world");

    await page.keyboard.press(`${modifierKey}+z`);
    await expect(contentEditable).toHaveText("Hello");

    await page.keyboard.press(`${modifierKey}+z`);
    await expect(contentEditable).toHaveText(initialText);

    await page.keyboard.press(redoKey);
    await expect(contentEditable).toHaveText("Hello");

    await page.keyboard.press(redoKey);
    await expect(contentEditable).toHaveText("Hello world");

    // Redo with a non-empty undo stack and empty redo stack does nothing —
    // in particular it must not end the session or forward to the studio.
    // (If it had forwarded, the session would end without saving and the
    // Escape below would save nothing.)
    await page.keyboard.press(redoKey);
    await expect(contentEditable).toHaveText("Hello world");

    // Undone and redone edits should save on exit like any other edit.
    await page.keyboard.press(`${modifierKey}+z`);
    await page.keyboard.press("Escape");
    await expect(contentEditable).toHaveCount(0);
    await expect(textElement).toHaveText("Hello");

    // Undo the saved text change from the studio, so the studio has a redo
    // available. (Each editing session starts a fresh editor, so the
    // sessions below begin with empty undo/redo stacks.) Control+z because
    // the studio's shortcut platform is also derived from the spoofed
    // Windows user agent.
    await page.keyboard.press("Control+z");
    await expect(textElement).toHaveText(initialText);

    // Redo with empty undo and redo stacks ends the session and redoes the
    // last studio operation.
    await textEditor.dblclick({ force: true });
    await expect(contentEditable).toHaveCount(1);
    await page.keyboard.press(redoKey);
    await expect(contentEditable).toHaveCount(0);
    await expect(textElement).toHaveText("Hello");

    // Undo with an empty undo stack ends the session and undoes the last
    // studio operation.
    await textEditor.dblclick({ force: true });
    await expect(contentEditable).toHaveCount(1);
    await page.keyboard.press(`${modifierKey}+z`);
    await expect(contentEditable).toHaveCount(0);
    await expect(textElement).toHaveText(initialText);
  });
});
