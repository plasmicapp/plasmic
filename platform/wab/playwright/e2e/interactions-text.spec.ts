import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { TextInteractionsArena } from "../pages/arenas/text-interactions";

const BUNDLE_NAME = "state-management";

test.describe("state-management-text-interactions", () => {
  let projectId: string;
  test.beforeEach(async ({ request, apiClient, page, context }) => {
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
    page,
  }) => {
    //GIVEN
    await models.studio.switchArena("text interactions");
    const arena = await TextInteractionsArena.init(page);
    //WHEN
    await arena.setToButton.click({ force: true });
    await models.studio.sidebar.addInteraction("onClick", {
      actionName: "updateVariable",
      args: {
        variable: ["textVar"],
        operation: "newValue",
        value: '"goodbye"',
      },
    });

    await arena.clearButton.click({ force: true });
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
