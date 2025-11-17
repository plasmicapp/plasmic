import { expect } from "@playwright/test";
import { cloneDeep } from "lodash";
import { test } from "../../fixtures/test";
import {
  checkFormValues,
  getFormValue,
  goToProject,
} from "../../utils/studio-utils";

test.describe.skip("simplified-all-form-items", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "antd5",
        npmPkg: ["@plasmicpkgs/antd5"],
      },
    });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test.skip("can create all types of form items", async ({ models }) => {
    await models.studio.createNewComponent("Simplified Form");

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");

    // Wait for component to be fully loaded
    await (models.studio as any).page.waitForTimeout(3000);

    // Remove default form items (name, message) - matching Cypress exactly
    await models.studio.rightPanel.removeItemFromArrayProp("formItems", 0);
    await models.studio.rightPanel.removeItemFromArrayProp("formItems", 0);

    const expectedFormItems: {
      label: string;
      name: string;
      type: string;
      options?: string[];
      value: string | number;
    }[] = [
      {
        label: "Text Field",
        name: "textField",
        type: "Text",
        value: "text field value",
      },
      {
        label: "Text Area",
        name: "textArea",
        type: "Text Area",
        value: "text area value",
      },
      {
        label: "Password",
        name: "password",
        type: "Password",
        value: "password value",
      },
      {
        label: "Number",
        name: "number",
        type: "Number",
        value: 123,
      },
      {
        label: "Select",
        name: "select",
        type: "Select",
        options: ["opt1", "opt2"],
        value: "opt2",
      },
      {
        label: "Radio Group",
        name: "radioGroup",
        type: "Radio Group",
        options: ["radio1", "radio2"],
        value: "radio1",
      },
    ];

    for (const formItem of expectedFormItems) {
      await models.studio.rightPanel.addFormItem("formItems", {
        label: formItem.label,
        name: formItem.name,
        inputType: formItem.type,
        initialValue: `${formItem.value}`,
        ...(formItem.options
          ? {
              options: formItem.options,
            }
          : {}),
      });
    }

    await checkFormValues(
      expectedFormItems,
      (models.studio as any).studioFrame
    );

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($state.form.value, Object.keys($state.form.value).sort())"
    );

    const selectedElt = await models.studio.getSelectedElt();
    await expect(selectedElt).toContainText(getFormValue(expectedFormItems));

    await models.studio.withinLiveMode(async (liveFrame) => {
      await checkFormValues(expectedFormItems, liveFrame);

      const liveModeExpectedFormItems = cloneDeep(expectedFormItems);
      await models.studio.rightPanel.updateFormValuesLiveMode(
        {
          inputs: {
            textField: "{selectall}{del}new text",
            password: "{selectall}{del}new password",
            textArea: "{selectall}{del}new text area",
            number: "{selectall}{del}456",
          },
          selects: { select: "opt1" },
          radios: { radioGroup: "radio2" },
        },
        liveFrame
      );

      liveModeExpectedFormItems[0].value = "new text";
      liveModeExpectedFormItems[1].value = "new text area";
      liveModeExpectedFormItems[2].value = "new password";
      liveModeExpectedFormItems[3].value = 456;
      liveModeExpectedFormItems[4].value = "opt1";
      liveModeExpectedFormItems[5].value = "radio2";

      await checkFormValues(liveModeExpectedFormItems, liveFrame);
      await expect(liveFrame.locator("#plasmic-app div")).toContainText(
        getFormValue(liveModeExpectedFormItems)
      );
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
