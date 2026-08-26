import { expect } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

const PAGE_NAME = "MentionsPage";
const ELEMENT_NAME = "MentionsHeader";
const SECOND_ELEMENT_NAME = "MentionsFooter";

/**
 * The `@`-mention flow in copilot chat. Never submits a prompt — see the
 * `noCopilotApi` fixture, which fails the test if any copilot request escapes.
 */
test.describe("copilot mentions", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "copilot-mentions" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  /** A page with one named element, so the canvas has something to mention. */
  async function addPageWithElement(models: PageModels) {
    await models.studio.createNewPage(PAGE_NAME);
    await models.studio.insertTextNodeWithContent("hello");
    await models.studio.renameSelectionTag(ELEMENT_NAME);
  }

  test("offers the canvas selections on a bare @", async ({ page, models }) => {
    await addPageWithElement(models);

    // Opened by shortcut rather than by URL, so the canvas selection survives.
    await page.keyboard.press("ControlOrMeta+k");
    const prompt = page.locator('[data-test-id="copilot-chat-prompt-editor"]');
    const popover = page.locator('[data-test-id="mentions-popover"]');
    await expect(prompt).toBeVisible();

    // One element selected: it leads, named, then the page it lives on.
    await prompt.click();
    await page.keyboard.type("@");
    await expect(popover.getByText("Current element")).toBeVisible();
    await expect(popover.getByText(ELEMENT_NAME)).toBeVisible();
    await expect(popover.getByText("Current page")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(prompt).toContainText(`@${ELEMENT_NAME}`);

    // Cleared, so the chips below can only come from the second pick.
    await prompt.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");

    // Two selected: counted rather than named, so neither name is on the row.
    await models.studio.insertTextNodeWithContent("world");
    await models.studio.renameSelectionTag(SECOND_ELEMENT_NAME);
    await models.studio.leftPanel.treeTabButton.click();
    const labels = models.studio.leftPanel.treeLabels;
    await labels.filter({ hasText: ELEMENT_NAME }).click();
    await labels
      .filter({ hasText: SECOND_ELEMENT_NAME })
      .click({ modifiers: ["Shift"] });

    await prompt.click();
    await page.keyboard.type("@");
    await expect(popover.getByText("Current elements (2)")).toBeVisible();

    // Picking that one row still inserts a chip per element.
    await page.keyboard.press("Enter");
    await expect(prompt).toContainText(`@${ELEMENT_NAME}`);
    await expect(prompt).toContainText(`@${SECOND_ELEMENT_NAME}`);

    await prompt.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");

    // An element the user never named is summarized by what it is, so the row
    // still says something rather than going blank.
    await models.studio.insertTextNodeWithContent("unnamed");
    await prompt.click();
    await page.keyboard.type("@");
    await expect(popover.getByText("(unnamed text)")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(prompt).toContainText("@(unnamed text)");
  });

  test("searches the project once the user types", async ({ page, models }) => {
    await addPageWithElement(models);

    await page.keyboard.press("ControlOrMeta+k");
    const prompt = page.locator('[data-test-id="copilot-chat-prompt-editor"]');
    const popover = page.locator('[data-test-id="mentions-popover"]');
    await prompt.click();
    await page.keyboard.type(`@${PAGE_NAME}`);

    // Typing replaces the canvas-selection rows with a search. Scoped to the
    // popover: the same text is in the editor, where it was just typed.
    await expect(popover.getByText("Current element")).toHaveCount(0);
    await expect(popover.getByText(PAGE_NAME)).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(prompt).toContainText(`@${PAGE_NAME}`);

    // Nothing matched: no popover at all, rather than an empty one hanging
    // over the input.
    await page.keyboard.type(" @zzzznomatch");
    await expect(popover).toHaveCount(0);
  });

  test("shows the hint on a bare @ when there is nothing to mention", async ({
    page,
    models,
  }) => {
    await models.studio.switchArena("Custom arena 1");

    await page.keyboard.press("ControlOrMeta+k");
    const prompt = page.locator('[data-test-id="copilot-chat-prompt-editor"]');
    const popover = page.locator('[data-test-id="mentions-popover"]');
    await prompt.click();
    await page.keyboard.type("@");

    await expect(
      popover.getByText("Start typing to search project resources")
    ).toBeVisible();
    await expect(popover.getByText("Current element")).toHaveCount(0);
    await expect(popover.getByText("Current page")).toHaveCount(0);
  });
});
