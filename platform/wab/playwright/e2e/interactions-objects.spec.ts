import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { ObjectInteractionsArena } from "../models/arenas/object-interactions";
import { goToProject } from "../utils/studio-utils";

const BUNDLE_NAME = "state-management";

test.describe("state-management-object-interactions", () => {
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

  test("can create all types of object interactions", async ({
    models,
    page,
  }) => {
    //GIVEN
    await models.studio.switchArena("object interactions");
    const arena = await ObjectInteractionsArena.init(page);
    //WHEN
    await arena.setToButton.click({ force: true });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["objectVar"],
          operation: "newValue",
          value: "({a: 3, b: 4})",
        },
      },
    ]);

    await arena.clearButton.click({ force: true });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["objectVar"],
          operation: "clearValue",
        },
      },
    ]);

    //THEN
    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toBeVisible();
      await expect(
        liveFrame.getByText(JSON.stringify({ a: 1, b: 2 }))
      ).toBeVisible();
      await liveFrame.getByRole("button", { name: "Set to" }).click();
      await expect(
        liveFrame.getByText(JSON.stringify({ a: 3, b: 4 }))
      ).toBeVisible();
      await liveFrame.getByRole("button", { name: "Clear" }).click();
      await expect(liveFrame.getByText("undefined")).toBeVisible();
    });
  });
});
