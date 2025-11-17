import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";
import { undoAndRedo } from "../utils/undo-and-redo";

test.describe("generic-slots", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "generic-slots" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create, override content, edit default content", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addComponent("Widget");
    const widgetFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    await models.studio.leftPanel.addNewFrame();
    await models.studio.zoomOut();
    const artboardFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .nth(1)
      .contentFrame();
    await models.studio.addNodeToSelectedFrame("Widget", 10, 10);
    await models.studio.rightPanel.componentNameInput.fill("widget1");
    await models.studio.addNodeToSelectedFrame("Widget", 10, 150);
    await models.studio.rightPanel.componentNameInput.fill("widget2");
    await widgetFrame
      .getByText("vertical stack", { exact: true })
      .click({ button: "right", force: true });
    await models.studio.convertToSlotButton.click();
    await artboardFrame
      .locator("body")
      .getByText("Widget Slot")
      .first()
      .click({ force: true });
    await models.studio.insertTextNodeWithContent("so rough");
    await artboardFrame
      .locator("body")
      .getByText("Widget Slot")
      .first()
      .click({ force: true });
    await models.studio.insertTextNodeWithContent("so tough");
    await artboardFrame
      .locator("body")
      .getByText("so tough")
      .click({ button: "right", force: true });
    await models.studio.revertSlotToDefaultButton.click();
    await widgetFrame
      .locator("body")
      .getByText("Widget Slot")
      .click({ force: true });
    await models.studio.leftPanel.insertNode("Free box");
    await artboardFrame
      .locator("body")
      .getByText("free box")
      .click({ force: true });
    await models.studio.leftPanel.insertNode("Text");

    await expect(
      artboardFrame.locator("body").getByText("so rough")
    ).toBeVisible();
    await expect(
      artboardFrame.locator("body").getByText("Enter some text")
    ).toBeVisible();
    await undoAndRedo(page);
    await expect(
      artboardFrame.locator("body").getByText("so rough")
    ).toBeVisible();
    await expect(
      artboardFrame.locator("body").getByText("Enter some text")
    ).toBeVisible();
    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toBeVisible();
      await expect(liveFrame.getByText("so rough")).toBeVisible();
      await expect(liveFrame.getByText("Enter some text")).toBeVisible();
    });
  });
});
