import { test } from "../../fixtures/test";
import {
  checkFormValues,
  goToProject,
  waitForFrameToLoad,
} from "../../utils/studio-utils";
import { setSelectByLabel } from "../../utils/testControls";

test.describe("schema", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    await apiClient.createFakeDataSource();

    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
      devFlags: {
        schemaDrivenForms: true,
        runningInCypress: true,
      },
    });

    await goToProject(
      page,
      `/projects/${projectId}?schemaDrivenForms=true&runningInCypress=true`
    );
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.deleteDataSourceOfCurrentTest();
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can use schema forms for new entry", async ({ models, page }) => {
    await models.studio.leftPanel.addComponent("Schema Form");
    await waitForFrameToLoad(page);
    await page.waitForTimeout(2000);

    const nestedFrame = page
      .frameLocator("iframe.studio-frame")
      .frameLocator("iframe");

    const outlineButton = models.studio.frame.locator(
      'button[data-test-tabkey="outline"]'
    );
    const isPressed = await outlineButton.getAttribute("data-state-isselected");
    if (isPressed === "true") {
      await outlineButton.click();
    }

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");
    await page.waitForTimeout(2000);

    const connectBtn = models.studio.frame.locator('text="Connect to Table"');
    await connectBtn.click();

    await models.studio.rightPanel.configureSchemaForm({
      formType: "New Entry",
      tableName: "athletes",
    });

    const schemaFieldsValid =
      await models.studio.rightPanel.verifySchemaFormFields(
        ["firstName", "lastName", "sport"],
        nestedFrame
      );

    if (!schemaFieldsValid) {
      throw new Error("New Entry form does not have expected schema fields");
    }

    await models.studio.rightPanel.setupComponentQuery("athletes");
    await page.waitForTimeout(1000);
    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(1000);
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($queries.query.data)"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      const expectedFormItems = [
        { name: "firstName", label: "firstName", type: "text" },
        { name: "lastName", label: "lastName", type: "text" },
        { name: "sport", label: "sport", type: "text" },
        { name: "age", label: "age", type: "number" },
      ];

      await checkFormValues(expectedFormItems, liveFrame);

      await models.studio.rightPanel.updateFormValuesLiveMode(
        {
          inputs: {
            firstName: "Foo",
            lastName: "Bar",
            sport: "Baz",
            age: "123",
          },
        },
        liveFrame
      );

      const submitBtn = liveFrame
        .locator("button")
        .filter({ hasText: "Submit" });
      await submitBtn.click();

      await liveFrame
        .locator("div")
        .filter({
          hasText: JSON.stringify({
            firstName: "Foo",
            lastName: "Bar",
            sport: "Baz",
            age: 123,
          }),
        })
        .first()
        .waitFor({ timeout: 5000 });
    });

    await models.studio.rightPanel.checkNoErrors();
  });

  test("can use schema forms for update entry", async ({ models, page }) => {
    await models.studio.leftPanel.addComponent("Schema Form");
    await waitForFrameToLoad(page);
    await page.waitForTimeout(2000);

    const nestedFrame = page
      .frameLocator("iframe.studio-frame")
      .frameLocator("iframe");

    const outlineButton = models.studio.frame.locator(
      'button[data-test-tabkey="outline"]'
    );
    const isPressed = await outlineButton.getAttribute("data-state-isselected");
    if (isPressed === "true") {
      await outlineButton.click();
    }

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");
    await page.waitForTimeout(2000);

    const connectBtn = models.studio.frame.locator('text="Connect to Table"');
    await connectBtn.click();

    await models.studio.rightPanel.configureSchemaForm({
      formType: "Update Entry",
      tableName: "athletes",
      lookupField: "id",
      idValue: "1",
    });

    const schemaFieldsValid =
      await models.studio.rightPanel.verifySchemaFormFields(
        ["firstName", "lastName", "sport"],
        nestedFrame
      );

    if (!schemaFieldsValid) {
      throw new Error("Update Entry form does not have expected schema fields");
    }

    await models.studio.rightPanel.setupComponentQuery("athletes");
    await page.waitForTimeout(1000);
    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(1000);
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($queries.query.data)"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      const expectedFormItems = [
        { name: "firstName", label: "firstName", type: "text" },
        { name: "lastName", label: "lastName", type: "text" },
        { name: "sport", label: "sport", type: "text" },
        { name: "age", label: "age", type: "number" },
      ];

      await checkFormValues(expectedFormItems, liveFrame);

      await models.studio.rightPanel.updateFormValuesLiveMode(
        {
          inputs: {
            firstName: "{selectall}{del}Foo",
            lastName: "{selectall}{del}Bar",
            sport: "{selectall}{del}Baz",
            age: "{selectall}{del}123",
          },
        },
        liveFrame
      );

      const submitBtn = liveFrame
        .locator("button")
        .filter({ hasText: "Submit" });
      await submitBtn.click();

      await liveFrame
        .locator("div")
        .filter({
          hasText: JSON.stringify({
            id: 1,
            firstName: "Foo",
            lastName: "Bar",
            sport: "Baz",
            age: 123,
          }),
        })
        .first()
        .waitFor({ timeout: 5000 });
    });

    await models.studio.rightPanel.checkNoErrors();
  });

  test("switching table resets fields/onFinish", async ({ models, page }) => {
    await models.studio.leftPanel.addComponent("Schema Form");
    await waitForFrameToLoad(page);
    await page.waitForTimeout(2000);

    const nestedFrame = page
      .frameLocator("iframe.studio-frame")
      .frameLocator("iframe");

    const outlineButton = models.studio.frame.locator(
      'button[data-test-tabkey="outline"]'
    );
    const isPressed = await outlineButton.getAttribute("data-state-isselected");
    if (isPressed === "true") {
      await outlineButton.click();
    }

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");
    await page.waitForTimeout(2000);

    const connectBtn = models.studio.frame.locator('text="Connect to Table"');
    await connectBtn.click();

    await models.studio.rightPanel.configureSchemaForm({
      formType: "New Entry",
      tableName: "athletes",
    });

    const athletesFieldsValid =
      await models.studio.rightPanel.verifySchemaFormFields(
        ["firstName", "lastName", "sport"],
        nestedFrame
      );

    if (!athletesFieldsValid) {
      throw new Error("Athletes form does not have expected schema fields");
    }

    await models.studio.rightPanel.setupComponentQuery("athletes");
    await page.waitForTimeout(1000);
    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(1000);
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($queries.query.data)"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      const expectedFormItems1 = [
        { name: "firstName", label: "firstName", type: "text" },
        { name: "lastName", label: "lastName", type: "text" },
        { name: "sport", label: "sport", type: "text" },
        { name: "age", label: "age", type: "number" },
      ];

      await checkFormValues(expectedFormItems1, liveFrame);

      await models.studio.rightPanel.updateFormValuesLiveMode(
        {
          inputs: {
            firstName: "Foo",
            lastName: "Bar",
            sport: "Baz",
            age: "123",
          },
        },
        liveFrame
      );

      const submitBtn = liveFrame
        .locator("button")
        .filter({ hasText: "Submit" });
      await submitBtn.click();

      await liveFrame
        .locator("div")
        .filter({
          hasText: JSON.stringify({
            firstName: "Foo",
            lastName: "Bar",
            sport: "Baz",
            age: 123,
          }),
        })
        .first()
        .waitFor({ timeout: 5000 });
    });

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode(["Form"]);

    const dataConfigBtn = models.studio.frame.locator(
      'button:has-text("New Entry")'
    );
    await dataConfigBtn.click();
    await page.waitForTimeout(3000);

    await setSelectByLabel(
      models.studio.frame,
      "dataTablePickerTable",
      "products"
    );

    const saveBtn = models.studio.frame.locator('button:has-text("Save")');
    await saveBtn.click();
    await page.waitForTimeout(2000);

    const confirmBtn = models.studio.frame.locator(
      'button:has-text("Confirm")'
    );
    if ((await confirmBtn.count()) > 0) {
      await confirmBtn.click();
    }

    await page.waitForTimeout(5000);

    const expectedFormItems2 = [
      { name: "id", label: "id", type: "text" },
      { name: "name", label: "name", type: "text" },
      { name: "price", label: "price", type: "number" },
    ];

    const productsFieldsValid =
      await models.studio.rightPanel.verifySchemaFormFields(
        ["name", "price"],
        nestedFrame
      );

    if (!productsFieldsValid) {
      throw new Error(
        "Products form does not have expected schema fields after table switch"
      );
    }

    await models.studio.rightPanel.setupComponentQuery("products");
    await page.waitForTimeout(1000); // Wait for query setup
    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(1000); // Wait for text component
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($queries.query2.data)"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await checkFormValues(expectedFormItems2, liveFrame);

      await models.studio.rightPanel.updateFormValuesLiveMode(
        {
          inputs: {
            name: "Acai",
            price: "15",
          },
        },
        liveFrame
      );

      const submitBtn = liveFrame
        .locator("button")
        .filter({ hasText: "Submit" });
      await submitBtn.click();

      await liveFrame
        .locator("div")
        .filter({
          hasText: JSON.stringify({ name: "Acai", price: 15 }),
        })
        .first()
        .waitFor({ timeout: 5000 });
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
