import { expect } from "@playwright/test";
import * as fs from "fs";
import * as pathModule from "path";
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
    // We need to setup a project with the strapi hostless package to test data tokens created from server queries in one of the below test cases
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "strapi",
        npmPkg: ["@plasmicpkgs/strapi"],
      },
    });
    await goToProject(
      page,
      `/projects/${projectId}?dataTokens=true&plexus=true&serverQueries=true`
    );
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("Data tokens can be created from left panel and used in dynamic values", async ({
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

  test.describe("Data tokens can be created by right-clicking user input controls", () => {
    test("can create data token from text content", async ({
      models,
      page,
    }) => {
      await models.studio.leftPanel.createNewPage("TestPage");

      await models.studio.leftPanel.insertText();
      await models.studio.renameTreeNode("welcome-text");
      // set a static text content
      await models.studio.rightPanel.textContentButton.click();
      await models.studio.page.keyboard.insertText("Welcome back!");
      await models.studio.page.keyboard.press("Escape");
      const targetElement = models.studio.rightPanel.frame.locator(
        '[data-test-id="text-content"]'
      );
      // right-click on the text content to create a data token
      await targetElement.locator("label").click({ button: "right" });
      await models.studio.createDataTokenButton.click();
      const dataTokenPopover = await models.studio.getDataTokenPopoverForTarget(
        targetElement
      );

      const expectedType = "Text";
      const expectedValue = "Welcome back!";
      const expectedJsName = "welcomeText";
      const expectedName = "Welcome text";
      // the data token name and value should be pre-filled
      await dataTokenPopover.expectDataToken({
        expectedName,
        expectedJsName,
        expectedType,
        expectedValue,
      });

      const newExpectedName = expectedName + " 2";
      const newExpectedJsName = expectedJsName + "2";
      await dataTokenPopover.getTitleInput().fill(newExpectedName);
      await dataTokenPopover.getTitleInput().blur();

      await dataTokenPopover.expectDataToken({
        expectedName: newExpectedName,
        expectedJsName: newExpectedJsName,
        expectedType,
        expectedValue,
      });

      await page.waitForTimeout(500);
      await dataTokenPopover.close();

      await models.studio.leftPanel.assertDataTokenExists("Welcome Text 2");
    });

    test("can create data token from component props", async ({
      models,
      page,
    }) => {
      const PROP_INFO = [
        {
          displayName: "ARIA label",
          jsName: "ariaLabel",
          type: "Text",
          newTextValue: "Call to action",
        },
        {
          displayName: "Output text",
          jsName: "outputText",
          type: "Text",
          initialValue: "",
          editDataTokenValue: "output value",
        },
        {
          displayName: "Initial value",
          jsName: "initialValue",
          type: "Number",
          initialValue: "50",
        },
        {
          displayName: "Show label",
          jsName: "showLabel",
          type: "Code Expression",
          initialValue: "true",
        },
        {
          displayName: "Show description",
          jsName: "showDescription",
          type: "Code Expression",
          initialValue: "false",
        },
      ];
      await models.studio.leftPanel.createNewPage("TestPage");
      await models.studio.leftPanel.insertNode("Slider");

      for (const propInfo of PROP_INFO) {
        const propRow = await models.studio.rightPanel.frame.locator(
          `[data-test-id="prop-editor-row-${propInfo.displayName}"]`
        );

        await propRow.scrollIntoViewIfNeeded();

        const prefilledValue = propInfo.initialValue ?? propInfo.newTextValue;
        if (propInfo.newTextValue) {
          await propRow
            .locator(`[data-plasmic-prop="${propInfo.displayName}"]`)
            .click();
          await models.studio.page.keyboard.type(propInfo.newTextValue);
          await models.studio.page.keyboard.press("Enter");
        }
        // right-click on the text content to create a data token
        await propRow.locator("label").nth(0).click({ button: "right" });
        await models.studio.createDataTokenButton.click();
        const dataTokenPopover =
          await models.studio.getDataTokenPopoverForTarget(propRow);

        // the data token name and value should be pre-filled
        const isCodeType = propInfo.type === "Code Expression";
        await dataTokenPopover.expectDataToken({
          expectedName: propInfo.displayName,
          expectedType: propInfo.type,
          expectedValue: prefilledValue,
          expectedJsName: propInfo.jsName,
          isCodeType,
        });

        if (!isCodeType && propInfo.editDataTokenValue) {
          const input = dataTokenPopover.getValueInput();
          await input.type(propInfo.editDataTokenValue);
          await expect(input).toHaveValue(propInfo.editDataTokenValue);
        }

        const newExpectedName = propInfo.displayName + " 2";
        const newExpectedJsName = propInfo.jsName + "2";
        await dataTokenPopover.getTitleInput().fill(newExpectedName);
        await dataTokenPopover.getTitleInput().blur();
        await dataTokenPopover.expectDataToken({
          expectedName: newExpectedName,
          expectedJsName: newExpectedJsName,
          expectedType: propInfo.type,
          expectedValue: propInfo.editDataTokenValue ?? prefilledValue,
          isCodeType,
        });

        await page.waitForTimeout(500);
        await dataTokenPopover.close();

        await models.studio.leftPanel.assertDataTokenExists(newExpectedName);
      }
    });

    test("can create data token from server query", async ({
      models,
      page,
    }) => {
      const mockStrapiHost = "https://mock-strapi-host.com";
      const mockStrapiCollection = "restaurants";
      // Mock the specific Strapi restaurants endpoint
      await page.route(
        `${mockStrapiHost}/api/${mockStrapiCollection}*`,
        async (route) => {
          const fixturePath = pathModule.join(
            __dirname,
            "../../cypress/fixtures/strapi-v5-restaurants.json"
          );
          const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(fixtureData),
          });
        }
      );

      await models.studio.leftPanel.createNewPage("TestPage");
      await models.studio.rightPanel.clickPageData();

      await models.studio.rightPanel.addServerQueryButton.click();
      await models.studio.rightPanel.serverQueriesSection
        .locator(`[data-plasmic-role="labeled-item"]`)
        .last()
        .click();
      const serverQueryModal = models.studio.serverQueryBottomModal;
      await serverQueryModal.waitFor();
      const previewResult = serverQueryModal.locator(".code-preview-inner");

      await expect(previewResult).not.toContainText("data: Array(7)");
      const strapiHostRow = serverQueryModal.locator(
        `[data-test-id="prop-editor-row-strapiHost"]`
      );
      const strapiCollectionRow = serverQueryModal.locator(
        `[data-test-id="prop-editor-row-collection"]`
      );
      const strapiHostInput = strapiHostRow.locator(
        `[data-plasmic-prop="strapiHost"]`
      );

      await strapiHostInput.click();
      await models.studio.page.keyboard.type(mockStrapiHost);
      await strapiHostInput.click({ button: "right" });

      await models.studio.createDataTokenButton.click();
      let dataTokenPopover = await models.studio.getDataTokenPopoverForTarget(
        strapiHostRow
      );

      const expectedName = "Strapi host";
      const expectedJsName = "strapiHost";
      const expectedType = "Text";
      await dataTokenPopover.expectDataToken({
        expectedName,
        expectedJsName,
        expectedType,
        expectedValue: mockStrapiHost,
      });
      const newExpectedName = expectedName + " 2";
      const newExpectedJsName = expectedJsName + "2";
      await dataTokenPopover.getTitleInput().fill(newExpectedName);
      await dataTokenPopover.getTitleInput().blur();
      await dataTokenPopover.expectDataToken({
        expectedName: newExpectedName,
        expectedJsName: newExpectedJsName,
        expectedType,
        expectedValue: mockStrapiHost,
      });
      await page.waitForTimeout(500);
      await dataTokenPopover.close();

      const strapiCollectionInput = strapiCollectionRow.locator(
        `[data-plasmic-prop="collection"]`
      );
      await strapiCollectionInput.click();
      await page.waitForTimeout(200);
      await models.studio.page.keyboard.type(mockStrapiCollection);
      await strapiCollectionInput.click({ button: "right" });
      await models.studio.createDataTokenButton.click();
      dataTokenPopover = await models.studio.getDataTokenPopoverForTarget(
        strapiCollectionRow
      );
      await dataTokenPopover.expectDataToken({
        expectedName: "Collection",
        expectedType: "Text",
        expectedValue: mockStrapiCollection,
        expectedJsName: "collection",
      });
      await page.waitForTimeout(500);
      await dataTokenPopover.close();
      const strapiCollectionCodeInput =
        strapiCollectionRow.locator(".code-editor-input");
      await strapiCollectionCodeInput.waitFor({ state: "visible" });
      await expect(strapiCollectionCodeInput).toHaveText(
        `$dataTokens.collection`
      );

      await serverQueryModal.locator("button").getByText("Execute").click();
      await expect(previewResult).toContainText("data: Array(7)");
      await serverQueryModal.locator("button").getByText("Save").click();
      await serverQueryModal.waitFor({ state: "hidden" });
      await models.studio.leftPanel.assertDataTokenExists(newExpectedName);
      await models.studio.leftPanel.assertDataTokenExists("Collection");
    });
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
