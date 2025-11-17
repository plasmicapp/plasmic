import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("component-props", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "component-props" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create all component prop types", async ({ models }) => {
    await models.studio.leftPanel.addComponent("Component with all prop types");

    await models.studio.createComponentProp({
      propName: "textProp",
      propType: "text",
    });
    await models.studio.createComponentProp({
      propName: "numberProp",
      propType: "num",
    });
    await models.studio.createComponentProp({
      propName: "booleanProp",
      propType: "bool",
    });
    await models.studio.createComponentProp({
      propName: "objectProp",
      propType: "any",
    });
    await models.studio.createComponentProp({
      propName: "queryDataProp",
      propType: "queryData",
    });
    await models.studio.createComponentProp({
      propName: "eventHandlerProp",
      propType: "eventHandler",
    });
    await models.studio.createComponentProp({
      propName: "hrefProp",
      propType: "href",
    });
    await models.studio.createComponentProp({
      propName: "dateProp",
      propType: "dateString",
    });
    await models.studio.createComponentProp({
      propName: "dateRangeProp",
      propType: "dateRangeStrings",
    });
    await models.studio.createComponentProp({
      propName: "colorProp",
      propType: "color",
    });
    await models.studio.createComponentProp({
      propName: "imageProp",
      propType: "img",
    });
  });

  test("can show preview values, default values correctly", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addComponent("Component with props");
    const componentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const componentBody = componentFrame.locator("body");

    await models.studio.createComponentProp({
      propName: "textProp",
      propType: "text",
      defaultValue: "default text",
      previewValue: "preview text",
    });
    await models.studio.createComponentProp({
      propName: "numberProp",
      propType: "num",
      defaultValue: "0",
      previewValue: "42",
    });

    await models.studio.insertTextWithDynamic(
      "`textProp = ${$props.textProp}`"
    );
    await models.studio.insertTextWithDynamic(
      "`numberProp = ${$props.numberProp}`"
    );
    await models.studio.insertTextWithDynamic(
      "`numberProp * 10 = ${$props.numberProp * 10}`"
    );

    await componentBody
      .locator("text=textProp = preview text")
      .waitFor({ state: "visible", timeout: 5000 });

    await expect(
      componentBody.getByText("textProp = preview text")
    ).toBeVisible();
    await expect(componentBody.getByText("numberProp = 42")).toBeVisible();
    await expect(
      componentBody.getByText("numberProp * 10 = 420")
    ).toBeVisible();

    await models.studio.rightPanel.setComponentPropPreviewValue(
      "textProp",
      "Hello, world!"
    );
    await expect(
      componentBody.getByText("textProp = Hello, world!")
    ).toBeVisible();

    await models.studio.rightPanel.setComponentPropPreviewValue(
      "numberProp",
      undefined
    );
    await expect(componentBody.getByText("numberProp = 0")).toBeVisible();
    await expect(componentBody.getByText("numberProp * 10 = 0")).toBeVisible();

    await models.studio.rightPanel.setComponentPropDefaultValue(
      "numberProp",
      undefined
    );
    await expect(
      componentBody.getByText("numberProp = undefined")
    ).toBeVisible();
    await expect(
      componentBody.getByText("numberProp * 10 = NaN")
    ).toBeVisible();

    await models.studio.leftPanel.createNewPage("Page using component props");
    const pageFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .nth(1)
      .contentFrame();
    const pageBody = pageFrame.locator("body");

    await models.studio.leftPanel.insertNode("Component with props");

    await expect(pageBody.getByText("textProp = default text")).toBeVisible();
    await expect(pageBody.getByText("numberProp = undefined")).toBeVisible();
    await expect(pageBody.getByText("numberProp * 10 = NaN")).toBeVisible();

    await models.studio.rightPanel.setDataPlasmicProp(
      "textProp",
      "custom text",
      {
        reset: true,
      }
    );
    await expect(pageBody.getByText("textProp = custom text")).toBeVisible();

    await models.studio.rightPanel.removePropValue("textProp");
    await expect(pageBody.getByText("textProp = default text")).toBeVisible();

    await models.studio.rightPanel.setDataPlasmicProp("numberProp", "0", {
      reset: true,
    });
    await expect(pageBody.getByText("numberProp = 0")).toBeVisible();
    await expect(pageBody.getByText("numberProp * 10 = 0")).toBeVisible();

    await models.studio.rightPanel.removePropValue("numberProp");
    await expect(pageBody.getByText("numberProp = undefined")).toBeVisible();
    await expect(pageBody.getByText("numberProp * 10 = NaN")).toBeVisible();
  });
});
