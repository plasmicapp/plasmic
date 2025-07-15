import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { Operations } from "../types/interaction";
import { findFrameByText } from "../utils/frame";

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

  test("can create all types of text interactions", async ({ pages, page }) => {
    //GIVEN
    const TEST_DATA = {
      arenaName: "text interactions",
      setToText: "Set to",
      updateVariableAction: "updateVariable",
      textVarName: "textVar",
      goodbyeValue: '"goodbye"',
      goodbyeText: "goodbye",
      clearVariableSelector: "Clear variable",
      helloText: "hello",
      setToGoodbyeButtonName: 'Set to "goodbye"',
      clearButtonName: "Clear",
      undefinedText: "undefined",
    };
    await pages.projectPage.switchArena(TEST_DATA.arenaName);

    //WHEN
    const contentFrame = await findFrameByText(page, TEST_DATA.setToText);
    await contentFrame
      .locator("span", { hasText: TEST_DATA.setToText })
      .first()
      .click({ force: true });
    await pages.projectPage.addInteraction("onClick", {
      actionName: TEST_DATA.updateVariableAction,
      args: {
        variable: [TEST_DATA.textVarName],
        operation: Operations.NEW_VALUE,
        value: TEST_DATA.goodbyeValue,
      },
    });

    await contentFrame
      .locator(`text=${TEST_DATA.clearVariableSelector}`)
      .click({ force: true });
    await pages.projectPage.addInteraction("onClick", {
      actionName: TEST_DATA.updateVariableAction,
      args: {
        variable: [TEST_DATA.textVarName],
        operation: Operations.CLEAR_VALUE,
      },
    });

    //THEN
    await pages.projectPage.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toBeVisible();
      await expect(liveFrame.getByText(TEST_DATA.helloText)).toBeVisible();
      await liveFrame
        .getByRole("button", { name: TEST_DATA.setToGoodbyeButtonName })
        .click();
      await expect(
        liveFrame.getByText(TEST_DATA.goodbyeText, { exact: true })
      ).toBeVisible();
      await liveFrame
        .getByRole("button", { name: TEST_DATA.clearButtonName })
        .click();
      await expect(liveFrame.getByText(TEST_DATA.undefinedText)).toBeVisible();
    });
  });
});
