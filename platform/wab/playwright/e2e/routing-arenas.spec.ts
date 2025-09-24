import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("routing", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProject(projectId);
    }
  });

  test("should switch arenas", async ({ models, page, apiClient }) => {
    projectId = await apiClient.setupNewProject({
      name: "routing-arenas",
    });

    await page.goto(`/projects/${projectId}`);
    await models.studio.waitForFrameToLoad();

    await expect(page).toHaveURL(
      new RegExp(
        `/-/Custom-arena-1\\?arena_type=custom&arena=Custom%20arena%201`
      )
    );

    const projNavButton = models.studio.frame.locator("#proj-nav-button");
    await projNavButton.click();
    await page.waitForTimeout(1000);

    const selectedArenaItem = models.studio.frame
      .locator(
        ".src-wab-client-plasmic-plasmic_kit_new_design_system_former_style_controls-PlasmicRowItem-module__rootisSelected-l93xlm"
      )
      .filter({ hasText: "Custom arena 1" });

    await selectedArenaItem.waitFor({ state: "visible", timeout: 5000 });
    await selectedArenaItem.click({ button: "right" });
    await page.waitForTimeout(500);

    const renameOption = models.studio.frame.locator(
      'li[data-menu-id="proj-item-menu-rename"]'
    );
    await renameOption.waitFor({ state: "visible", timeout: 5000 });
    await renameOption.click();

    await page.waitForTimeout(500);
    await page.keyboard.type("FirstArena");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(1000);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(
      new RegExp(`/-/FirstArena\\?arena_type=custom&arena=FirstArena`)
    );

    await models.studio.leftPanel.insertNode("New page");
    await models.studio.leftPanel.setComponentName("My/Page");
    await page.waitForTimeout(2000);

    await models.studio.leftPanel.addComponent("MyComponent");
    await page.waitForTimeout(1000);

    await models.studio.projectPanel();
    const myComponentItem = models.studio.frame
      .locator(
        ".src-wab-client-plasmic-plasmic_kit_new_design_system_former_style_controls-PlasmicRowItem-module__root-HS42rE"
      )
      .filter({ hasText: "MyComponent" });
    await myComponentItem.click();

    await expect(page).toHaveURL(
      new RegExp(`/-/MyComponent\\?arena_type=component&arena=`)
    );

    await models.studio.projectPanel();
    const myPageItem = models.studio.frame
      .locator(
        ".src-wab-client-plasmic-plasmic_kit_new_design_system_former_style_controls-PlasmicRowItem-module__root-HS42rE"
      )
      .filter({ hasText: "/my/page" });
    await myPageItem.click();

    await expect(page).toHaveURL(
      new RegExp(`/-/My-Page\\?arena_type=page&arena=`)
    );

    await page.goto(`/projects/${projectId}`);
    await models.studio.waitForFrameToLoad();

    await expect(page).toHaveURL(
      new RegExp(`/-/FirstArena\\?arena_type=custom&arena=FirstArena`)
    );

    const projNavButtonCheck = models.studio.frame.locator("#proj-nav-button");
    await expect(projNavButtonCheck).toContainText("FirstArena");

    await page.goto(
      `/projects/${projectId}/-/NonExistentArena?arena_type=arena&arena=NonExistentArena`
    );
    await models.studio.waitForFrameToLoad();

    await expect(page).toHaveURL(
      new RegExp(`/-/FirstArena\\?arena_type=custom&arena=FirstArena`)
    );

    const projNavButtonCheck2 = models.studio.frame.locator("#proj-nav-button");
    await expect(projNavButtonCheck2).toContainText("FirstArena");
  });
});
