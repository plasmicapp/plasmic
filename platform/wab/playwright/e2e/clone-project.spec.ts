import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

test.describe("clone project", () => {
  let projectId: string;
  let clonedProjectId: string;

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
    await apiClient.removeProjectAfterTest(
      clonedProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("should clone project with dependency data tokens", async ({
    page,
    models,
    apiClient,
  }) => {
    const expectedText = [
      "Hello!",
      "999",
      "test code",
      "This is a second dep!",
      "Dep1",
      "Hello!",
      "1234",
      "Dep2",
      "This is a second dep!",
      "Component 1: Hello!",
    ].join("");

    projectId = await apiClient.setupProjectFromTemplate("clone-project");

    // Verify expected text in original project
    await goToProject(page, `/projects/${projectId}`);
    await models.studio.switchArena("P1");

    // Assert text in canvas
    const originalCanvas = models.studio.componentFrame;
    await expect(originalCanvas.locator("body")).toHaveText(expectedText);

    // Assert text in preview
    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toHaveText(expectedText);
    });

    await page.goto("/projects/", { timeout: 30000 });
    const projectLink = page.locator(`a[href="/projects/${projectId}"]`);

    // Clone project from projects list
    await projectLink
      .locator('button[title="More…"]')
      .click({ timeout: 30000 });
    await page.getByText("Duplicate project").click();

    // Select a workspace and click duplicate
    await page.locator(".prompt-modal #select").click();
    await page
      .locator('div[role="option"]')
      .getByText("Plasmic's First Workspace")
      .click();
    await page.locator('button:has-text("Duplicate")').click();

    // Wait for navigation to the cloned project
    await waitForFrameToLoad(page);

    // Extract the cloned project ID from the URL
    const match = page.url().match(/\/projects\/([^?/]+)/);
    expect(match).toBeTruthy();
    clonedProjectId = match![1];

    // Ensure we're on the cloned project page, not the original
    expect(clonedProjectId).not.toBe(projectId);

    await models.studio.switchArena("P1");

    // Assert text in canvas
    const canvas = models.studio.componentFrame;
    await expect(canvas.locator("body")).toHaveText(expectedText);

    // Assert text in preview
    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toHaveText(expectedText);
    });
  });
});
