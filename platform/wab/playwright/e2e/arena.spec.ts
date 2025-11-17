import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("arena", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "arena" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("activates and deactivates global screen variants", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addNewFrame();
    const artboardFrame = models.studio.componentFrame;
    const artboardBody = artboardFrame.locator("body");
    await artboardBody.click();
    await models.studio.renameSelectionTag("Screen");

    await models.studio.leftPanel.insertNode("Text");

    await models.studio.extractComponentNamed("Text Input");

    await models.studio.openComponentInNewFrame("Text Input");
    const componentFrame = models.studio.getComponentFrameByIndex(1);
    const componentBody = componentFrame.locator("body");
    await componentBody.click();
    await models.studio.rightPanel.chooseFontSize("25px");
    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.globalVariantsHeader.click();

    await models.studio.rightPanel.switchToResponsivenessTab();
    await models.studio.leftPanel.breakpointPresetButton.click();
    await models.studio.leftPanel.breakpointDesktopCategory.waitFor({
      state: "visible",
    });
    await models.studio.leftPanel.breakpointDesktopCategory.hover();
    await models.studio.leftPanel.breakpointDesktopMobile.scrollIntoViewIfNeeded();
    await models.studio.leftPanel.breakpointDesktopMobile.click();
    await models.studio.leftPanel.setBreakpointWidth("210");
    await models.studio.rightPanel.selectVariant("Mobile");
    await models.studio.rightPanel.chooseFontSize("30px");

    await artboardBody.click();

    await models.studio.rightPanel.openArtboardSettings();
    await models.studio.rightPanel.artboardSizeWidthInput.clear();
    await models.studio.rightPanel.artboardSizeWidthInput.fill("200px");
    await page.keyboard.press("Enter");
    await models.studio.waitForSave();

    await artboardBody.click();
    await artboardBody
      .locator("span")
      .first()
      .dblclick({ delay: 200, force: true });

    await models.studio.rightPanel.fontSizeInput.waitFor({
      state: "visible",
      timeout: 5000,
    });
    expect(
      await models.studio.rightPanel.fontSizeInput.getAttribute("value")
    ).toContain("30");

    await models.studio.rightPanel.openArtboardSettings();
    await models.studio.rightPanel.artboardSizeWidthInput.clear();
    await models.studio.rightPanel.artboardSizeWidthInput.fill("211px");
    await page.keyboard.press("Enter");
    await models.studio.waitForSave();
    await page.waitForTimeout(1000);
    await artboardBody.click();
    await page.waitForTimeout(1000);
    const textSpan = artboardBody.locator("span").first();
    await textSpan.waitFor({ state: "visible", timeout: 10000 });
    await textSpan.hover();
    await textSpan.dblclick({ delay: 500, force: true });
    await page.keyboard.press("Escape");
    await textSpan.dblclick({ delay: 300, force: true });
    await page.waitForTimeout(1500);
    await models.studio.rightPanel.fontSizeInput.waitFor({
      state: "visible",
      timeout: 15000,
    });
    const fontSize = await models.studio.rightPanel.fontSizeInput.getAttribute(
      "value"
    );
    expect(fontSize).toContain("25");
  });
});
