import { expect } from "@playwright/test";
import { test } from "../../fixtures/test";

test.describe("Antd5 progress", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "antd5",
        npmPkg: ["@plasmicpkgs/antd5"],
      },
    });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProject(projectId);
    }
  });

  test("works", async ({ models, page }) => {
    await models.studio.waitForFrameToLoad();

    await models.studio.createNewPageInOwnArena("Homepage");

    const frameCount = await models.studio.frames.count();
    const newFrame = models.studio.frames.nth(frameCount - 1);
    await newFrame.waitFor({ state: "visible", timeout: 5000 });
    await models.studio.focusFrameRoot(newFrame);

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.waitForSave();

    await models.studio.rightPanel.addState({
      name: "basePercent",
      variableType: "number",
      accessType: "private",
      initialValue: "0",
    });

    await models.studio.rightPanel.addState({
      name: "success",
      variableType: "number",
      accessType: "private",
      initialValue: "0",
    });

    await models.studio.leftPanel.insertNode("plasmic-antd5-progress");

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-percent"] label`)
      .click({ button: "right" });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("basePercent")
      .click();
    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.rightPanel.frame
      .locator(`#component-props-section [data-test-id="show-extra-content"]`)
      .click();

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-successPercent"] label`)
      .click({ button: "right" });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("success")
      .click();
    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="prop-editor-row-infoFormat"] label`)
      .click({ button: "right" });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode(
      `successPercent + "/" + percent`
    );

    await models.studio.leftPanel.insertNode("Button");
    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right" });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode(`"Increment"`);
    await page.waitForTimeout(1500);

    const actionsText = models.studio.rightPanel.frame
      .locator('text="0 actions"')
      .first();
    await actionsText.waitFor({ state: "visible", timeout: 5000 });
    await actionsText.click({ force: true });

    await page.waitForTimeout(1000);

    const addActionButton = models.studio.rightPanel.frame.locator(
      '[data-test-id="add-new-action"]'
    );
    await addActionButton.waitFor({ timeout: 5000 });
    await addActionButton.click();
    await page.waitForTimeout(1500);

    const actionDropdown = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    await actionDropdown.waitFor({ timeout: 15000 });
    await actionDropdown.click();
    await page.waitForTimeout(500);

    const actionOption = models.studio.rightPanel.frame.locator(
      `[data-key="customFunction"]`
    );
    await actionOption.waitFor({ timeout: 10000 });
    await actionOption.click();

    await page.waitForTimeout(500);
    const customFunctionInput = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="customFunction"]'
    );
    await customFunctionInput.waitFor({ timeout: 3000 });
    await customFunctionInput.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.insertMonacoCode(`$state.basePercent += 5;`);

    const closeModalButton = models.studio.rightPanel.frame.locator(
      '[data-test-id="close-sidebar-modal"]'
    );
    await closeModalButton.waitFor({ timeout: 5000 });
    await closeModalButton.click();
    await page.waitForTimeout(500);

    await models.studio.leftPanel.insertNode("Button");
    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right" });
    await page.waitForTimeout(500);
    await models.studio.useDynamicValueButton.click();
    await models.studio.frame.getByText("Switch to Code").click();
    await models.studio.rightPanel.insertMonacoCode(`"Inc Success"`);
    await page.waitForTimeout(1500);

    const actionsText2 = models.studio.rightPanel.frame
      .locator('text="0 actions"')
      .last();
    await actionsText2.waitFor({ state: "visible", timeout: 5000 });
    await actionsText2.click({ force: true });

    await page.waitForTimeout(1000);

    const addActionButton2 = models.studio.rightPanel.frame.locator(
      '[data-test-id="add-new-action"]'
    );
    await addActionButton2.waitFor({ timeout: 5000 });
    await addActionButton2.click();
    await page.waitForTimeout(1500);

    const actionDropdown2 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    await actionDropdown2.waitFor({ timeout: 15000 });
    await actionDropdown2.click();
    await page.waitForTimeout(500);

    const actionOption2 = models.studio.rightPanel.frame.locator(
      `[data-key="customFunction"]`
    );
    await actionOption2.waitFor({ timeout: 10000 });
    await actionOption2.click();

    await page.waitForTimeout(500);
    const customFunctionInput2 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="customFunction"]'
    );
    await customFunctionInput2.waitFor({ timeout: 3000 });
    await customFunctionInput2.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.insertMonacoCode(`$state.success += 5;`);

    const closeModalButton2 = models.studio.rightPanel.frame.locator(
      '[data-test-id="close-sidebar-modal"]'
    );
    await closeModalButton2.waitFor({ timeout: 5000 });
    await closeModalButton2.click();
    await page.waitForTimeout(500);

    await models.studio.withinLiveMode(async (liveFrame) => {
      const progressText = liveFrame.locator(".ant-progress-text");
      await progressText.waitFor({ state: "visible", timeout: 10000 });
      await expect(progressText).toHaveText("0/0");

      const incrementBtn = liveFrame.getByText("Increment");
      await incrementBtn.waitFor({ state: "visible", timeout: 10000 });

      for (let i = 0; i < 7; i++) {
        await incrementBtn.click();
        await page.waitForTimeout(200);
      }

      const incSuccessBtn = liveFrame.getByText("Inc Success");
      await incSuccessBtn.waitFor({ state: "visible", timeout: 10000 });

      for (let i = 0; i < 3; i++) {
        await incSuccessBtn.click();
        await page.waitForTimeout(200);
      }

      await incrementBtn.click();
      await page.waitForTimeout(500);

      await expect(progressText).toHaveText("15/40");
    });
  });
});
