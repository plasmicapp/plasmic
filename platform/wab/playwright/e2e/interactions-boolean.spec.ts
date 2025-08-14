import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { BooleanInteractionsArena } from "../models/arenas/boolean-interactions";

const BUNDLE_NAME = "state-management";

test.describe("state-management-boolean-interactions", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.importProjectFromTemplate(bundles[BUNDLE_NAME]);

    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create all types of boolean interactions", async ({
    models,
    page,
  }) => {
    await models.studio.switchArena("boolean interactions");
    const arena = await BooleanInteractionsArena.init(page);

    await arena.setToTrueButton.click({ force: true });
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["booleanVar"],
          operation: "newValue",
          value: "true",
        },
      },
    ]);

    await arena.setToFalseButton.click({ force: true });
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["booleanVar"],
          operation: "newValue",
          value: "false",
        },
      },
    ]);

    await arena.toggleButton.click({ force: true });
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["booleanVar"],
          operation: "toggle",
        },
      },
    ]);

    await arena.clearButton.click({ force: true });
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["booleanVar"],
          operation: "clearValue",
        },
      },
    ]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: "true" })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Set to false" }).click();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: "false" })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Set to true" }).click();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: "true" })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Toggle" }).click();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: "false" })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Toggle" }).click();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: "true" })
          .first()
      ).toBeVisible();

      await liveFrame.getByRole("button", { name: "Clear" }).click();
      await expect(
        liveFrame
          .locator("#plasmic-app div")
          .filter({ hasText: "undefined" })
          .first()
      ).toBeVisible();
    });
  });
});
