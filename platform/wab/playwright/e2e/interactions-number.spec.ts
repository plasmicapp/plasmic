import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { NumberInteractionsArena } from "../models/arenas/number-interactions";
import { goToProject } from "../utils/studio-utils";

const BUNDLE_NAME = "state-management";

test.describe("state-management-numbers-interactions", () => {
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

  test("can create all types of number interactions", async ({
    models,
    page,
  }) => {
    await models.studio.switchArena("number interactions");
    const arena = await NumberInteractionsArena.init(page);

    await arena.setToButton.click({ force: true });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["numberVar"],
          operation: "newValue",
          value: "10",
        },
      },
    ]);

    await arena.incrementButton.click({ force: true });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["numberVar"],
          operation: "increment",
        },
      },
    ]);

    await arena.decrementButton.click({ force: true });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["numberVar"],
          operation: "decrement",
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
          variable: ["numberVar"],
          operation: "clearValue",
        },
      },
    ]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(
        liveFrame.locator("#plasmic-app div").filter({ hasText: "0" }).first()
      ).toBeVisible();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: JSON.stringify({ numberVar: 0 }) })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Set to" }).click();
      await expect(
        liveFrame.locator("#plasmic-app div").filter({ hasText: "10" }).first()
      ).toBeVisible();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: JSON.stringify({ numberVar: 10 }) })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Increment" }).click();
      await expect(
        liveFrame.locator("#plasmic-app div").filter({ hasText: "11" }).first()
      ).toBeVisible();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: JSON.stringify({ numberVar: 11 }) })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Decrement" }).click();
      await expect(
        liveFrame.locator("#plasmic-app div").filter({ hasText: "10" }).first()
      ).toBeVisible();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: JSON.stringify({ numberVar: 10 }) })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Clear" }).click();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: JSON.stringify({}) })
          .first()
      ).toBeVisible();
    });
  });
});
