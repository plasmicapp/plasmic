import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("project-access", () => {
  test("does not allow other users to view project by default", async ({
    page,
    apiClient,
    context,
    request,
  }) => {
    await apiClient.login("user@example.com", "!53kr3tz!");
    const projectId = await apiClient.setupNewProject({
      name: "project-access",
      email: "user@example.com",
    });

    await page.waitForTimeout(1000);
    await page.context().clearCookies();
    await page.goto(`/projects/${projectId}`);

    await expect(page).toHaveURL(
      new RegExp(`/login\\?continueTo=%2Fprojects%2F${projectId}`),
      { timeout: 15_000 }
    );

    await page.context().clearCookies();
    await apiClient.login("user2@example.com", "!53kr3tz!");
    const cookies = await request.storageState();
    await context.addCookies(cookies.cookies);
    await page.goto(`/projects/${projectId}`);

    await expect(page.getByText("Could not open project")).toBeVisible({
      timeout: 15_000,
    });

    await apiClient.removeProjectAfterTest(
      projectId,
      "user@example.com",
      "!53kr3tz!"
    );
  });

  test("allows other users to view project if inviteOnly: false", async ({
    page,
    apiClient,
    context,
    request,
  }) => {
    await apiClient.login("user@example.com", "!53kr3tz!");
    const projectId = await apiClient.setupNewProject({
      name: "project-access",
      email: "user@example.com",
      inviteOnly: false,
    });

    await page.context().clearCookies();
    await page.goto(`/projects/${projectId}`);

    await expect(page).toHaveURL(
      new RegExp(`/login\\?continueTo=%2Fprojects%2F${projectId}`),
      { timeout: 15_000 }
    );

    await page.context().clearCookies();
    await apiClient.login("user2@example.com", "!53kr3tz!");
    const cookies = await request.storageState();
    await context.addCookies(cookies.cookies);
    await goToProject(page, `/projects/${projectId}`);

    await page.waitForSelector("iframe.studio-frame", {
      state: "attached",
      timeout: 15000,
    });

    await expect(
      page
        .frameLocator("iframe.studio-frame")
        .frameLocator("iframe.__wab_studio-frame")
        .getByText("You only have read permission to this project")
    ).toBeVisible({ timeout: 10000 });

    await apiClient.removeProjectAfterTest(
      projectId,
      "user@example.com",
      "!53kr3tz!"
    );
  });
});
