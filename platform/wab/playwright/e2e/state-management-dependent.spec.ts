import { expect } from "@playwright/test";
import { DevFlagsType } from "../../src/wab/shared/devflags";
import { test } from "../fixtures/test";

test.describe("state-management-dependents", () => {
  let projectId: string;
  let origDevFlags: DevFlagsType;

  test.beforeEach(async ({ apiClient, page }) => {
    origDevFlags = await apiClient.getDevFlags();

    await apiClient.upsertDevFlags({
      ...origDevFlags,
      plexus: false,
    });

    projectId = await apiClient.setupProjectFromTemplate("state-management");

    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    if (origDevFlags) {
      await apiClient.upsertDevFlags(origDevFlags);
    }
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create dependent states", async ({ models, page }) => {
    await models.studio.leftPanel.addComponent("Dependent States");
    const framed = models.studio.getComponentFrameByIndex(0);
    await models.studio.focusFrameRoot(framed);

    const options = ["option1", "option2", "option3"];

    await models.studio.leftPanel.insertNode("Select");

    const optionsProp = models.studio.frame.locator(
      '[data-test-id="prop-editor-row-options"]'
    );
    await optionsProp.click({ button: "right" });
    await models.studio.allowExternalAccessButton.click();
    await optionsProp.click({ button: "right" });
    await models.studio.rightPanel.useDynamicValueButton.click();

    await models.studio.rightPanel.frame.getByText("Switch to Code").click();

    const codeInput = models.studio.rightPanel.valueCodeInput;
    await codeInput.waitFor({ state: "visible" });
    await codeInput.click();

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.insertText(JSON.stringify(options));
    await page.waitForTimeout(100);

    await models.studio.rightPanel.frame
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.leftPanel.insertNode("Text Input");

    const textInputValueProp = models.studio.frame
      .locator('[data-test-id="prop-editor-row-value"]')
      .first();
    await textInputValueProp.click({ button: "right" });
    await models.studio.allowExternalAccessButton.click();
    await textInputValueProp.click({ button: "right" });
    await models.studio.rightPanel.useDynamicValueButton.click();

    await models.studio.rightPanel.frame.getByText("Switch to Code").click();

    await codeInput.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.insertText("$state.select.value");
    await page.waitForTimeout(100);

    await models.studio.rightPanel.frame
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.leftPanel.insertNode("TextInput");

    await textInputValueProp.click({ button: "right" });
    await models.studio.allowExternalAccessButton.click();
    await textInputValueProp.click({ button: "right" });
    await models.studio.rightPanel.useDynamicValueButton.click();

    await models.studio.rightPanel.frame.getByText("Switch to Code").click();

    await codeInput.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.insertText("$state.textInput.value.toUpperCase()");
    await page.waitForTimeout(100);

    await models.studio.rightPanel.frame
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.rightPanel.checkNumberOfStatesInComponent(0, 3);

    await models.studio.rightPanel.switchToComponentDataTab();
    const statesSection = models.studio.rightPanel.frame.locator(
      '[data-test-id="variables-section"]'
    );
    await expect(statesSection).toBeVisible();

    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();

    for (const opt of options) {
      await models.studio.leftPanel.selectTreeNode([
        "vertical stack",
        "Select",
      ]);

      const selectValueProp = models.studio.frame
        .locator('[data-plasmic-prop="value"]')
        .first();
      await selectValueProp.click();
      await page.keyboard.type(opt);
      await page.keyboard.press("Enter");

      await page.waitForTimeout(200);

      const selectButton = framed.locator("button").first();
      await expect(selectButton).toContainText(opt);

      const textInput1 = framed.locator(`input[value="${opt}"]`);
      await expect(textInput1).toHaveCount(1);

      const textInput2 = framed.locator(`input[value="${opt.toUpperCase()}"]`);
      await expect(textInput2).toHaveCount(1);
    }

    await models.studio.withinLiveMode(async (liveFrame) => {
      for (const opt of options) {
        const appDiv = liveFrame.locator("#plasmic-app > div");

        const selectElement = appDiv.locator("select");
        await selectElement.selectOption(opt);

        const textInput1 = appDiv.locator(`input[value="${opt}"]`);
        await expect(textInput1).toHaveCount(1);

        const textInput2 = appDiv.locator(
          `input[value="${opt.toUpperCase()}"]`
        );
        await expect(textInput2).toHaveCount(1);

        await textInput1.fill(opt + "hello");

        const updatedTextInput1 = appDiv.locator(`input[value="${opt}hello"]`);
        await expect(updatedTextInput1).toHaveCount(1);

        const updatedTextInput2 = appDiv.locator(
          `input[value="${opt.toUpperCase()}HELLO"]`
        );
        await expect(updatedTextInput2).toHaveCount(1);
      }
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
