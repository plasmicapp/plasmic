import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { importProjectFromTemplate } from "../utils/import-project-from-template";
import { login } from "../utils/login";
import { removeProject } from "../utils/remove-project";
import { findFrameByText } from "../utils/find-frame-by-text";
import { Operations } from "../types/interaction";

const BUNDLE_NAME = "state-management";

test.describe("state-management-text-interactions", () => {
  let projectId: string;
  test.beforeEach(async ({ request: apiRequest, page, context, env }) => {
    await login(
      apiRequest,
      env.baseUrl,
      env.testUser.email,
      env.testUser.password
    );
    projectId = await importProjectFromTemplate(
      apiRequest,
      bundles[BUNDLE_NAME]
    );

    const cookies = await apiRequest.storageState();

    await context.addCookies(cookies.cookies);
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ request: apiRequest, env }) => {
    if (projectId) {
      await removeProject(
        apiRequest,
        env.baseUrl,
        projectId,
        env.testUser.email,
        env.testUser.password
      );
    }
  });

  test("can create all types of text interactions", async ({ pages, page }) => {
    //GIVEN
    await pages.projectPage.switchArena("text interactions");

    //WHEN
    const contentFrame = await findFrameByText(page, "Set to");
    await contentFrame
      .locator("span", { hasText: "Set to" })
      .first()
      .click({ force: true });
    await pages.projectPage.addInteraction("onClick", {
      actionName: "updateVariable",
      args: {
        variable: ["textVar"],
        operation: Operations.NEW_VALUE,
        value: '"goodbye"',
      },
    });

    await contentFrame.locator("text=Clear variable").click({ force: true });
    await pages.projectPage.addInteraction("onClick", {
      actionName: "updateVariable",
      args: {
        variable: ["textVar"],
        operation: Operations.CLEAR_VALUE,
      },
    });

    //THEN
    await pages.projectPage.withinLiveMode(async (liveFrame) => {
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
