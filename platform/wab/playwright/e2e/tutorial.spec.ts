import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

const PROJECT_IDS = {
  "plasmic-nav": "7nJ7UcFmq9UzB6eXfC5z4a",
  "react-awesome-reveal": "58GpZjZCWTaJ8AUhpCwt2K",
  base: "8eH4mLFb7TqLYDMGjj5BLd",
};

test.describe("Table and form tutorial", () => {
  let clonedProjectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    await apiClient.setupProjectFromTemplate("tutorial-portfolio", {
      keepProjectIdsAndNames: true,
    });

    const cloneResult = await apiClient.cloneProject({
      projectId: PROJECT_IDS.base,
    });
    clonedProjectId = cloneResult.projectId;

    await goToProject(page, `/projects/${clonedProjectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    if (clonedProjectId) {
      await apiClient.removeProjectAfterTest(
        clonedProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }

    if (PROJECT_IDS.base) {
      await apiClient.deleteProjectAndRevisions(PROJECT_IDS.base);
    }
  });

  test("can start portfolio tutorial", async ({ page, models }) => {
    const frame = models.studio.frame;

    await expect(
      frame.getByText(
        "Let's learn how the Plasmic Studio works and build your portfolio main page in 3 minutes. 🚀"
      )
    ).toBeVisible({ timeout: 15_000 });

    await expect(frame.locator("#tour-popup-welcome")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-canvas-artboards")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-left-tab-strip")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-open-add-drawer")).toBeVisible();
    await models.studio.leftPanel.addButton.click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-insert-panel")).toBeVisible();

    // TODO: finish portfolio tutorial?
  });
});
