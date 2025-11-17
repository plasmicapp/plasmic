import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/modifier-key";
import { setSelection } from "../utils/set-selection";
import { goToProject } from "../utils/studio-utils";

test.describe("dynamic-pages", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "dynamic-pages" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("works", async ({ page, models }) => {
    await models.studio.leftPanel.createNewPage("Index");
    const indexFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();

    await page.waitForTimeout(500);
    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.setPagePath("/");

    await models.studio.leftPanel.createNewPage("Greeter");
    await page.waitForTimeout(1000);
    const greeterFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .nth(1)
      .contentFrame();

    await page.waitForTimeout(500);
    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.setPagePath("/hello/[name]");
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.rightPanel.setPageParamPreviewValue("name", "World");

    await models.studio.leftPanel.insertText();
    await greeterFrame.locator(".__wab_editor").dblclick({ force: true });
    const contentEditable = greeterFrame.locator('[contenteditable="true"]');
    await contentEditable.fill("");
    await contentEditable.fill("Hello XXX!");
    await setSelection(greeterFrame.getByText("Hello XXX!"), "XXX");
    await page.waitForTimeout(1_000);
    await page.keyboard.press(`${modifierKey}+Shift+S`);

    await page.keyboard.press("Escape");

    await models.studio.leftPanel.selectTreeNode(["XXX"]);
    await models.studio.bindTextContentToDynamicValue([
      "Page URL path params",
      "name",
    ]);

    await models.studio.leftPanel.selectTreeNode(["vertical stack"]);
    await models.studio.leftPanel.insertNode("hostless-plasmic-head");
    await models.studio.bindPropToDynamicValue(
      '[data-test-id="prop-editor-row-title"] label',
      ["Page URL path params", "name"]
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(
        liveFrame.locator("#plasmic-app .__wab_text").first()
      ).toContainText("Hello World!");
    });

    await models.studio.focusFrameRoot(indexFrame);
    await models.studio.leftPanel.insertText();
    await indexFrame.locator(".__wab_editor").dblclick({ force: true });
    const indexContentEditable = indexFrame.locator('[contenteditable="true"]');
    await indexContentEditable.fill("");
    await indexContentEditable.fill("Say hello to NAME");
    await setSelection(indexFrame.getByText("Say hello to NAME"), "NAME");
    await page.waitForTimeout(1_000);
    await page.keyboard.press(`${modifierKey}+Shift+S`);
    await page.keyboard.press("Escape");

    await models.studio.focusFrameRoot(indexFrame);
    await models.studio.leftPanel.selectTreeNode(['"Say hello to [child]"']);
    await models.studio.rightPanel.repeatOnCustomCode('["foo", "bar", "baz"]');

    await models.studio.leftPanel.selectTreeNode([
      '"Say hello to [child]"',
      '"NAME"',
    ]);
    await models.studio.bindTextContentToDynamicValue(["currentItem"]);

    await models.studio.leftPanel.selectTreeNode(['"Say hello to [child]"']);
    await page.keyboard.press("Control+Alt+L");
    await models.studio.waitForSave();
    await models.studio.bindPropToCustomCode(
      '[data-test-id="prop-editor-row-href"] label',
      "`/hello/${currentItem}`"
    );
    await models.studio.waitForSave();

    const expected = [
      "Say hello to foo",
      "Say hello to bar",
      "Say hello to baz",
    ];

    await models.studio.withinLiveMode(async (liveFrame) => {
      const links = liveFrame.locator("#plasmic-app a.__wab_text");
      await expect(links).toHaveCount(expected.length);

      for (let i = 0; i < expected.length; i++) {
        await expect(links.nth(i)).toContainText(expected[i]);
      }

      await links.first().click();
      await page.waitForTimeout(1000);
      await expect(
        liveFrame.locator("#plasmic-app .__wab_text").first()
      ).toContainText("Hello foo!");
    });
  });
});
