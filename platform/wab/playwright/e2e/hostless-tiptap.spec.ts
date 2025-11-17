import { expect, Page } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

async function initialSetup(models: PageModels, page: Page) {
  await models.studio.leftPanel.insertNode("hostless-tiptap");

  const contentHtmlProp =
    await models.studio.rightPanel.getPropEditorRowByPropName("contentHtml");
  await contentHtmlProp.click({ button: "right" });

  await models.studio.useDynamicValueButton.click();

  await models.studio.rightPanel.insertMonacoCode(
    `'<p><strong><em>istanbul</em>hello</strong>world</p><p><strong><em><s><u>Cappadocia</u></s></em></strong> fun <span data-type="mention" data-id="sherlock221b">@sherlock221b</span> <code>a = b</code> easy <a target="_blank" rel="noopener noreferrer nofollow" class="ρi ρmjm82" href="http://google.com">google.com</a> island<a target="_blank" rel="noopener noreferrer nofollow" class="ρi ρmjm82">blah blah</a>happy</p>'`
  );
  await page.waitForTimeout(1000);

  await models.studio.leftPanel.insertNode("Text");
  await page.waitForTimeout(1000);

  const htmlAttributesSection = models.studio.rightPanel.frame.locator(
    'text="HTML attributes"'
  );
  await htmlAttributesSection.waitFor({ state: "visible", timeout: 5000 });
  await htmlAttributesSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await htmlAttributesSection.click();
  await page.waitForTimeout(500);

  const idField = models.studio.rightPanel.frame
    .locator(
      'div[role="textbox"].templated-string-input[data-slate-editor="true"]'
    )
    .nth(2);

  await idField.waitFor({ state: "visible", timeout: 5000 });
  await idField.scrollIntoViewIfNeeded();
  await idField.click();
  await page.waitForTimeout(500);
  await idField.type("tiptap-state-text");
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  await models.studio.rightPanel.textContentButton.waitFor({
    state: "visible",
    timeout: 5000,
  });

  const disablePane = models.studio.frame.locator(
    ".canvas-editor__disable-right-pane"
  );
  const count = await disablePane.count();
  if (count > 0) {
    await disablePane
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {});
  }

  await models.studio.rightPanel.textContentButton.hover();
  await page.waitForTimeout(500);
  await models.studio.rightPanel.textContentButton.click({
    button: "right",
    force: true,
  });
  await page.waitForTimeout(500);

  await models.studio.useDynamicValueButton.click();
  await page.waitForTimeout(500);

  await models.studio.rightPanel.insertMonacoCode(
    `JSON.stringify($state.tiptapRichTextEditor.content)`
  );
  await page.waitForTimeout(1000);
}

test.describe("hostless-tiptap", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "tiptap",
          npmPkg: ["@plasmicpkgs/tiptap"],
        },
      ],
    });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("has no extensions added by default", async ({ models, page }) => {
    await models.studio.createNewFrame().then(async (framed) => {
      await models.studio.focusFrameRoot(framed);

      await initialSetup(models, page);

      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.locator("body")).toBeVisible();

        const tiptapElement = liveFrame.locator("div.tiptap");
        if ((await tiptapElement.count()) > 0) {
          await expect(tiptapElement).toBeVisible();
        }

        const stateTextElement = liveFrame.locator("#tiptap-state-text");
        if ((await stateTextElement.count()) > 0) {
          await expect(stateTextElement).toBeVisible();
        }
      });
    });
  });

  test("works - bold, italic, underline, strike, code, link, mention", async ({
    models,
    page,
  }) => {
    await models.studio.createNewFrame().then(async (framed) => {
      await models.studio.focusFrameRoot(framed);

      await initialSetup(models, page);

      await models.studio.leftPanel.switchToTreeTab();

      await models.studio.leftPanel.selectTreeNode(["Tiptap Rich Text Editor"]);

      const boldButton = models.studio.rightPanel.sidebarSectionBody.locator(
        '[data-test-id="custom-action-bold"]'
      );
      await boldButton.waitFor({ state: "visible", timeout: 5000 });
      await boldButton.click();

      const italicButton = models.studio.rightPanel.sidebarSectionBody.locator(
        '[data-test-id="custom-action-italic"]'
      );
      await italicButton.waitFor({ state: "visible", timeout: 5000 });
      await italicButton.click();

      const underlineButton =
        models.studio.rightPanel.sidebarSectionBody.locator(
          '[data-test-id="custom-action-underline"]'
        );
      await underlineButton.waitFor({ state: "visible", timeout: 5000 });
      await underlineButton.click();

      const strikeButton = models.studio.rightPanel.sidebarSectionBody.locator(
        '[data-test-id="custom-action-strike"]'
      );
      await strikeButton.waitFor({ state: "visible", timeout: 5000 });
      await strikeButton.click();

      const codeButton = models.studio.rightPanel.sidebarSectionBody.locator(
        '[data-test-id="custom-action-code"]'
      );
      await codeButton.waitFor({ state: "visible", timeout: 5000 });
      await codeButton.click();

      const linkButton = models.studio.rightPanel.sidebarSectionBody.locator(
        '[data-test-id="custom-action-link"]'
      );
      await linkButton.waitFor({ state: "visible", timeout: 5000 });
      await linkButton.click();

      const mentionButton = models.studio.rightPanel.sidebarSectionBody.locator(
        '[data-test-id="custom-action-mention"]'
      );
      await mentionButton.waitFor({ state: "visible", timeout: 5000 });
      await mentionButton.click();

      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.locator("text=istanbul").first()).toBeVisible();
        await expect(liveFrame.locator("text=hello").first()).toBeVisible();
        await expect(liveFrame.locator("text=world").first()).toBeVisible();
        await expect(
          liveFrame.locator("text=Cappadocia").first()
        ).toBeVisible();
        await expect(liveFrame.locator("text=fun").first()).toBeVisible();
        await expect(
          liveFrame.locator("text=@sherlock221b").first()
        ).toBeVisible();
        await expect(liveFrame.locator("text=a = b").first()).toBeVisible();
        await expect(liveFrame.locator("text=easy").first()).toBeVisible();
        await expect(
          liveFrame.locator("text=google.com").first()
        ).toBeVisible();
        await expect(
          liveFrame.locator("text=islandblah blahhappy").first()
        ).toBeVisible();

        const stateTextElement = liveFrame.locator("#tiptap-state-text");
        if ((await stateTextElement.count()) > 0) {
          await expect(stateTextElement).toHaveText(
            `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"},{"type":"italic"}],"text":"istanbul"},{"type":"text","marks":[{"type":"bold"}],"text":"hello"},{"type":"text","text":"world"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"},{"type":"italic"},{"type":"underline"},{"type":"strike"}],"text":"Cappadocia"},{"type":"text","text":" fun "},{"type":"mention","attrs":{"id":"sherlock221b","label":null}},{"type":"text","text":" "},{"type":"text","marks":[{"type":"code"}],"text":"a = b"},{"type":"text","text":" easy "},{"type":"text","marks":[{"type":"link","attrs":{"href":"http://google.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"ρi ρmjm82"}}],"text":"google.com"},{"type":"text","text":" islandblah blahhappy"}]}]}`
          );
        }
      });
    });
  });
});
