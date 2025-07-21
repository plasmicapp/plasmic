import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";

const BUNDLE_NAME = "state-management";

test.describe("state-management-text-interactions", () => {
  let projectId: string;
  test.beforeEach(async ({ request, apiClient, page, context, env }) => {
    await apiClient.login(env.testUser.email, env.testUser.password);
    projectId = await apiClient.importProjectFromTemplate(bundles[BUNDLE_NAME]);

    const cookies = await request.storageState();

    await context.addCookies(cookies.cookies);
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ env, apiClient }) => {
    if (projectId) {
      await apiClient.removeProject(
        projectId,
        env.testUser.email,
        env.testUser.password
      );
    }
  });

  test("can create all types of text interactions", async ({
    models,
    arenas,
  }) => {
    //GIVEN
    await models.studio.switchArena("text interactions");
    //WHEN
    await arenas.textInteractionsArena.setToButton.click({ force: true });
    await models.studio.sidebar.addInteraction("onClick", {
      actionName: "updateVariable",
      args: {
        variable: ["textVar"],
        operation: "newValue",
        value: '"goodbye"',
      },
    });

    await arenas.textInteractionsArena.clearButton.click({ force: true });
    await models.studio.sidebar.addInteraction("onClick", {
      actionName: "updateVariable",
      args: {
        variable: ["textVar"],
        operation: "clearValue",
      },
    });

    //THEN
    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toBeVisible();
      await expect(liveFrame.getByText("hello")).toBeVisible();
      await liveFrame.getByRole("button", { name: 'Set to "goodbye"' }).click();
      await expect(
        liveFrame.getByText("goodbye", { exact: true })
      ).toBeVisible();
      await liveFrame.getByRole("button", { name: "Clear" }).click();
      await expect(liveFrame.getByText("undefined")).toBeVisible();
    });
  });
});
