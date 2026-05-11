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

  test("can create all types of object and array interactions", async ({
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

    await models.studio.switchArena("array interactions");
    const arrayArena = await ObjectInteractionsArena.init(page);

    await arrayArena.contentFrame.getByText("Set to").first().click({
      force: true,
    });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["arrayVar"],
          operation: "newValue",
          value: '[{text: "foo2"},{text: "bar2"}]',
        },
      },
    ]);

    await arrayArena.contentFrame
      .getByText("Remove foo", { exact: true })
      .click({
        force: true,
      });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["arrayVar"],
          operation: "splice",
          deleteCount: "1",
        },
        dynamicArgs: {
          startIndex: "currentIndex",
        },
      },
    ]);

    await arrayArena.contentFrame.getByText("Remove below foo").click({
      force: true,
    });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["arrayVar"],
          operation: "splice",
        },
        dynamicArgs: {
          startIndex: "currentIndex",
          deleteCount: "$state.arrayVar.length - currentIndex",
        },
      },
    ]);

    await arrayArena.contentFrame.getByText("Push element").click({
      force: true,
    });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["arrayVar"],
          operation: "push",
          value: '{text: "baz"}',
        },
      },
    ]);

    await arrayArena.contentFrame.getByText("Clear variable").click({
      force: true,
    });
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);
    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["arrayVar"],
          operation: "clearValue",
        },
      },
    ]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      const app = liveFrame.locator("#plasmic-app");

      await expect(app).toContainText("length: 2");
      for (const text of ["foo", "bar"]) {
        await expect(app).toContainText(text);
      }

      await liveFrame.getByText("Push element").click();
      await expect(app).toContainText("length: 3");
      for (const text of ["foo", "bar", "baz"]) {
        await expect(app).toContainText(text);
      }

      await liveFrame.getByText("Remove below bar").click();
      await expect(app).toContainText("length: 1");
      await expect(app).toContainText("foo");

      await liveFrame.getByText("Push element").click();
      await expect(app).toContainText("length: 2");
      for (const text of ["foo", "baz"]) {
        await expect(app).toContainText(text);
      }

      await liveFrame.getByText("Remove foo", { exact: true }).click();
      await expect(app).toContainText("length: 1");
      await expect(app).toContainText("baz");

      await liveFrame.getByText("Set to").click();
      await expect(app).toContainText("length: 2");
      for (const text of ["foo2", "bar2"]) {
        await expect(app).toContainText(text);
      }
    });
  });
});
