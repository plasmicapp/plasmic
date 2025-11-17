import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("state-management-counter", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectFromTemplate("state-management");
    await goToProject(page, `/projects/${projectId}?plexus=false`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create private/readonly/writable counter", async ({
    models,
    page,
  }) => {
    await models.studio.leftPanel.addComponent("counter");
    const counterFrame = models.studio.getComponentFrameByIndex(0);
    await models.studio.focusFrameRoot(counterFrame);

    await models.studio.rightPanel.addState({
      name: "count",
      variableType: "number",
      accessType: "private",
      initialValue: "5",
    });
    await page.waitForTimeout(200);

    await models.studio.leftPanel.insertNode("Text");
    const textContentLabel = models.studio.frame.locator(
      `[data-test-id="text-content"] label`
    );
    await textContentLabel.click({ button: "right" });
    await models.studio.rightPanel.useDynamicValueButton.click();
    await models.studio.rightPanel.selectPathInDataPicker(["count"]);
    await expect(counterFrame.locator(".__wab_rich_text")).toContainText("5");

    await models.studio.leftPanel.insertNode("Button");
    await models.studio.rightPanel.frame
      .locator(".panel-row")
      .getByText("Button")
      .click({ button: "right" });
    await models.studio.rightPanel.useDynamicValueButton.click();

    await models.studio.rightPanel.frame.getByText("Switch to Code").click();

    const codeInput = models.studio.rightPanel.valueCodeInput;
    await codeInput.waitFor({ state: "visible" });
    await codeInput.click();

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await codeInput.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.insertText(`"Increment"`);
    await page.waitForTimeout(100);

    await models.studio.rightPanel.saveDataPicker();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="add-interaction"]')
      .click();

    await page.waitForTimeout(500);
    await page.keyboard.type(`onClick`);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="action-name"]')
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-key="updateVariable"]')
      .click();
    await models.studio.rightPanel.frame
      .locator(".code-editor-input", { hasText: "$state.count" })
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="0-count"]')
      .click();
    await models.studio.rightPanel.saveDataPicker();

    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="operation"]')
      .click();
    await models.studio.rightPanel.frame
      .getByRole("option", { name: "Increment variable" })
      .click();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="close-sidebar-modal"]')
      .click();

    await models.studio.leftPanel.createNewPage("page");
    const pageFrame = models.studio.getComponentFrameByIndex(1);
    await models.studio.focusFrameRoot(pageFrame);

    await models.studio.leftPanel.insertNode("counter");
    await expect(pageFrame.locator(".__wab_rich_text").first()).toContainText(
      "5"
    );
    await models.studio.rightPanel.checkNumberOfStatesInComponent(0, 0);

    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();

    await models.studio.leftPanel.frame
      .getByText("counter")
      .first()
      .click({ button: "right" });
    await models.studio.leftPanel.frame.getByText("in place").click();

    await page.waitForTimeout(500);

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="count"]')
      .click();
    await models.studio.rightPanel.frame
      .getByText("Allow external access")
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="access-type"]')
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-key="writable"]')
      .click();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="close-sidebar-modal"]')
      .click();

    await models.studio.leftPanel.selectTreeNode(["vertical stack", "counter"]);

    await expect(pageFrame.locator(".__wab_rich_text").first()).toContainText(
      "5"
    );
    await models.studio.rightPanel.checkNumberOfStatesInComponent(0, 1);

    await models.studio.leftPanel.insertNode("Button");

    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();
    await models.studio.rightPanel.frame
      .locator(".panel-row")
      .getByText("Button")
      .click({ button: "right" });
    await models.studio.rightPanel.useDynamicValueButton.click();

    await models.studio.rightPanel.frame.getByText("Switch to Code").click();

    await codeInput.waitFor({ state: "visible" });

    await codeInput.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.insertText(`"Reset"`);
    await page.waitForTimeout(100);

    await models.studio.rightPanel.saveDataPicker();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="add-interaction"]')
      .click();

    await page.waitForTimeout(500);
    await page.keyboard.type(`onClick`);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="action-name"]')
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-key="updateVariable"]')
      .click();
    await models.studio.rightPanel.frame
      .locator(".code-editor-input", { hasText: "$state.count" })
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="0-counter → count"]')
      .click();
    await models.studio.rightPanel.saveDataPicker();

    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="value"]')
      .click();

    await codeInput.waitFor({ state: "visible" });

    await codeInput.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.insertText(`0`);
    await page.waitForTimeout(100);

    await models.studio.rightPanel.saveDataPicker();

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("#plasmic-app .__wab_text")).toContainText(
        "5"
      );
      await liveFrame.getByText("Increment").click();
      await expect(liveFrame.locator("#plasmic-app .__wab_text")).toContainText(
        "6"
      );
      await liveFrame.getByText("Reset").click();
      await expect(liveFrame.locator("#plasmic-app .__wab_text")).toContainText(
        "0"
      );
    });

    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();
    const counterNode = await models.studio.leftPanel.selectTreeNode([
      "vertical stack",
      "counter",
    ]);
    await counterNode.click({ button: "right" });
    await models.studio.leftPanel.frame.getByText("in place").click();

    await page.waitForTimeout(500);

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="count"]')
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="access-type"]')
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-key="readonly"]')
      .click();

    await models.studio.rightPanel.frame
      .locator('[data-test-id="close-sidebar-modal"]')
      .click();

    await models.studio.leftPanel.selectTreeNode(["vertical stack", "counter"]);
    await models.studio.rightPanel.checkNumberOfStatesInComponent(0, 1);
    await expect(pageFrame.locator(".__wab_rich_text").first()).toContainText(
      "5"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("#plasmic-app .__wab_text")).toContainText(
        "5"
      );
      await liveFrame.getByText("Increment").click();
      await expect(liveFrame.locator("#plasmic-app .__wab_text")).toContainText(
        "6"
      );
      await liveFrame.getByText("Reset").click();
      await expect(liveFrame.locator("#plasmic-app .__wab_text")).toContainText(
        "6"
      );
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
