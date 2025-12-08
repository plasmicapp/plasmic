import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/key-utils";
import { goToProject } from "../utils/studio-utils";

test.describe("hostless-basic-components", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "plasmic-basic-components",
        npmPkg: ["@plasmicpkgs/plasmic-basic-components"],
      },
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

  test("can extract, instantiate, drill, add variants, undo select", async ({
    models,
    page,
  }) => {
    const framed = await models.studio.createNewFrame();
    await models.studio.focusFrameRoot(framed);

    await models.studio.leftPanel.insertNode("hostless-embed");

    const codeEditorInput = models.studio.rightPanel.frame.locator(
      'div.code-editor-input[data-plasmic-prop="code"]'
    );
    await codeEditorInput.waitFor({ state: "visible" });
    await codeEditorInput.click();

    const monacoContainer = models.studio.frame.locator(
      ".react-monaco-editor-container"
    );
    await monacoContainer.waitFor({ state: "visible" });
    await monacoContainer.click();

    await page.keyboard.press(`${modifierKey}+a`);
    await page.keyboard.press("Delete");

    await page.keyboard.type(
      `<div style="background-color: rgb(255, 0, 0)">Test embed</div>`
    );

    const saveButton = models.studio.frame
      .locator('button[data-test-id="save-code"]')
      .first();
    await saveButton.waitFor({ state: "visible" });
    await saveButton.click({ force: true });

    await page.keyboard.press("Escape");
    await monacoContainer.waitFor({ state: "hidden" });

    const canvasIframe = models.studio.frame
      .locator("iframe.canvas-editor__viewport")
      .first();
    await canvasIframe.waitFor({ state: "visible" });
    const embedFrame = canvasIframe.contentFrame();

    await embedFrame
      .locator("body")
      .waitFor({ state: "visible", timeout: 10000 });

    await expect(embedFrame.locator("body")).toContainText("Test embed");
    await expect(embedFrame.locator("body")).toBeVisible();

    const redDiv = embedFrame
      .locator('div[style*="background-color: rgb(255, 0, 0)"]')
      .first();
    await expect(redDiv).toBeVisible();
    await expect(redDiv).toContainText("Test embed");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toContainText("Test embed");
      await expect(liveFrame.locator("body")).toBeVisible();
      const liveDivWithBg = liveFrame
        .locator('div[style*="background-color: rgb(255, 0, 0)"]')
        .first();
      await expect(liveDivWithBg).toBeVisible();
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
