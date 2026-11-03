import formsBundle from "../../bundles/forms.json";
import { PageModels, test } from "../../fixtures/test";
import {
  ExpectedFormItem,
  checkFormValues,
  goToProject,
} from "../../utils/studio-utils";

test.describe("conversion-between-modes", () => {
  let projectId: string;

  async function selectFormInOutline(models: PageModels) {
    const outlineForm = models.studio.frame.locator('text="Form"').first();
    const formCount = await outlineForm.count();
    if (formCount > 0) {
      await outlineForm.click();
    }
  }

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectFromTemplate(formsBundle);

    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!",
    );
  });

  test("simplified <-> advanced mode", async ({ models }) => {
    const frame = await models.studio.switchArena("Test Conversion 1");

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");

    const expectedFormItems: ExpectedFormItem[] = [
      {
        name: "textItem",
        label: "Text Item",
        type: "Text",
        value: "text value",
      },
      {
        name: "textAreaItem",
        label: "Text Area Item",
        type: "Text Area",
        value: "text area value",
      },
      {
        name: "passwordItem",
        label: "Password Item",
        type: "Password",
        value: "password value",
      },
      {
        name: "numberItem",
        label: "Number Item",
        type: "Number",
        value: 123,
      },
      {
        name: "selectItem",
        label: "Select Item",
        type: "Select",
        value: "Option 1",
      },
      {
        name: "radioGroupItem",
        label: "Radio Group Item",
        type: "Radio Group",
        value: "radio1",
      },
      {
        name: "checkboxItem",
        label: "Checkbox Item",
        type: "Checkbox",
        value: true,
      },
      {
        name: "datePickerItem",
        label: "Date Picker Item",
        type: "DatePicker",
        value: "2023-09-21T13:00:00.000Z",
      },
      { name: "requiredItem", label: "Required Item", type: "Text" },
      { name: "rangeLength", label: "Range Length", type: "Text" },
      { name: "rangeValue", label: "Range Value", type: "Number" },
    ];

    await checkFormValues(expectedFormItems, frame);

    await selectFormInOutline(models);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.checkNoErrors();
  });

  test("advanced <-> simplified mode", async ({ models }) => {
    const frame = await models.studio.switchArena("Test Conversion 2");

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");

    const expectedFormItems: ExpectedFormItem[] = [
      {
        name: "textItem",
        label: "Text Item",
        type: "Text",
        value: "text value",
      },
      {
        name: "textAreaItem",
        label: "Text Area Item",
        type: "Text Area",
        value: "text area value",
      },
      {
        name: "passwordItem",
        label: "Password Item",
        type: "Password",
        value: "password value",
      },
      {
        name: "numberItem",
        label: "Number Item",
        type: "Number",
        value: 123,
      },
      {
        name: "selectItem",
        label: "Select Item",
        type: "Select",
        value: "Option 1",
      },
      {
        name: "radioGroupItem",
        label: "Radio Group Item",
        type: "Radio Group",
        value: "radio1",
      },
      {
        name: "checkboxItem",
        label: "Checkbox Item",
        type: "Checkbox",
        value: true,
      },
      {
        name: "datePickerItem",
        label: "Date Picker Item",
        type: "DatePicker",
        value: "2023-09-21T13:00:00.000Z",
      },
      { name: "requiredItem", label: "Required Item", type: "Text" },
      { name: "rangeLength", label: "Range Length", type: "Text" },
      { name: "rangeValue", label: "Range Value", type: "Number" },
    ];

    await checkFormValues(expectedFormItems, frame);

    await selectFormInOutline(models);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.checkNoErrors();
  });

  test("should miss some information when converting to simplified mode", async ({
    models,
  }) => {
    const frame = await models.studio.switchArena("Test Conversion 6");

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");

    const expectedFormItems: ExpectedFormItem[] = [
      {
        name: "textItem",
        label: "Text Item",
        type: "Text",
        value: "text value",
      },
      {
        name: "textAreaItem",
        label: "Text Area Item",
        type: "Text Area",
        value: "text area value",
      },
      {
        name: "passwordItem",
        label: "Password Item",
        type: "Password",
        value: "password value",
      },
      {
        name: "numberItem",
        label: "Number Item",
        type: "Number",
        value: 123,
      },
      {
        name: "selectItem",
        label: "Select Item",
        type: "Select",
        value: "Option 1",
      },
      {
        name: "radioGroupItem",
        label: "Radio Group Item",
        type: "Radio Group",
        value: "radio1",
      },
      {
        name: "checkboxItem",
        label: "Checkbox Item",
        type: "Checkbox",
        value: true,
      },
      {
        name: "datePickerItem",
        label: "Date Picker Item",
        type: "DatePicker",
        value: "2023-09-21T13:00:00.000Z",
      },
      { name: "requiredItem", label: "Required Item", type: "Text" },
      { name: "rangeLength", label: "Range Length", type: "Text" },
      { name: "rangeValue", label: "Range Value", type: "Number" },
    ];

    await selectFormInOutline(models);

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.checkNoErrors();
  });

  test("convert plume components", async ({ models }) => {
    const frame = await models.studio.switchArena("Test Conversion 7");

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");

    const expectedFormItems: ExpectedFormItem[] = [
      { name: "plumeText", label: "Plume Text Input", type: "Text" },
      {
        name: "plumeSelect",
        label: "Plume select",
        type: "Select",
        value: "option1",
      },
      {
        name: "plumeSelectUsingSlot",
        label: "Plume select using slot",
        type: "Select",
        value: "Option 3 0",
      },
      {
        name: "plumeCheckbox",
        label: "Checkbox label",
        type: "Checkbox",
        value: true,
      },
      {
        name: "plumeSwitch",
        label: "Switch me",
        type: "Checkbox",
        value: true,
      },
    ];

    await checkFormValues(expectedFormItems, frame);

    await selectFormInOutline(models);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle",
    );

    await checkFormValues(expectedFormItems, frame);

    await models.studio.rightPanel.checkNoErrors();
  });
});
