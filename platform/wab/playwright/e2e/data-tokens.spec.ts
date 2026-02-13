import { expect } from "@playwright/test";
import * as fs from "fs";
import * as pathModule from "path";
import { test } from "../fixtures/test";
import { TestDataToken } from "../models/components/left-panel";
import { StudioModel } from "../models/studio-model";
import { importProject } from "../utils/import-utils";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

const DATA_TOKENS: TestDataToken[] = [
  {
    name: "My String Token",
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

async function selectTokenInDataPicker(
  studio: StudioModel,
  token: TestDataToken
) {
  const { name, depName, nestedPath } = token;
  const path = ["Data Tokens"];
  if (depName) {
    path.push(depName);
  }
  path.push(name);
  if (nestedPath) {
    path.push(...nestedPath);
  }
  await studio.rightPanel.selectPathInDataPicker(path);
}

async function replaceDataTokenInCurrentElement(
  studio: StudioModel,
  token: TestDataToken
) {
  await studio.rightPanel.frame
    .locator('[data-test-id="text-content"]')
    .locator(".code-editor-input")
    .click();
  await selectTokenInDataPicker(studio, token);
  return token.evaluatedValue ?? token.value;
}
test.describe("data token usages", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test.describe("from empty project", () => {
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
        await models.studio.leftPanel.createNewDataToken(tokenInfo);
        const tokenText = await replaceDataTokenInCurrentElement(
          models.studio,
          tokenInfo
        );

        // Check in component frame (canvas)
        await expect(
          models.studio.componentFrame.getByText(tokenText)
        ).toBeVisible();

        // Check in preview mode
        await models.studio.withinLiveMode(async (liveFrame) => {
          await expect(liveFrame.getByText(tokenText)).toBeVisible();
        });
      }
    });

    test("data tokens from imported projects", async ({
      apiClient,
      page,
      models,
    }) => {
      const setupProject = async (name: string) => {
        const newId = await apiClient.setupNewProject({ name });
        await goToProject(page, `/projects/${newId}?dataTokens=true`);
        await models.studio.createNewPage(`${name} Page`);
        await waitForFrameToLoad(page);
        return newId;
      };
      const depBString: TestDataToken = {
        name: "DepB String",
        depName: "[playwright] Dep B",
        type: "string",
        value: "hello from dep B",
      };
      const depBNumber: TestDataToken = {
        name: "DepB Number",
        depName: "[playwright] Dep B",
        type: "number",
        value: "111",
      };
      const bDepProjectId = await setupProject("Dep B");
      await models.studio.leftPanel.createNewDataToken(depBString);
      await models.studio.leftPanel.createNewDataToken(depBNumber);
      await models.studio.publishVersion("Data Tokens B");

      const depCCode: TestDataToken = {
        name: "DepC Code",
        type: "code",
        depName: "[playwright] Dep C",
        nestedPath: ["str"],
        evaluatedValue: "hello code",
        value: `
        const num = 5;
        const str = "hello code";
        return { num, str };
        `,
      };
      const cDepProjectId = await setupProject("Dep C");
      await models.studio.leftPanel.createNewDataToken(depCCode);
      await models.studio.publishVersion("Data Tokens C");

      await goToProject(page, `/projects/${projectId}?dataTokens=true`);
      const mainString: TestDataToken = {
        name: "Main String",
        type: "string",
        value: "hello from main",
      };
      const mainNumber: TestDataToken = {
        name: "Main Number",
        type: "number",
        value: "999",
      };
      await models.studio.leftPanel.createNewDataToken(mainString);
      await models.studio.leftPanel.createNewDataToken(mainNumber);

      await importProject(page, models.studio, bDepProjectId);
      await importProject(page, models.studio, cDepProjectId);

      await models.studio.createNewPage("Main Page");
      await waitForFrameToLoad(page);

      await test.step("verify tokens in left panel", async () => {
        await models.studio.leftPanel.switchToDataTokensTab();
        await models.studio.leftPanel.leftPane
          .locator(`[data-test-id="data-tokens-panel-expand-all"]`)
          .click();

        const expectedTokensList = [
          "Text",
          "Main String",
          "Dep B",
          "DepB String",
          "Number",
          "Main Number",
          "Dep B",
          "DepB Number",
          "Code Expression",
          "Dep C",
          "DepC Code",
        ];
        const listItems =
          models.studio.leftPanel.dataTokensPanelContent.locator("li");

        await expect(listItems).toHaveCount(expectedTokensList.length);

        for (let i = 0; i < expectedTokensList.length; i += 1) {
          await expect(listItems.nth(i)).toContainText(expectedTokensList[i]);
        }
      });
      const allTokens = [
        mainString,
        depBString,
        mainNumber,
        depBNumber,
        depCCode,
      ];

      await test.step("add all tokens to text fields", async () => {
        for (const token of allTokens) {
          await models.studio.leftPanel.insertText();

          await models.studio.rightPanel.frame
            .locator('[data-test-id="text-content"] label')
            .click({ button: "right" });
          await models.studio.useDynamicValueButton.click();
          await selectTokenInDataPicker(models.studio, token);
        }
      });

      await test.step("verify tokens in canvas", async () => {
        const expectedTextInCanvas = allTokens
          .map((token) => token.evaluatedValue ?? token.value)
          .join("");
        const canvas = models.studio.componentFrame;

        await expect(canvas.locator("body")).toHaveText(expectedTextInCanvas);
      });

      await test.step("verify tokens in preview", async () => {
        await models.studio.withinLiveMode(async (liveFrame) => {
          const previewValues = liveFrame.locator(
            ".plasmic_page_wrapper > div > div"
          );

          await expect(previewValues).toHaveCount(allTokens.length);

          for (let i = 0; i < allTokens.length; i += 1) {
            const value = allTokens[i].evaluatedValue ?? allTokens[i].value;
            await expect(previewValues.nth(i)).toContainText(value);
          }
        });
      });

      await apiClient.removeProjectAfterTest(
        bDepProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
      await apiClient.removeProjectAfterTest(
        cDepProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    });

    test("can create data token by right clicking text content", async ({
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
      await models.studio.createDataTokenForRow(targetElement.locator("label"));
      const dataTokenPopover = await models.studio.getDataTokenPopoverForTarget(
        targetElement,
        { waitForFocus: true }
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

    test("can create data token by right clicking component props", async ({
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
        const propRow = models.studio.rightPanel.frame.locator(
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
        await models.studio.createDataTokenForRow(
          propRow.locator("label").nth(0)
        );
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

    test("can create data token by right clicking server query prop", async ({
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
        `[data-test-id="prop-editor-row-host"]`
      );
      const strapiCollectionRow = serverQueryModal.locator(
        `[data-test-id="prop-editor-row-collection"]`
      );
      const strapiHostInput = strapiHostRow.locator(
        `[data-plasmic-prop="host"]`
      );

      await strapiHostInput.click();
      await models.studio.page.keyboard.type(mockStrapiHost);

      await models.studio.createDataTokenForRow(strapiHostInput);
      let dataTokenPopover = await models.studio.getDataTokenPopoverForTarget(
        strapiHostRow,
        { waitForFocus: true }
      );

      const expectedName = "Host";
      const expectedJsName = "host";
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
      await models.studio.createDataTokenForRow(strapiCollectionInput);
      dataTokenPopover = await models.studio.getDataTokenPopoverForTarget(
        strapiCollectionRow,
        { waitForFocus: true }
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

  test.describe("from bundle", () => {
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
});
