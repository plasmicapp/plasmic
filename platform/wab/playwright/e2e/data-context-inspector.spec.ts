import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/key-utils";
import { goToProject } from "../utils/studio-utils";

test.describe("data-context-inspector", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({
      name: "data-context-inspector",
    });
    // We need these permissions to test the "Copy JS path" action
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await goToProject(page, `/projects/${projectId}?envPanel=true`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test.describe("in data picker", () => {
    test("can insert and copy paths via context menu", async ({
      page,
      models,
    }) => {
      const dataPicker = models.studio.rightPanel.frame.locator(
        '[data-test-id="data-picker"]'
      );
      const studioFrame = models.studio.frame;

      const dataContextInspectorNode = (path: string) =>
        dataPicker.locator(`[data-insert-path="${path}"]`);

      const contextMenu = studioFrame.locator(".ant-dropdown-menu");

      // Create a component with a prop and state so the data context has entries
      await models.studio.leftPanel.addComponent("TestComp");

      await models.studio.rightPanel.switchToComponentDataTab();
      await models.studio.rightPanel.addComponentProp("myProp", "text");
      await models.studio.rightPanel.addState({
        name: "myState",
        variableType: "text",
        accessType: "private",
      });

      await models.studio.leftPanel.insertNode("Text");
      await models.studio.rightPanel.switchToSettingsTab();

      const textContentLabel = studioFrame.locator(
        '[data-test-id="text-content"] label'
      );
      await textContentLabel.click({ button: "right" });
      await models.studio.rightPanel.useDynamicValueButton.click();
      await dataPicker.waitFor({ state: "visible" });
      await models.studio.rightPanel.ensureDataPickerInCustomCodeMode();

      const monacoContainer = dataPicker.locator(
        ".react-monaco-editor-container"
      );
      await monacoContainer.waitFor({ state: "visible" });

      await monacoContainer.click();
      await page.keyboard.press(`${modifierKey}+a`);
      // Monaco auto-closes back-ticks so we only type the closing back-tick
      await page.keyboard.type("`Welcome,${}!");
      for (let i = 0; i < 2; i++) {
        // Re-position the cursor, so we can test that the text is inserted at the cursor position
        await page.keyboard.press("ArrowLeft");
      }

      await dataPicker.locator('button[class*="envToggleButton"]').click();

      await test.step("insert at cursor position", async () => {
        await dataContextInspectorNode("$state").click();
        await dataContextInspectorNode("$state.myState").click({
          button: "right",
        });
        await contextMenu.waitFor({ state: "visible" });
        await contextMenu
          .locator(".ant-dropdown-menu-item")
          .filter({ hasText: "Insert" })
          .click();

        await expect(monacoContainer.locator(".view-lines")).toHaveText(
          "`Welcome,${$state.myState}!`"
        );
      });

      await test.step("Insertion replaces current selection", async () => {
        // Select "$state.myState" backwards (14 chars)
        for (let i = 0; i < 14; i++) {
          await page.keyboard.press("Shift+ArrowLeft");
        }

        await dataContextInspectorNode("$props").click();
        await dataContextInspectorNode("$props.myProp").click({
          button: "right",
        });
        await contextMenu.waitFor({ state: "visible" });
        await contextMenu
          .locator(".ant-dropdown-menu-item")
          .filter({ hasText: "Insert" })
          .click();

        // Verify the selection was replaced
        await expect(monacoContainer.locator(".view-lines")).toHaveText(
          "`Welcome,${$props.myProp}!`"
        );
      });

      await test.step("Copy JS path works", async () => {
        await dataContextInspectorNode("$state.myState").click({
          button: "right",
        });
        await contextMenu.waitFor({ state: "visible" });
        await contextMenu
          .locator(".ant-dropdown-menu-item")
          .filter({ hasText: "Copy" })
          .click();

        // Verify the state path was copied to clipboard
        const clipboardContent = await page.evaluate(() =>
          navigator.clipboard.readText()
        );
        expect(clipboardContent).toBe("$state.myState");
      });

      // go back to data picker mode (no real reason, just that the Studio crashed before I fixed it)
      await models.studio.rightPanel.ensureDataPickerInDataPickerMode();
      await models.studio.rightPanel.checkNoErrors();
    });
  });
});
