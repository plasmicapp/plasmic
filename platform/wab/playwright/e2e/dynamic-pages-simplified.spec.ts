import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("dynamic-pages-simplified", () => {
  let projectId: string;
  let dsname: string;

  test.beforeEach(async ({ apiClient, page, context, request }) => {
    dsname = `TutorialDB ${Date.now()}`;

    await apiClient.createTutorialDataSource("northwind", dsname);

    await apiClient.makeApiClient(
      request,
      context,
      "user2@example.com",
      "!53kr3tz!"
    );

    projectId = await apiClient.setupNewProject({ name: "dynamic-pages" });
    await page.goto(`/projects/${projectId}`);

    await page.waitForTimeout(5000);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("simplified works", async ({ page, models }) => {
    await models.studio.createNewPageInOwnArenaWithTemplate(
      "Greeter",
      "Dynamic page",
      async () => {
        await models.studio.rightPanel.pickDataSource(dsname);
        await models.studio.rightPanel.dynamicPageTableButton.click({
          force: true,
        });
        await models.studio.rightPanel.frame
          .getByLabel("public")
          .getByText("products")
          .click();

        await models.studio.rightPanel.waitForProductIdButton();
        await models.studio.rightPanel.clickCreateDynamicPageButton();
      }
    );

    const framed = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();

    await models.studio.rightPanel.clickPageData();

    const pagePathInput = await models.studio.rightPanel.getPagePathInput();
    await expect(pagePathInput).toHaveValue("/products/[product_id]");
    const selectedElt = framed.locator(".__wab_rich_text");
    await expect(selectedElt).toHaveText("1");

    const pageParamInput =
      await models.studio.rightPanel.getPageParamNameInput();
    await expect(pageParamInput).toHaveValue("1");

    await models.studio.rightPanel.clickViewDifferentRecord();
    await models.studio.rightPanel.clickShowFilters();
    await expect(models.studio.frame.getByText("Sort by")).toBeVisible();

    const viewButtons = await models.studio.rightPanel.getViewButtons();
    await expect(viewButtons).toHaveCount(10);
    await viewButtons.nth(1).click();

    await expect(selectedElt).toHaveText("2");
    await expect(pageParamInput).toHaveValue("2");
  });
});
