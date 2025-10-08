import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("Can use stale bundle", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test("Can migrate stale bundle", async ({ page, models, apiClient }) => {
    projectId = await apiClient.setupProjectFromTemplate("stale-bundle");
    await page.goto(`/projects/${projectId}?ccStubs=true`);

    await models.studio.waitForFrameToLoad();

    const framesViewport = models.studio.frame.locator(
      ".canvas-editor__frames .canvas-editor__viewport"
    );
    await framesViewport.first().waitFor({ state: "visible" });

    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();

    await models.studio.leftPanel.frame
      .getByText("vertical stack")
      .first()
      .click();

    await models.studio.leftPanel.frame.getByText("Button").click();

    await page.keyboard.press("Shift+2");

    const frameContent = models.studio.getComponentFrameByIndex(0);
    await expect(frameContent.getByText("Button")).toBeVisible();

    await page.keyboard.press("Enter");

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await frameContent.getByText("Button").click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.type("AntdBtn");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    await models.studio.leftPanel.frame
      .getByText("vertical stack")
      .first()
      .click();

    await models.studio.leftPanel.frame.getByText("AntdBtn").click();

    await models.studio.rightPanel.checkNoErrors();

    await page.waitForTimeout(2000);
  });
});
