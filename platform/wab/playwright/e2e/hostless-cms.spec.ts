import { expect } from "@playwright/test";
import { v4 } from "uuid";
import { test } from "../fixtures/test";

test.describe("hostless-cms", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test("can create cms with data, fetch using hostless package, change model", async ({
    page,
    apiClient,
    models,
  }) => {
    const cmsName = `CMS ${v4()}`;

    await page.goto("/projects/", { timeout: 120000 });

    await page.locator("text=Plasmic's First Workspace").click();
    await page.locator("text=Integrations").click();
    await page.locator("text=New CMS").click();

    await page.locator('[data-test-id="prompt"]').click();
    await page.keyboard.type(cmsName);
    await page.locator('[data-test-id="prompt-submit"]').click();

    await page.locator('[data-test-id="cmsModels"]').click();
    await page
      .locator('[data-test-id="addModelButton"]')
      .waitFor({ state: "visible" });
    await page.locator('[data-test-id="addModelButton"]').click();
    await page.locator('[data-test-id="prompt"]').waitFor({ state: "visible" });
    await page.locator('[data-test-id="prompt"]').click();
    await page.keyboard.type("First model");
    await page.locator('[data-test-id="prompt-submit"]').click();

    await page.locator("text=Add field").waitFor({ state: "visible" });
    await page.locator("text=Add field").click();
    await page.locator("text=newField").waitFor({ state: "visible" });
    await page.locator("text=newField").click();
    await page
      .locator("#schema_fields_0_identifier")
      .waitFor({ state: "visible" });
    await page.locator("#schema_fields_0_identifier").dblclick();
    await page.waitForTimeout(500);
    await page.keyboard.press("Backspace");
    await page.keyboard.type("first field");
    await page.waitForTimeout(1000);

    await page.locator("text=Add field").click();
    await page.waitForTimeout(1000);
    await page.locator("text=newField").last().click();
    await page.waitForTimeout(1000);
    await page.locator("#schema_fields_1_identifier").dblclick();
    await page.waitForTimeout(500);
    await page.keyboard.press("Backspace");
    await page.keyboard.type("second field");
    await page.waitForTimeout(1000);
    await page.locator("text=Save").click({ force: true });
    await expect(page.locator("text=Saved!")).toBeVisible();
    await page.locator('[data-test-id="cmsContent"]').click();
    await page.locator('[data-test-id="addEntryButton"]').click();
    const firstFieldInput = page.locator('input[id*="first"]').first();
    await firstFieldInput.waitFor({ state: "visible" });
    await firstFieldInput.click();
    await page.keyboard.type("1 - first");
    const secondFieldInput = page.locator('input[id*="second"]').first();
    await secondFieldInput.click();
    await page.keyboard.type("1 - second");
    await page.locator('button:has-text("Publish")').click();
    await expect(
      page.locator("text=Your changes have been published.")
    ).toBeVisible();

    await page.locator('[data-test-id="addEntryButton"]').click();
    await expect(page.locator("text=Untitled entry").last()).toBeVisible();
    const firstFieldInput2 = page.locator('input[id*="first"]').first();
    await firstFieldInput2.waitFor({ state: "visible" });
    await firstFieldInput2.click();
    await page.keyboard.type("2 - first");
    const secondFieldInput2 = page.locator('input[id*="second"]').first();
    await secondFieldInput2.click();
    await page.keyboard.type("2 - second");
    await page.locator('button:has-text("Publish")').click();
    await expect(
      page.locator("text=Your changes have been published.")
    ).toBeVisible();

    await page.locator('[data-test-id="cmsSettings"]').click();
    const cmsId =
      (await page.locator('[data-test-id="databaseId"]').textContent()) || "";
    const cmsPublicToken =
      (await page.locator('[data-test-id="publicToken"]').textContent()) || "";
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "plasmic-cms",
        npmPkg: ["@plasmicpkgs/plasmic-cms"],
      },
    });
    await page.goto(`/projects/${projectId}`);
    await models.studio.waitForFrameToLoad();
    const settingsGroupButton = models.studio.leftPanel.frame.locator(
      '[data-test-tabkey="settingsGroup"]'
    );
    await settingsGroupButton.click();
    const settingsButton = models.studio.leftPanel.frame.locator(
      '[data-test-tabkey="settings"]'
    );
    await settingsButton.waitFor({ state: "visible" });
    await settingsButton.click();
    await models.studio.leftPanel.frame
      .locator("text=CMS Credentials Provider")
      .waitFor({ state: "visible" });
    await models.studio.leftPanel.frame
      .locator("text=CMS Credentials Provider")
      .click();
    await page.waitForTimeout(1000);

    await models.studio.rightPanel.frame
      .locator('#sidebar-modal button[data-test-id="collapse"]')
      .click({ timeout: 1000, force: true });
    await page.waitForTimeout(500);

    const hostUrl = "http://localhost:3003";
    const hostInput = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="host"]'
    );
    await hostInput.waitFor({ state: "visible", timeout: 5000 });
    await hostInput.click();
    await page.waitForTimeout(200);
    await hostInput.click({ clickCount: 3 });
    await page.waitForTimeout(200);
    await page.keyboard.type(hostUrl);
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await models.studio.rightPanel.setDataPlasmicProp("databaseId", cmsId!);
    await models.studio.rightPanel.setDataPlasmicProp(
      "databaseToken",
      cmsPublicToken!
    );
    await models.studio.leftPanel.treeTabButton.click();
    await page.waitForTimeout(500);
    const framed = await models.studio.createNewFrame();
    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.insertNode(
      "hostless-plasmic-cms-query-repeater"
    );
    await page.waitForTimeout(2000);
    const frameContent = framed.contentFrame();
    await expect(frameContent.locator("body")).toContainText("1 - first");
    await expect(frameContent.locator("body")).toContainText("2 - first");
    const cmsDataFetcherLabel = models.studio.leftPanel.frame
      .locator('.tpltree__nodeLabel__summary:has-text("CMS Data Fetcher")')
      .first();
    await cmsDataFetcherLabel.click();
    await page.waitForTimeout(500);
    await cmsDataFetcherLabel.press("Control+r");
    await page.waitForTimeout(200);
    await page.keyboard.type("CMS Container");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await models.studio.leftPanel.selectTreeNode([
      "Slot",
      "CMS Container",
      "CMS Entry Field",
    ]);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const fieldSelector = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="field"]'
    );
    await fieldSelector.waitFor({ state: "visible", timeout: 5000 });
    await fieldSelector.click();
    await page.waitForTimeout(500);
    const secondFieldOption = models.studio.rightPanel.frame.locator(
      '[role="option"]:has-text("secondField")'
    );
    await secondFieldOption.waitFor({ state: "visible", timeout: 5000 });
    await secondFieldOption.click();

    await page.waitForTimeout(500);
    await models.studio.leftPanel.selectTreeNode(["CMS Data Fetcher"]);
    await page.waitForTimeout(500);
    await expect(frameContent.locator("body")).toContainText("1 - second");
    await expect(frameContent.locator("body")).toContainText("2 - second");
    await models.studio.rightPanel.checkNoErrors();
    const framed2 = await models.studio.createNewFrame();
    await models.studio.focusFrameRoot(framed2);
    await models.studio.leftPanel.insertNode(
      "hostless-plasmic-cms-query-repeater"
    );
    await page.waitForTimeout(2000);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    const cmsDataFetcherLabel2 = models.studio.leftPanel.frame
      .locator('.tpltree__nodeLabel__summary:has-text("CMS Data Fetcher")')
      .first();
    await cmsDataFetcherLabel2.click();
    await page.waitForTimeout(500);
    await cmsDataFetcherLabel2.press("Control+r");
    await page.waitForTimeout(200);
    await page.keyboard.type("CMS Container");
    await page.keyboard.press("Enter");
    await models.studio.leftPanel.selectTreeNode([
      "Slot",
      "CMS Container",
      "CMS Entry Field",
    ]);
    await page.keyboard.press("Delete");
    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(1000);
    await page.waitForTimeout(500);
    const textContentLabel = models.studio.rightPanel.frame.locator(
      '[data-test-id="text-content"] label'
    );
    await textContentLabel.waitFor({ state: "visible" });
    await textContentLabel.click({ button: "right" });
    await page.waitForTimeout(500);
    const useDynamicValueOption = models.studio.frame.locator(
      "text=Use dynamic value"
    );
    await useDynamicValueOption.waitFor({ state: "visible" });
    await useDynamicValueOption.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.selectPathInDataPicker([
      "plasmicCmsFirstModelItem",
      "data",
      "firstField",
    ]);
    await models.studio.leftPanel.selectTreeNode(["CMS Data Fetcher"]);
    const frameContent2 = framed2.contentFrame();
    await expect(frameContent2.locator("body")).toContainText("1 - first");
    await expect(frameContent2.locator("body")).toContainText("2 - first");
    await models.studio.rightPanel.checkNoErrors();
  });
});
