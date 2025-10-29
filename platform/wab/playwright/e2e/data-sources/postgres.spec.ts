import { expect, FrameLocator, Page } from "@playwright/test";
import { v4 } from "uuid";
import { test } from "../../fixtures/test";
import type { StudioModel } from "../../models/studio-model";

const TUTORIAL_DB_TYPE = "northwind";
const DEFAULT_CUSTOMERS = [
  "Maria Anders",
  "Ana Trujillo",
  "Antonio Moreno",
  "Thomas Hardy",
  "Christina Berglund",
];

type DataSourceOperationArg = {
  value: string;
  isDynamicValue?: boolean;
};

type InteractionConfig = {
  actionName: string;
  args: {
    dataSourceOp?: {
      integration: string;
      args: Record<string, DataSourceOperationArg>;
    };
    variable?: string[];
    operation?: string;
    value?: string;
  };
};

test.describe("Postgres Data Source", () => {
  let projectId: string;
  let dataSourceName: string;
  let origDevFlags: any;

  test.beforeEach(async ({ apiClient, page, context, request }) => {
    dataSourceName = `TutorialDB ${v4()}`;

    origDevFlags = await apiClient.getDevFlags();
    await apiClient.upsertDevFlags({
      ...origDevFlags,
      plexus: false,
    });

    await apiClient.createTutorialDataSource(TUTORIAL_DB_TYPE, dataSourceName);

    await apiClient.login("user2@example.com", "!53kr3tz!");
    const storageState = await request.storageState();
    await context.addCookies(storageState.cookies);

    projectId = await apiClient.setupNewProject({
      name: "Postgres Data Source",
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

  test("postgres basic queries", async ({ models, page }) => {
    const studio = models.studio;
    const customers = [...DEFAULT_CUSTOMERS];

    await studio.waitForFrameToLoad();
    await studio.createNewPageInOwnArena("Homepage");
    const artboardFrame = studio.getComponentFrameByIndex(0);

    await configureCustomersQuery(studio, dataSourceName);

    await setupCustomersList(studio);

    await expectCustomersInDesign(studio, customers);

    await studio.withinLiveMode(async (liveFrame) => {
      await expectCustomersInFrame(liveFrame, customers);
    });

    await studio.turnOffDesignMode();
    await studio.waitForFrameToLoad();
    await expectCustomersInDesign(studio, customers);

    const viewMenu = studio.frame.locator("#view-menu");
    await viewMenu.click();
    const turnOnOption = studio.frame.getByText("Turn on design mode");
    if ((await turnOnOption.count()) > 0) {
      await turnOnOption.click();
    }
    await studio.waitForFrameToLoad();

    await studio.focusFrameRoot(artboardFrame);
    await studio.selectRootNode();

    await studio.rightPanel.switchToComponentDataTab();
    await studio.rightPanel.addState({
      name: "insertedId",
      variableType: "text",
      accessType: "private",
      initialValue: undefined,
    });
    await page.waitForTimeout(200);

    await studio.leftPanel.insertNode("Text");
    await studio.bindTextContentToDynamicValue(["insertedId"]);

    const updateStepName = "tutorialdbUpdateById";
    const createStepName = "tutorialdbCreate";

    const { actionLabels: updateActionLabels } =
      await configureButtonInteractions(studio, page, "Update", [
        {
          actionName: "dataSourceOp",
          args: {
            dataSourceOp: {
              integration: dataSourceName,
              args: {
                operation: { value: "updateById" },
                resource: { value: "customers" },
                "data-source-modal-keys-customer_id-json-editor": {
                  isDynamicValue: true,
                  value: "$queries.query.data[0].customer_id",
                },
                "data-source-modal-variables-contact_name-json-editor": {
                  value: "New Name",
                },
              },
            },
          },
        },
        {
          actionName: "updateVariable",
          args: {
            variable: ["insertedId"],
            operation: "newValue",
            value: `($steps.${updateStepName}.data[0].customer_id)`,
          },
        },
      ]);

    await configureButtonInteractions(studio, page, "Create", [
      {
        actionName: "dataSourceOp",
        args: {
          dataSourceOp: {
            integration: dataSourceName,
            args: {
              operation: { value: "create" },
              resource: { value: "customers" },
              "data-source-modal-variables-company_name-json-editor": {
                value: "Testing",
              },
              "data-source-modal-variables-contact_name-json-editor": {
                value: "Created Name",
              },
              "data-source-modal-variables-city-json-editor": {
                value: "Aaa",
              },
              "data-source-modal-variables-customer_id-json-editor": {
                value: "AAAAA",
              },
            },
          },
        },
      },
      {
        actionName: "updateVariable",
        args: {
          variable: ["insertedId"],
          operation: "newValue",
          value: `($steps.${createStepName}.data[0].customer_id)`,
        },
      },
    ]);

    await page.waitForTimeout(2000);
    if (updateActionLabels.size < 2) {
      throw new Error(
        `Expected both actions on Update button, got: ${[
          ...updateActionLabels,
        ].join(", ")}`
      );
    }

    await studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator('text="Maria Anders"')).toBeVisible();

      const liveUpdateBtn = liveFrame
        .locator('button:has-text("Update")')
        .first();
      await liveUpdateBtn.click();
      await page.waitForTimeout(5000);

      customers[0] = "New Name";
      await expectCustomersInFrame(liveFrame, customers);
      await expect(liveFrame.locator('text="ALFKI"')).toBeVisible();

      const liveCreateBtn = liveFrame
        .locator('button:has-text("Create")')
        .first();
      await liveCreateBtn.click();
      await page.waitForTimeout(5000);

      customers[4] = "Created Name";
      await expectCustomersInFrame(liveFrame, customers);
      await expect(liveFrame.locator('text="AAAAA"')).toBeVisible();
    });

    await studio.rightPanel.checkNoErrors();
  });
});

async function configureCustomersQuery(
  studio: StudioModel,
  dataSourceName: string
) {
  await studio.rightPanel.switchToComponentDataTab();
  await studio.rightPanel.addComponentQuery();
  await studio.rightPanel.pickDataSource(dataSourceName);

  const resourceBtn = studio.rightPanel.frame.locator(
    '[data-plasmic-prop="data-source-modal-pick-resource-btn"]'
  );
  await resourceBtn.click();
  await studio.rightPanel.frame
    .getByRole("option", { name: "customers" })
    .click();

  const sortBtn = studio.rightPanel.frame.locator(
    '[data-plasmic-prop="data-source-sort"]'
  );
  await sortBtn.click();
  await studio.rightPanel.frame.locator('[data-key="customer_id"]').click();

  await studio.rightPanel.setDataPlasmicProp(
    "data-source-pagination-size",
    "5",
    {
      reset: true,
    }
  );
  await studio.rightPanel.saveDataSourceModal();
}

async function setupCustomersList(studio: StudioModel) {
  await studio.leftPanel.insertNode("Horizontal stack");
  await studio.rightPanel.repeatOnCustomCode("$queries.query.data");
  await studio.leftPanel.insertNode("Heading");
  await studio.bindTextContentToDynamicValue(["currentItem", "contact_name"]);
}

async function expectCustomersInDesign(
  studio: StudioModel,
  customers: string[]
) {
  const frame = studio.getComponentFrameByIndex(0);
  await expectCustomersInFrame(frame, customers);
}

async function expectCustomersInFrame(
  frame: FrameLocator,
  customers: string[]
) {
  for (const customer of customers) {
    await expect(frame.locator(`text="${customer}"`)).toBeVisible();
  }
}

async function configureButtonInteractions(
  studio: StudioModel,
  page: Page,
  label: string,
  actions: InteractionConfig[]
) {
  await studio.leftPanel.insertNode("Button");
  await studio.rightPanel.bindTextContentToCustomCode(`"${label}"`);
  return await addOnClickActions(studio, page, actions);
}

async function addOnClickActions(
  studio: StudioModel,
  page: Page,
  actions: InteractionConfig[]
) {
  const { rightPanel } = studio;
  const actionLabels = new Set<string>();

  await rightPanel.switchToSettingsTab();
  await page.waitForTimeout(300);

  await rightPanel.addInteractionButton.waitFor({ timeout: 10000 });
  await rightPanel.addInteractionButton.click();
  await page.waitForTimeout(300);

  await page.keyboard.type("onClick");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);

  for (const [index, action] of actions.entries()) {
    if (index > 0) {
      const addActionBtn = rightPanel.frame
        .locator('[data-test-id="add-new-action"]')
        .last();
      await addActionBtn.waitFor({ timeout: 5000 });
      await addActionBtn.click({ force: true });
      await page.waitForTimeout(300);
    }

    const label = await selectAction(studio, page, action.actionName);
    if (label) {
      actionLabels.add(label);
    }

    if (action.actionName === "dataSourceOp" && action.args.dataSourceOp) {
      const dsOp = action.args.dataSourceOp;
      const configureButton = rightPanel.frame
        .locator('[data-plasmic-prop="data-source-open-modal-btn"]')
        .first();
      await configureButton.waitFor({ timeout: 5000 });
      await configureButton.click();
      await page.waitForTimeout(2000);

      const integrationBtn = rightPanel.frame.locator(
        '[data-plasmic-prop="data-source-modal-pick-integration-btn"]'
      );
      await integrationBtn.click();
      await page.waitForTimeout(300);
      await rightPanel.frame
        .getByRole("option", { name: dsOp.integration })
        .click();
      await page.waitForTimeout(500);

      const operationBtn = rightPanel.frame.locator(
        '[data-plasmic-prop="data-source-modal-pick-operation-btn"]'
      );
      await operationBtn.click();
      await page.waitForTimeout(300);
      const operationValue = dsOp.args.operation?.value;
      if (operationValue) {
        await rightPanel.frame
          .locator(`[data-key="${operationValue}"]`)
          .click();
        await page.waitForTimeout(500);
      }

      if (dsOp.args.resource) {
        const resourceBtn = rightPanel.frame.locator(
          '[data-plasmic-prop="data-source-modal-pick-resource-btn"]'
        );
        await resourceBtn.click();
        await page.waitForTimeout(300);
        await rightPanel.frame
          .getByRole("option", { name: dsOp.args.resource.value })
          .click();
        await page.waitForTimeout(1000);
      }

      for (const [argKey, argConfig] of Object.entries(dsOp.args)) {
        if (["operation", "resource"].includes(argKey)) {
          continue;
        }

        if (argConfig.isDynamicValue) {
          await rightPanel.setDataPlasmicProp(argKey, "{{", { reset: true });
          await page.waitForTimeout(1000);

          await rightPanel.insertMonacoCode(argConfig.value);
          await page.waitForTimeout(500);
        } else {
          await rightPanel.setDataPlasmicProp(argKey, argConfig.value, {
            reset: true,
          });
          await page.waitForTimeout(500);
        }
      }

      await rightPanel.saveDataSourceModal();
      await page.waitForTimeout(1000);
    } else if (action.actionName === "updateVariable") {
      await configureUpdateVariable(
        studio,
        page,
        action.args.variable || [],
        action.args.operation || "newValue",
        action.args.value || ""
      );
    }
  }

  await rightPanel.closeSidebarButton.waitFor({ timeout: 5000 });
  await rightPanel.closeSidebarButton.click();
  await page.waitForTimeout(1000);
  return { actionLabels };
}

async function selectAction(
  studio: StudioModel,
  page: Page,
  actionKey: string
) {
  const { rightPanel } = studio;
  const actionDropdown = rightPanel.frame
    .locator('[data-plasmic-prop="action-name"]')
    .last();
  await actionDropdown.waitFor({ timeout: 5000 });
  await actionDropdown.click();
  const actionOption = rightPanel.frame
    .locator(`[data-key="${actionKey}"]`)
    .first();
  await actionOption.waitFor({ timeout: 5000 });
  const label = await actionOption.textContent();
  await actionOption.click();
  await page.waitForTimeout(300);
  return label?.trim();
}

async function configureUpdateVariable(
  studio: StudioModel,
  page: Page,
  variable: string[],
  operation: string,
  valueExpression: string
) {
  const { rightPanel } = studio;

  const updateVariableOperations: Record<string, number> = {
    newValue: 0,
    clearValue: 1,
    increment: 2,
    decrement: 3,
    toggle: 4,
    push: 5,
    splice: 6,
  };

  const operationDropdown = rightPanel.frame
    .locator('[data-plasmic-prop="operation"]')
    .last();
  await operationDropdown.waitFor({ timeout: 5000 });
  await operationDropdown.click();
  await page.waitForTimeout(300);

  const operationKey = updateVariableOperations[operation];
  const operationOption = rightPanel.frame
    .locator(`[data-key="${operationKey}"]`)
    .first();
  await operationOption.waitFor({ timeout: 5000 });
  await operationOption.click();
  await page.waitForTimeout(500);

  const variableField = rightPanel.frame
    .locator('[data-plasmic-prop="variable"]')
    .last();
  await variableField.waitFor({ timeout: 5000 });
  await variableField.click();
  await page.waitForTimeout(500);

  await rightPanel.selectPathInDataPicker(variable);
  await page.waitForTimeout(500);

  const valueField = rightPanel.frame
    .locator('[data-plasmic-prop="value"]')
    .last();
  await valueField.waitFor({ timeout: 5000 });
  await valueField.click();
  await page.waitForTimeout(500);

  await rightPanel.insertMonacoCode(valueExpression);
  await page.waitForTimeout(300);
}
