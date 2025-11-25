import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

const DATA_TOKENS = [
  {
    name: "My String Token",
    jsName: "myStringToken",
    type: "string",
    value: "test value",
  },
  {
    name: "My Number Token",
    type: "number",
    value: "123",
  },
  {
    name: "My Code Token",
    type: "code",
    value: `
      let a = 2;
      let b = 3;

      return a + b;
    `,
    evaluatedValue: "5",
  },
  {
    name: "My JSON Token",
    type: "code",
    value: `
      {
        "a": 2,
        "b": {
          c: "nested value",
        },
      }
    `,
    nestedPath: ["b", "c"],
    evaluatedValue: "nested value",
  },
];

test.describe("data-tokens", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "data-tokens" });
    await goToProject(page, `/projects/${projectId}?dataTokens=true`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("Data tokens can be created and used in dynamic values", async ({
    models,
  }) => {
    await models.studio.leftPanel.createNewPage("TestPage");

    await models.studio.leftPanel.insertText();
    await models.studio.renameTreeNode("text1");
    await models.studio.rightPanel.frame
      .locator('[data-test-id="text-content"] label')
      .click({ button: "right" });
    await models.studio.useDynamicValueButton.click();
    await expect(
      models.studio.frame
        .locator('[data-test-id="data-picker"]')
        .getByText("Data Tokens")
    ).not.toBeVisible();

    for (const tokenInfo of DATA_TOKENS) {
      await models.studio.leftPanel.createNewDataToken(
        tokenInfo.name,
        tokenInfo.type,
        tokenInfo.value
      );
      await models.studio.rightPanel.frame
        .locator('[data-test-id="text-content"]')
        .locator(".code-editor-input")
        .click();
      const path = ["Data Tokens", tokenInfo.name];
      if (tokenInfo.nestedPath) {
        path.push(...tokenInfo.nestedPath);
      }
      await models.studio.rightPanel.selectPathInDataPicker(path);

      // Check in component frame (canvas)
      await expect(
        models.studio.componentFrame.getByText(
          tokenInfo.evaluatedValue ?? tokenInfo.value
        )
      ).toBeVisible();

      // PLA-12594: check in live preview
      // await models.studio.withinLiveMode(async (liveFrame) => {
      // });
    }
  });
});
