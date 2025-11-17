import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { goToProject } from "../utils/studio-utils";

const BUNDLE_NAME = "state-management";

test.describe("interactions-event-handlers", () => {
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

  test("can create event handler interactions", async ({ models, page }) => {
    await models.studio.switchArena("invoke event handler interactions");
    await models.studio.waitStudioLoaded();

    const contentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();

    await models.studio.rightPanel.createNewEventHandler("onIncrement", [
      { name: "val", type: "num" },
      { name: "message", type: "text" },
    ]);

    await contentFrame
      .locator("text=invoke event handler")
      .click({ force: true });

    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "invokeEventHandler",
        args: {
          eventRef: "onIncrement",
          arguments: {
            val: "$props.defaultCount+1",
            message: "`Last number: ${$props.defaultCount}`",
          },
        },
      },
    ]);

    await models.studio.switchArena("use invoke event handler");
    await models.studio.waitStudioLoaded();

    const contentFrame2 = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .nth(1)
      .contentFrame();

    await page.waitForTimeout(2_000);
    await contentFrame2
      .locator(':text("invoke event handler")')
      .click({ force: true });

    await models.studio.rightPanel.addComplexInteraction("onIncrement", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["count"],
          operation: "newValue",
          value: "val",
        },
      },
      {
        actionName: "updateVariable",
        args: {
          variable: ["lastMessage"],
          operation: "newValue",
          value: "message",
        },
      },
    ]);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(
        liveFrame.locator("#plasmic-app div").getByText("5")
      ).toBeVisible();
      await expect(
        liveFrame.locator("#plasmic-app div").getByText("none")
      ).toBeVisible();

      await liveFrame.locator("text=invoke event handler").click();
      await expect(
        liveFrame.locator("#plasmic-app div").getByText("6")
      ).toBeVisible();
      await expect(
        liveFrame.locator("#plasmic-app div").getByText("Last number: 5")
      ).toBeVisible();

      await liveFrame.locator("text=invoke event handler").click();
      await expect(
        liveFrame.locator("#plasmic-app div").getByText("7")
      ).toBeVisible();
      await expect(
        liveFrame.locator("#plasmic-app div").getByText("Last number: 6")
      ).toBeVisible();
    });
  });
});
