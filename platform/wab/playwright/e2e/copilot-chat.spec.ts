import { Page, expect } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

const PAGE_NAME = "MentionsPage";
const ELEMENT_NAME = "MentionsHeader";
const SECOND_ELEMENT_NAME = "MentionsFooter";
const RENAMED_ELEMENT_NAME = "MentionsRenamed";

/** A page with one named element, so the canvas has something to mention. */
async function addPageWithElement(models: PageModels) {
  await models.studio.createNewPage(PAGE_NAME);
  await models.studio.insertTextNodeWithContent("hello");
  await models.studio.renameSelectionTag(ELEMENT_NAME);
}

let projectId: string;

test.beforeEach(async ({ apiClient, page }) => {
  projectId = await apiClient.setupNewProject({
    name: "copilot-chat",
    workspaceId: await apiClient.setupPaidWorkspace(),
  });
  await goToProject(page, `/projects/${projectId}`);
});

test.afterEach(async ({ apiClient }) => {
  await apiClient.removeProjectAfterTest(
    projectId,
    "user2@example.com",
    "!53kr3tz!",
  );
});

/**
 * The `@`-mention flow in copilot chat. Never submits a prompt — see the
 * `noCopilotApi` fixture, which fails the test if any copilot request escapes.
 */
test.describe("copilot mentions", () => {
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
      popover.getByText("Start typing to search project resources"),
    ).toBeVisible();
    await expect(popover.getByText("Current element")).toHaveCount(0);
    await expect(popover.getByText("Current page")).toHaveCount(0);
  });
});

test.describe("copilot stop button", () => {
  test("stops a queued send or an in-flight response", async ({ page }) => {
    let requestCount = 0;
    let releaseRequest = () => {};
    const requestHeld = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    // Holds any request open, like a slow model, until the test ends.
    await page.route("**/api/v1/copilot/chat", async (route) => {
      requestCount++;
      await requestHeld;
      await route.abort("failed").catch(() => undefined);
    });

    await page.keyboard.press("ControlOrMeta+k");
    const prompt = page.locator('[data-test-id="copilot-chat-prompt-editor"]');
    await expect(prompt).toBeVisible();
    await prompt.click();
    await page.keyboard.type("add a hero");

    const chat = page.getByLabel("Plasmic AI chat");
    const sendBtn = chat.getByRole("button", { name: "Send" });
    const stopBtn = chat.getByRole("button", { name: "Stop" });
    await expect(stopBtn).toBeHidden();
    await expect(sendBtn).toBeVisible();

    // Send, then stop inside the send delay. The prompt reads as sent right
    // away, but nothing has left the browser, so the draft comes back.
    await sendBtn.click();
    await expect(stopBtn).toBeVisible();
    await expect(prompt).not.toContainText("add a hero");
    await page.keyboard.press("Escape");
    await expect(sendBtn).toBeVisible();
    await expect(stopBtn).toBeHidden();
    await expect(prompt).toContainText("add a hero");
    expect(requestCount).toBe(0);

    // Send again and let the request leave, then stop it in flight.
    const request = page.waitForRequest("**/api/v1/copilot/chat");
    await sendBtn.click();
    await request;
    await expect(stopBtn).toBeVisible();
    await expect(sendBtn).toBeHidden();

    await stopBtn.click();
    await expect(sendBtn).toBeVisible();
    await expect(stopBtn).toBeHidden();
    await expect(page.getByRole("alert")).toBeHidden();
    expect(requestCount).toBe(1);

    releaseRequest();
  });
});

async function stubCopilotAnswer(page: Page, markdown: string) {
  const sse = (chunks: object[]) =>
    chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") +
    "data: [DONE]\n\n";
  await page.route("**/api/v1/copilot/chat", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: sse([
        { type: "start" },
        { type: "start-step" },
        { type: "text-start", id: "0" },
        {
          type: "text-delta",
          id: "0",
          delta: `[Dummy response]\n\n${markdown}`,
        },
        { type: "text-end", id: "0" },
        { type: "finish-step" },
        { type: "finish" },
      ]),
    }),
  );
}

async function submitPrompt(page: Page, promptText: string) {
  await page.keyboard.press("ControlOrMeta+k");
  const prompt = page.locator('[data-test-id="copilot-chat-prompt-editor"]');
  await expect(prompt).toBeVisible();
  await prompt.click();
  await page.keyboard.type(promptText);
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(prompt).not.toContainText(promptText);
}

test.describe("copilot response mentions", () => {
  async function readUuids(models: PageModels) {
    return models.studio.frame.locator("body").evaluate((_, elementName) => {
      const site = (window as any).dbg.studioCtx.site;
      const comp = site.components.find((c: any) => c.name === "MentionsPage");
      const tpls: any[] = [];
      const walk = (t: any) => {
        tpls.push(t);
        (t.children ?? []).forEach(walk);
      };
      walk(comp.tplTree);
      return {
        pageUuid: comp.uuid as string,
        elementUuid: tpls.find((t) => t.name === elementName).uuid as string,
      };
    }, ELEMENT_NAME);
  }

  test("renders mentions in the AI answer as chips, named from the site", async ({
    page,
    models,
  }) => {
    await addPageWithElement(models);
    const { pageUuid, elementUuid } = await readUuids(models);
    await stubCopilotAnswer(
      page,
      `Restyled @<Tpl:${pageUuid}/${elementUuid}> on @<Component:${pageUuid}>.`,
    );
    await submitPrompt(page, "restyle the header");

    await expect(page.locator(".mention-link")).toHaveText([
      `@${ELEMENT_NAME}`,
      `@${PAGE_NAME}`,
    ]);
    await expect(page.getByText("@<Tpl:")).toHaveCount(0);

    await models.studio.leftPanel.treeTabButton.click();
    await models.studio.leftPanel.treeLabels
      .filter({ hasText: ELEMENT_NAME })
      .click();
    await models.studio.renameSelectionTag(RENAMED_ELEMENT_NAME);

    await expect(page.locator(".mention-link")).toHaveText([
      `@${RENAMED_ELEMENT_NAME}`,
      `@${PAGE_NAME}`,
    ]);

    await models.studio.deleteSelection();
    await expect(page.locator(".mention-link")).toHaveText([
      "@(deleted)",
      `@${PAGE_NAME}`,
    ]);
  });

  test("clicking a chip focuses the mentioned element", async ({
    page,
    models,
  }) => {
    await addPageWithElement(models);
    await models.studio.insertTextNodeWithContent("world");
    await models.studio.renameSelectionTag(SECOND_ELEMENT_NAME);

    const { pageUuid, elementUuid } = await readUuids(models);
    await stubCopilotAnswer(
      page,
      `Styled @<Tpl:${pageUuid}/${elementUuid}> for you.`,
    );
    await submitPrompt(page, "style the header");

    await page.locator(".mention-link").click();
    await expect
      .poll(() =>
        models.studio.frame.locator("body").evaluate(() => {
          const ctx = (window as any).dbg.studioCtx;
          return ctx.focusedViewCtx()?.focusedTpl()?.uuid ?? null;
        }),
      )
      .toBe(elementUuid);
  });
});
