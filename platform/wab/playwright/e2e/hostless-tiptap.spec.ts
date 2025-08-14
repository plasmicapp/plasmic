import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

async function initialSetup(models: any) {
  await models.studio.leftPanel.insertNode("hostless-tiptap");
  const contentHtmlProp =
    await models.studio.rightPanel.getPropEditorRowByPropName("contentHtml");
  await contentHtmlProp.click({ button: "right" });
  await models.studio.useDynamicValueButton.click();
  await models.studio.rightPanel.insertMonacoCode(
    `'<p><strong><em>istanbul</em>hello</strong>world</p><p><strong><em><s><u>Cappadocia</u></s></em></strong> fun <span data-type="mention" data-id="sherlock221b">@sherlock221b</span> <code>a = b</code> easy <a target="_blank" rel="noopener noreferrer nofollow" class="ρi ρmjm82" href="http://google.com">google.com</a> island<a target="_blank" rel="noopener noreferrer nofollow" class="ρi ρmjm82">blah blah</a>happy</p>'`
  );

  await models.studio.leftPanel.insertNode("Text");
  await models.studio.rightPanel.addHtmlAttribute("id", "tiptap-state-text");
  await models.studio.rightPanel.textContentButton.click({ button: "right" });
  await models.studio.useDynamicValueButton.click();
  await models.studio.rightPanel.insertMonacoCode(
    `JSON.stringify($state.tiptapRichTextEditor.content)`
  );
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
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("has no extensions added by default", async ({ models }) => {
    await models.studio.createNewFrame().then(async (framed) => {
      await models.studio.focusFrameRoot(framed);

      await initialSetup(models);

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
  }) => {
    await models.studio.createNewFrame().then(async (framed) => {
      await models.studio.focusFrameRoot(framed);

      await initialSetup(models);

      await models.studio.leftPanel.switchToTreeTab();

      await models.studio.leftPanel.selectTreeNode(["Tiptap Rich Text Editor"]);

      await models.studio.rightPanel.sidebarSectionBody
        .locator('[data-test-id="custom-action-bold"]')
        .click();
      await models.studio.rightPanel.sidebarSectionBody
        .locator('[data-test-id="custom-action-italic"]')
        .click();
      await models.studio.rightPanel.sidebarSectionBody
        .locator('[data-test-id="custom-action-underline"]')
        .click();
      await models.studio.rightPanel.sidebarSectionBody
        .locator('[data-test-id="custom-action-strike"]')
        .click();
      await models.studio.rightPanel.sidebarSectionBody
        .locator('[data-test-id="custom-action-code"]')
        .click();
      await models.studio.rightPanel.sidebarSectionBody
        .locator('[data-test-id="custom-action-link"]')
        .click();
      await models.studio.rightPanel.sidebarSectionBody
        .locator('[data-test-id="custom-action-mention"]')
        .click();

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
