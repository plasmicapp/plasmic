import { expect, FrameLocator } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

const DESKTOP_TEXT = "This text is visible on Deskop screen size only";
const SMALL_SCREEN_TEXT =
  "This text is visible on Tablet and mobile screens only";

test.describe("Active Screen Variants", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    // This project has a global variant group, and imports a dep project with a screen variant group
    // The dep project's screen variant group is active
    // This test asserts that the canvas and live preview (codegen) are both able to use the active screen variant group
    projectId = await apiClient.setupProjectFromTemplate(
      "active-screen-variant-group"
    );
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("should show active screen variant text in canvas and live preview", async ({
    page,
    models,
  }) => {
    async function assertDesktopText(frame: FrameLocator) {
      await expect(frame.getByText(DESKTOP_TEXT)).toBeVisible();
      await expect(frame.getByText(DESKTOP_TEXT)).toHaveCSS(
        "color",
        "rgb(255, 0, 0)"
      );
      await expect(frame.getByText(SMALL_SCREEN_TEXT)).not.toBeVisible();
    }

    async function assertSmallScreenText(frame: FrameLocator) {
      await expect(frame.getByText(SMALL_SCREEN_TEXT)).toBeVisible();
      await expect(frame.getByText(SMALL_SCREEN_TEXT)).toHaveCSS(
        "color",
        "rgb(0, 0, 255)"
      );
      await expect(frame.getByText(DESKTOP_TEXT)).not.toBeVisible();
    }

    await models.studio.waitStudioLoaded();

    await models.studio.turnOffDesignMode();

    const artboardFrame = models.studio.componentFrame;

    await assertDesktopText(artboardFrame);

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.globalVariantsHeader.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.selectVariant("Tablet");

    await assertSmallScreenText(artboardFrame);

    await models.studio.rightPanel.selectVariant("Mobile");

    await assertSmallScreenText(artboardFrame);

    // Test desktop width in live preview
    await goToProject(
      page,
      `/projects/${projectId}/preview/#width=1600&height=900`
    );
    await assertDesktopText(models.studio.liveFrame);

    // Test tablet width in live preview
    await goToProject(
      page,
      `/projects/${projectId}/preview/#width=1000&height=800`
    );
    await assertSmallScreenText(models.studio.liveFrame);

    // Test mobile width in live preview
    await goToProject(
      page,
      `/projects/${projectId}/preview/#width=500&height=800`
    );
    await assertSmallScreenText(models.studio.liveFrame);
  });
});
