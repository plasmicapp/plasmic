import { expect } from "@playwright/test";
import { test } from "../../fixtures/test";
import { goToProject, waitForFrameToLoad } from "../../utils/studio-utils";

test.describe("dynamic-initial-value", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
      devFlags: {
        simplifiedForms: true,
      },
    });
    await goToProject(page, `/projects/${projectId}?simplifiedForms=true`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("initial values work for different input types", async ({
    models,
    page,
  }) => {
    await models.studio.leftPanel.addComponent("Form");
    await waitForFrameToLoad(page);

    const outlineButton = (models.studio as any).studioFrame.locator(
      'button[data-test-tabkey="outline"]'
    );
    const isPressed = await outlineButton.getAttribute("data-state-isselected");
    if (isPressed === "true") {
      await outlineButton.click();
    }

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");

    const formItemsAddBtn = models.studio.frame.locator(
      '[data-test-id="formItems-add-btn"]'
    );
    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "testField");
    await models.studio.rightPanel.setDataPlasmicProp(
      "initialValue",
      "initial text value"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      const input = liveFrame.locator('input[name="testField"]');
      await expect(input).toHaveValue("initial text value");
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "numberField");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Number");
    await models.studio.rightPanel.setDataPlasmicProp("initialValue", "123");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const numberInput = liveFrame.locator('input[name="numberField"]');
      await expect(numberInput).toHaveValue("123");
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "textAreaField");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Text Area");
    await models.studio.rightPanel.setDataPlasmicProp(
      "initialValue",
      "foo bar text area"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      const textarea = liveFrame.locator('textarea[name="textAreaField"]');
      await expect(textarea).toHaveValue("foo bar text area");
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "checkboxFalse");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Checkbox");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const checkbox = liveFrame.locator(
        'input[name="checkboxFalse"][type="checkbox"]'
      );
      await expect(checkbox).toBeChecked({ checked: false });
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "checkboxTrue");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Checkbox");
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const checkbox = liveFrame.locator(
        'input[name="checkboxTrue"][type="checkbox"]'
      );
      await expect(checkbox).toBeChecked({ checked: true });
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
