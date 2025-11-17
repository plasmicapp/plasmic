import { cloneDeep } from "lodash";
import { test } from "../../fixtures/test";
import {
  checkFormValues,
  goToProject,
  waitForFrameToLoad,
} from "../../utils/studio-utils";

function getFormValue(expectedFormItems: any[]): string {
  const values = Object.fromEntries(
    expectedFormItems
      .filter((formItem) => formItem.value != null)
      .map((formItem) => [formItem.name, formItem.value])
  );
  return JSON.stringify(values, Object.keys(values).sort());
}

test.describe("simplified", () => {
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

  test("can create/add/remove form items in simplified mode", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addComponent("Simplified Form");
    await waitForFrameToLoad(page);

    const outlineButton = (models.studio as any).studioFrame.locator(
      'button[data-test-tabkey="outline"]'
    );
    const isPressed = await outlineButton.getAttribute("data-state-isselected");
    if (isPressed === "true") {
      await outlineButton.click();
    }

    await models.studio.rightPanel.addState({
      name: "submittedData",
      variableType: "object",
      accessType: "private",
      initialValue: undefined,
    });

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");
    await models.studio.addInteraction("onFinish", {
      actionName: "updateVariable",
      args: {
        variable: ["submittedData"],
        value: "$state.form.value",
      },
    });

    await models.studio.rightPanel.addFormItem("formItems", {
      label: "Field1",
      name: "field1",
    });
    await models.studio.rightPanel.addFormItem("formItems", {
      label: "Field2",
      name: "field2",
      initialValue: "hello",
    });

    const expectedFormItems = [
      { name: "name", label: "Name", type: "text" },
      { name: "message", label: "Message", type: "Text Area" },
      { name: "field1", label: "Field1", type: "text" },
      { name: "field2", label: "Field2", type: "text", value: "hello" },
    ];

    const nestedFrame = models.studio.frames.first().contentFrame();

    await checkFormValues(expectedFormItems, nestedFrame);

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($state.submittedData, Object.keys($state.submittedData).sort())"
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await checkFormValues(expectedFormItems, liveFrame);

      await liveFrame.locator("button").click();
      await liveFrame
        .locator("div")
        .filter({ hasText: getFormValue(expectedFormItems) })
        .first()
        .waitFor({ timeout: 5000 });

      const liveModeExpectedFormItems = cloneDeep(expectedFormItems);
      liveModeExpectedFormItems[0].value = "foo";
      liveModeExpectedFormItems[1].value = "bar";

      await models.studio.rightPanel.updateFormValuesLiveMode(
        {
          inputs: { name: "foo", message: "bar" },
        },
        liveFrame
      );

      await checkFormValues(liveModeExpectedFormItems, liveFrame);

      const submitButton = liveFrame.locator("button");
      await submitButton.waitFor({ timeout: 5000 });
      await submitButton.click();

      const expectedResult = getFormValue(liveModeExpectedFormItems);
      await liveFrame
        .locator("div")
        .filter({ hasText: expectedResult })
        .first()
        .waitFor({ timeout: 10000 });
    });

    await models.studio.leftPanel.switchToTreeTab();

    await models.studio.leftPanel.selectTreeNode(["Form"]);

    await models.studio.rightPanel.removeItemFromArrayProp("formItems", 0);

    const expectedFormItems2 = cloneDeep(expectedFormItems);
    expectedFormItems2.splice(0, 1);

    await checkFormValues(expectedFormItems2, nestedFrame);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await checkFormValues(expectedFormItems2, liveFrame);

      await liveFrame.locator("button").click();
      await liveFrame
        .locator("div")
        .filter({ hasText: getFormValue(expectedFormItems2) })
        .first()
        .waitFor({ timeout: 5000 });

      const liveModeExpectedFormItems = cloneDeep(expectedFormItems2);
      liveModeExpectedFormItems[0].value = "foo";
      liveModeExpectedFormItems[1].value = "bar";
      liveModeExpectedFormItems[2].value = "baz";

      await models.studio.rightPanel.updateFormValuesLiveMode(
        {
          inputs: {
            message: "foo",
            field1: "bar",
            field2: "baz",
          },
        },
        liveFrame
      );

      await checkFormValues(liveModeExpectedFormItems, liveFrame);
      await liveFrame.locator("button").click();
      await liveFrame
        .locator("div")
        .filter({ hasText: getFormValue(liveModeExpectedFormItems) })
        .first()
        .waitFor({ timeout: 5000 });
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
