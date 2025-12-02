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

test.describe("data token usages", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    // Mock GET requests to example.strapi.com
    await page.route("**/example.strapi.com/", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            // Add your mock response data here
            data: [
              { message: "Mock message 1" },
              { message: "Mock message 2" },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    projectId = await apiClient.setupProjectFromTemplate("data-tokens");
    await goToProject(
      page,
      `/projects/${projectId}?dataTokens=true&serverQueries=true`
    );
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("should flatten data token usages when the data token is deleted", async ({
    models,
  }) => {
    await models.studio.switchArena("Data Token Usages");
    await models.studio.turnOffDesignMode();
    await models.studio.interactiveSwitch.click();

    // Assert all content visible in canvas
    async function assertCanvasState() {
      await test.step("Assert canvas state", async () => {
        const INITIAL_NUM_TOKEN_VALUE = 20;
        const expectedTextInCanvas = [
          "Hello World",
          "nested value",
          "Hello World / Hello World",
          "nested value / nested value",
          "This text should be visible",
          "This text should be visible",
          "Sam",
          "Mat",
          "Bob",
          "This text uses data tokens in its onClick interaction",
          "Mock message 1",
          "Mock message 2",
          "This element uses data tokens in its html attributes",
          `States: Hello World / Hello World / ${INITIAL_NUM_TOKEN_VALUE}`,
          "This link uses data tokens in its query params / fragment / other props",
        ].join("");
        const canvas = models.studio.componentFrame;

        await expect(canvas.locator("body")).toHaveText(expectedTextInCanvas);

        // Assert link href - use getByRole to find the anchor directly
        const link = canvas.getByRole("link", {
          name: "This link uses data tokens in its query params / fragment / other props",
        });
        await expect(link).toHaveAttribute(
          "href",
          "/data-token-usages?query1=20&query2=true#Hello"
        );

        const clickableText = canvas.getByText(
          "This text uses data tokens in its onClick interaction"
        );

        await clickableText.click();

        await expect(canvas.locator("body")).toHaveText(
          expectedTextInCanvas.replace(
            `${INITIAL_NUM_TOKEN_VALUE}`,
            `${INITIAL_NUM_TOKEN_VALUE + 1}`
          )
        );

        await expect(
          canvas.locator(
            `#text-with-class-attribute[class*="Hello WorldHello World"]`
          )
        ).toBeVisible();
      });
    }

    await assertCanvasState();

    await models.studio.leftPanel.switchToDataTokensTab();
    await models.studio.leftPanel.dataTokensPanelContent
      .locator("li")
      .nth(1)
      .click({ button: "right" });
    await models.studio.frame.getByText("Start bulk selection").click();
    await models.studio.leftPanel.dataTokensPanelContent
      .getByText("Select all")
      .click();
    await models.studio.leftPanel.dataTokensPanelContent
      .locator(`button[title="Delete selected assets"]`)
      .click();
    await models.studio.frame
      .locator(".ant-modal-content")
      .getByText("Confirm")
      .click();

    await assertCanvasState();
  });
});
