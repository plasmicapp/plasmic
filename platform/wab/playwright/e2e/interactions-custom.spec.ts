import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { goToProject } from "../utils/studio-utils";

const BUNDLE_NAME = "state-management";

// Interactions not working properly in playwright test
test.describe.skip("state-management-custom-interactions", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.importProjectFromTemplate(bundles[BUNDLE_NAME]);

    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create page navigation and custom function interactions", async ({
    models,
    page,
  }) => {
    await models.studio.switchArena("page navigation interactions");
    await models.studio.waitStudioLoaded();

    const contentFrame = models.studio.frame
      .locator("iframe")
      .first()
      .contentFrame();

    await contentFrame.locator("text=Go to page1").click({ force: true });

    await models.studio.rightPanel.addNavigationInteraction("onClick", {
      destination: "/page1",
    });

    await contentFrame
      .locator("text=Go to page2")
      .first()
      .click({ force: true });

    await models.studio.rightPanel.addNavigationInteraction("onClick", {
      destination: "`/page2/foo`",
      isDynamicValue: true,
    });
    await page.waitForTimeout(100_000);

    await contentFrame
      .locator("text=Go to page2 (dynamic value)")
      .click({ force: true });

    await models.studio.rightPanel.addNavigationInteraction("onClick", {
      destination: "`/page2/${$state.count}`",
      isDynamicValue: true,
    });

    await models.studio.withinLiveMode(async (liveFrame) => {
      await liveFrame.locator("text=Go to page1").click();
      await expect(liveFrame.getByText("This is page 1")).toBeVisible();
      await liveFrame.locator("text=Go back").click();

      await liveFrame.locator("text=Go to page2").first().click();
      await expect(liveFrame.getByText("This is page 2:  foo")).toBeVisible();
      await liveFrame.locator("text=Go back").click();

      await liveFrame.locator("text=Increment").click();
      await liveFrame.locator("text=Go to page2 (dynamic value)").click();
      await expect(liveFrame.getByText("This is page 2:  6")).toBeVisible();
      await liveFrame.locator("text=Go back").click();

      await liveFrame.locator("text=Increment").click();
      await liveFrame.locator("text=Increment").click();
      await liveFrame.locator("text=Go to page2 (dynamic value)").click();
      await expect(liveFrame.getByText("This is page 2:  7")).toBeVisible();
      await liveFrame.locator("text=Go back").click();
    });

    await models.studio.switchArena("custom function interactions");
    await models.studio.waitStudioLoaded();

    const contentFrame2 = models.studio.frame
      .locator("iframe")
      .nth(1)
      .contentFrame();

    await contentFrame2.locator("text=custom increment").click({ force: true });

    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "customFunction",
        args: {
          customFunction: `$state.count++;`,
        },
      },
    ]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await liveFrame.locator("text=custom increment").click();
      await expect(liveFrame.getByText("6")).toBeVisible();
    });
  });
});
