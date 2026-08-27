import { expect } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

// PLA-12459: the "plume" key in uiConfig.canInsertHostless ("Plasmic
// Customizable Components") must gate the Plexus installable in the insert
// panel, and disabling the component store entirely must hide it too.
test.describe("ui-config-hostless", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient }) => {
    projectId = await apiClient.setupNewProject({ name: "ui-config-hostless" });
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  async function searchInsertPanel(models: PageModels, query: string) {
    const leftPanel = models.studio.leftPanel;
    if (!(await leftPanel.addContainer.isVisible())) {
      await leftPanel.addButton.click({ timeout: 30000 });
    }
    await leftPanel.addSearchInput.waitFor({ state: "visible" });
    await leftPanel.addSearchInput.fill(query);
  }

  function installableItem(models: PageModels) {
    return models.studio.leftPanel.frame.locator(
      'li[data-plasmic-add-item-name="Plasmic Design System"]'
    );
  }

  test("disabling component store hides installables", async ({
    apiClient,
    models,
    page,
  }) => {
    // plexus=true so the Design systems installables section renders
    await goToProject(page, `/projects/${projectId}?plexus=true`);
    await searchInsertPanel(models, "Plasmic Design System");
    await expect(installableItem(models)).toBeVisible();

    await apiClient.updateProjectMeta(projectId, {
      uiConfig: { canInsertHostless: false },
    });
    await goToProject(page, `/projects/${projectId}?plexus=true`);
    await searchInsertPanel(models, "Plasmic Design System");
    await expect(installableItem(models)).toHaveCount(0);
  });

  test("plume whitelist entry gates installables", async ({
    apiClient,
    models,
    page,
  }) => {
    await apiClient.updateProjectMeta(projectId, {
      uiConfig: { canInsertHostless: { plume: false } },
    });
    await goToProject(page, `/projects/${projectId}?plexus=true`);
    await searchInsertPanel(models, "Plasmic Design System");
    await expect(installableItem(models)).toHaveCount(0);

    // other component store packages are not affected by the plume key
    await searchInsertPanel(models, "More HTML elements");
    await expect(
      models.studio.leftPanel.frame.locator(
        'li[data-plasmic-add-item-name="More HTML elements"]'
      )
    ).toBeVisible();
  });
});
