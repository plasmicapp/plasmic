import { expect } from "@playwright/test";
import { v4 } from "uuid";
import { test } from "../../fixtures/test";

test.describe("HTTP Data Source", () => {
  let projectId: string;
  let dataSourceName: string;
  let origDevFlags: any;

  test.beforeEach(async ({ apiClient, page }) => {
    dataSourceName = `HTTP ${v4()}`;

    origDevFlags = await apiClient.getDevFlags();
    await apiClient.upsertDevFlags({
      ...origDevFlags,
      plexus: false,
    });

    await apiClient.createFakeDataSource({
      source: "http",
      name: dataSourceName,
      settings: {
        baseUrl: "https://jsonplaceholder.typicode.com/",
        commonHeaders: {
          "Content-Type": "application/json",
        },
      },
    });

    projectId = await apiClient.setupNewProject({
      name: "HTTP Data Source",
    });

    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.deleteDataSourceOfCurrentTest();

    if (projectId) {
      await apiClient.removeProject(projectId);
    }

    if (origDevFlags) {
      await apiClient.upsertDevFlags(origDevFlags);
    }
  });

  test("http basic queries", async ({ models, page }) => {
    await models.studio.waitForFrameToLoad();

    await page.waitForTimeout(5000);

    const USER_NAME = "Leanne Graham";

    await models.studio.createNewPageInOwnArena("Homepage");

    await models.studio.rightPanel.switchToComponentDataTab();

    await models.studio.rightPanel.addComponentQuery();

    await page.waitForTimeout(1000);
    pickDataSource(dataSourceName, models, page);

    await page
      .locator(".ant-modal")
      .waitFor({ state: "hidden", timeout: 10000 });
    await setDataPlasmicProp("data-source-modal-path", "users", page, models);
    await setDataPlasmicProp(
      "data-source-modal-params-key",
      "name",
      page,
      models
    );
    await setDataPlasmicProp(
      "data-source-modal-params-value",
      USER_NAME,
      page,
      models
    );

    const saveBtn = models.studio.rightPanel.frame.locator(
      "#data-source-modal-save-btn"
    );
    await saveBtn.click();

    await page
      .locator(".ant-modal")
      .waitFor({ state: "hidden", timeout: 10000 });

    await models.studio.waitForFrameToLoad();

    await models.studio.rightPanel.switchToDesignTab();

    await models.studio.leftPanel.insertNode("Heading");

    await models.studio.rightPanel.frame
      .locator(`[data-test-id="text-content"] label`)
      .click({ button: "right" });

    await models.studio.useDynamicValueButton.click();

    selectPathInDataPicker(models, page, [
      "query",
      "data",
      "response",
      "0",
      "name",
    ]);

    const designFrame = models.studio.getComponentFrameByIndex(0);
    await expect(designFrame.getByText(USER_NAME)).toBeVisible({
      timeout: 10000,
    });

    await models.studio.rightPanel.switchToComponentDataTab();

    await models.studio.rightPanel.addState({
      name: "name",
      variableType: "text",
      accessType: "private",
      initialValue: undefined,
    });

    await models.studio.rightPanel.addState({
      name: "statusCode",
      variableType: "number",
      accessType: "private",
      initialValue: undefined,
    });

    await models.studio.leftPanel.insertNode("Text");
    await bindTextContentToObjectPath(models, page, ["name"]);

    await models.studio.leftPanel.insertNode("Text");
    await bindTextContentToObjectPath(models, page, ["statusCode"]);

    await models.studio.leftPanel.insertNode("Button");

    await page.waitForTimeout(1000);
    await bindTextContentToCustomCode(models, page, `"Post"`);

    await addInteraction(models, page, "onClick", [
      {
        actionName: "dataSourceOp",
        args: {
          dataSourceOp: {
            integration: dataSourceName,
            args: {
              operation: { value: "post" },
              "data-source-modal-path": {
                value: "users",
                opts: { clickPosition: "right" },
              },
              "data-source-modal-body": {
                inputType: "raw",
                isDynamicValue: true,
                value: `({name: "test",})`,
              },
            },
          },
        },
      },
      {
        actionName: "updateVariable",
        args: {
          variable: ["name"],
          operation: "newValue",
          value: `($steps.httpPost.data.response.name)`,
        },
      },
      {
        actionName: "updateVariable",
        args: {
          variable: ["statusCode"],
          operation: "newValue",
          value: `($steps.httpPost.data.statusCode)`,
        },
      },
    ]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.getByText(USER_NAME)).toBeVisible();
      await expect(liveFrame.getByText("Post")).toBeVisible();
      await liveFrame.getByText("Post").click();
      await page.waitForTimeout(5000);
      await expect(liveFrame.getByText("test")).toBeVisible();
      await expect(liveFrame.getByText("201")).toBeVisible();
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});

async function pickDataSource(dataSourceName, models, page) {
  const pickButton = models.studio.rightPanel.frame.locator(
    "#data-source-modal-pick-integration-btn"
  );
  await pickButton.click();

  await page.waitForSelector(".ant-modal", {
    state: "visible",
    timeout: 10000,
  });

  const modal = page.locator(".ant-modal").first();
  const dataSourceDropdown = modal.locator("select").first();

  await dataSourceDropdown.waitFor({ state: "visible", timeout: 10000 });

  const options = await dataSourceDropdown.locator("option").all();
  for (const option of options) {
    const text = await option.textContent();
    if (text && text.includes(dataSourceName)) {
      const value = await option.getAttribute("value");
      if (value) {
        await dataSourceDropdown.selectOption(value);
        break;
      }
    }
  }

  const confirmButton = modal.getByRole("button", { name: "Confirm" });
  await confirmButton.click();
}

async function setDataPlasmicProp(prop, value, page, models) {
  const pathField = models.studio.rightPanel.frame.locator(
    `[data-plasmic-prop="${prop}"]`
  );
  await pathField.waitFor({ state: "visible", timeout: 10000 });
  await pathField.click();

  const isMac = process.platform === "darwin";
  const cmdKey = isMac ? "Meta" : "Control";

  await page.keyboard.press(`${cmdKey}+a`);
  await page.keyboard.type(value);
}

async function selectPathInDataPicker(models, page, path) {
  const dataPicker = models.studio.rightPanel.frame.locator(
    '[data-test-id="data-picker"]'
  );
  await dataPicker.waitFor({ state: "visible", timeout: 10000 });

  for (let i = 0; i < path.length; i++) {
    const item = path[i];
    const itemElement = models.studio.rightPanel.frame.locator(
      `[data-test-id="${i}-${item}"]`
    );
    await itemElement.waitFor({ state: "visible", timeout: 10000 });
    await itemElement.click();
  }

  await models.studio.rightPanel.dataPickerSaveButton.click();
}

async function bindTextContentToObjectPath(models, page, path) {
  await models.studio.rightPanel.frame
    .locator(`[data-test-id="text-content"] label`)
    .click({ button: "right" });
  await models.studio.useDynamicValueButton.click();
  await page.waitForTimeout(500);
  await selectPathInDataPicker(models, page, path);
  await page.waitForTimeout(500);
}

async function bindTextContentToCustomCode(models, page, code) {
  await models.studio.rightPanel.frame
    .locator(`[data-test-id="text-content"] label`)
    .click({ button: "right" });
  await models.studio.useDynamicValueButton.click();
  await page.waitForTimeout(500);

  const dataPicker = models.studio.rightPanel.frame.locator(
    '[data-test-id="data-picker"]'
  );
  const dataPickerText = await dataPicker.textContent();
  if (dataPickerText && dataPickerText.includes("Switch to Code")) {
    await models.studio.rightPanel.frame.getByText("Switch to Code").click();
  }

  await page.waitForTimeout(1000);
  const monacoEditor = models.studio.rightPanel.frame.locator(
    '[data-test-id="data-picker"] .react-monaco-editor-container'
  );
  await monacoEditor.click();

  const isMac = process.platform === "darwin";
  const cmdKey = isMac ? "Meta" : "Control";
  await page.waitForTimeout(100);
  await page.keyboard.press(`${cmdKey}+a`);
  await page.waitForTimeout(100);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(100);
  await page.keyboard.insertText(code);

  await page.waitForTimeout(100);
  await models.studio.rightPanel.frame
    .locator('[data-test-id="data-picker"]')
    .getByRole("button", { name: "Save" })
    .click();
  await page.waitForTimeout(100);
}

interface InteractionConfig {
  actionName: string;
  args: Record<string, any>;
}

const updateVariableOperations: Record<string, number> = {
  newValue: 0,
  clearValue: 1,
  increment: 2,
  decrement: 3,
  toggle: 4,
  push: 5,
  splice: 6,
};

async function addInteraction(
  models,
  page,
  eventHandler: string,
  interactions: InteractionConfig[]
) {
  await models.studio.rightPanel.switchToSettingsTab();
  await page.waitForTimeout(300);

  await models.studio.rightPanel.addInteractionButton.waitFor({
    timeout: 10000,
  });
  await models.studio.rightPanel.addInteractionButton.click();
  await page.waitForTimeout(200);

  await page.keyboard.type(eventHandler);
  await page.keyboard.press("Enter");

  const isMac = process.platform === "darwin";
  const cmdKey = isMac ? "Meta" : "Control";

  for (
    let interactionIndex = 0;
    interactionIndex < interactions.length;
    interactionIndex++
  ) {
    const interaction = interactions[interactionIndex];
    await page.waitForTimeout(500);

    const actionDropdown = models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="action-name"]')
      .last();
    await actionDropdown.waitFor({ timeout: 5000 });
    await actionDropdown.click();
    const actionOption = models.studio.rightPanel.frame
      .locator(`[data-key="${interaction.actionName}"]`)
      .first();
    await actionOption.waitFor({ timeout: 5000 });
    await actionOption.click();
    await page.waitForTimeout(300);

    for (const argName in interaction.args) {
      await page.waitForTimeout(500);

      if (
        argName === "operation" &&
        interaction.actionName === "updateVariable"
      ) {
        const operationValue =
          updateVariableOperations[interaction.args[argName]];
        const operationDropdown = models.studio.rightPanel.frame
          .locator('[data-plasmic-prop="operation"]')
          .last();
        await operationDropdown.waitFor({ timeout: 5000 });
        await operationDropdown.click();
        await page.waitForTimeout(300);
        const operationOption = models.studio.rightPanel.frame
          .locator(`[data-key="${operationValue}"]`)
          .first();
        await operationOption.waitFor({ timeout: 5000 });
        await operationOption.click();
        await page.waitForTimeout(500);
      } else if (argName === "variable") {
        const variablePath = interaction.args[argName] as string[];
        const variableField = models.studio.rightPanel.frame
          .locator('[data-plasmic-prop="variable"]')
          .last();
        await variableField.waitFor({ timeout: 5000 });
        await variableField.click();
        await page.waitForTimeout(500);
        await models.studio.rightPanel.selectPathInDataPicker(variablePath);
        await page.waitForTimeout(500);
      } else if (argName === "value") {
        const valueCode = interaction.args[argName] as string;
        const valueField = models.studio.rightPanel.frame
          .locator('[data-plasmic-prop="value"]')
          .last();
        await valueField.waitFor({ timeout: 5000 });
        await valueField.click();
        await page.waitForTimeout(500);
        await models.studio.rightPanel.insertMonacoCode(valueCode);
        await page.waitForTimeout(300);
      } else if (argName === "dataSourceOp") {
        const dsOp = interaction.args[argName];
        const configureButton = models.studio.rightPanel.frame
          .locator('[data-plasmic-prop="data-source-open-modal-btn"]')
          .first();
        await configureButton.waitFor({ timeout: 5000 });
        await configureButton.click();
        await page.waitForTimeout(2000);

        const integrationBtn = models.studio.rightPanel.frame.locator(
          '[data-plasmic-prop="data-source-modal-pick-integration-btn"]'
        );
        await integrationBtn.click();
        await page.waitForTimeout(300);
        await models.studio.rightPanel.frame
          .getByRole("option", { name: dsOp.integration })
          .click();
        await page.waitForTimeout(500);

        const operationBtn = models.studio.rightPanel.frame.locator(
          '[data-plasmic-prop="data-source-modal-pick-operation-btn"]'
        );
        await operationBtn.click();
        await page.waitForTimeout(300);
        await models.studio.rightPanel.frame
          .locator(`[data-key="${dsOp.args.operation.value}"]`)
          .click();
        await page.waitForTimeout(500);

        for (const [argKey, argConfig] of Object.entries(dsOp.args)) {
          if (["operation", "resource"].includes(argKey)) {
            continue;
          }

          if ((argConfig as any).inputType) {
            const inputTypeBtn = models.studio.rightPanel.frame.locator(
              `[data-plasmic-prop="${argKey}-${(argConfig as any).inputType}"]`
            );
            await inputTypeBtn.click();
          }

          if ((argConfig as any).isDynamicValue) {
            const field = models.studio.rightPanel.frame.locator(
              `[data-plasmic-prop="${argKey}"]`
            );
            await field.click({ button: "right" });
            await page.waitForTimeout(200);
            await page.keyboard.press(`${cmdKey}+a`);
            await page.waitForTimeout(100);
            await page.keyboard.press("Backspace");
            await page.waitForTimeout(100);
            await page.keyboard.type("{{");
            await page.waitForTimeout(1000);
            await models.studio.rightPanel.insertMonacoCode(
              (argConfig as any).value
            );
            await page.waitForTimeout(500);
          } else {
            const field = models.studio.rightPanel.frame.locator(
              `[data-plasmic-prop="${argKey}"]`
            );
            await field.waitFor({ state: "visible", timeout: 10000 });
            const clickPosition = (argConfig as any).opts?.clickPosition;
            if (clickPosition === "right") {
              await field.click({ button: "right" });
            } else {
              await field.click();
            }
            await page.waitForTimeout(200);
            await page.keyboard.press(`${cmdKey}+a`);
            await page.waitForTimeout(100);
            await page.keyboard.press("Backspace");
            await page.waitForTimeout(100);
            await page.keyboard.type((argConfig as any).value);
            await page.waitForTimeout(2000);
            await page.keyboard.press("Enter");
            await page.waitForTimeout(500);
          }
        }

        await models.studio.rightPanel.saveDataSourceModal();
        await page.waitForTimeout(1000);
      }
    }

    if (interactionIndex + 1 < interactions.length) {
      const addActionBtn = models.studio.rightPanel.frame
        .locator('[data-test-id="add-new-action"]')
        .last();
      await addActionBtn.waitFor({ timeout: 5000 });
      await addActionBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  }

  await models.studio.rightPanel.closeSidebarButton.waitFor({ timeout: 5000 });
  await models.studio.rightPanel.closeSidebarButton.click();
  await page.waitForTimeout(200);
}
