import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("arena", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "arena" });
    await page.goto(`/projects/${projectId}`);
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
    const artboardFrame = models.studio.getArtboardFrame(0);
    const artboardBody = artboardFrame.locator("body");
    await artboardBody.click();
    await models.studio.renameSelectionTag("Screen");

    await models.studio.leftPanel.insertNode("Text");

    await models.studio.extractComponentNamed("Text Input");

    await models.studio.openComponentInNewFrame("Text Input");
    const componentFrame = models.studio.getArtboardFrame(1);
    const componentBody = componentFrame.locator("body");
    await componentBody.click();
    await page.waitForTimeout(1_000); // We wait here otherwise we click the element before it is actually interactable
    await models.studio.rightPanel.chooseFontSize("25px");
    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.globalVariantsHeader.click();

    await models.studio.rightPanel.switchToResponsivenessTab();
    await models.studio.leftPanel.breakpointPresetButton.click();
    await page.waitForTimeout(1_000);
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

    await artboardBody.click();
    await artboardBody
      .locator("span")
      .first()
      .dblclick({ delay: 200, force: true });

    expect(
      await models.studio.rightPanel.fontSizeInput.getAttribute("value")
    ).toContain("30");

    await models.studio.rightPanel.openArtboardSettings();
    await models.studio.rightPanel.artboardSizeWidthInput.clear();
    await models.studio.rightPanel.artboardSizeWidthInput.fill("211px");
    await page.keyboard.press("Enter");

    await artboardBody.click();
    await artboardBody
      .locator("span")
      .first()
      .dblclick({ delay: 200, force: true });

    expect(
      await models.studio.rightPanel.fontSizeInput.getAttribute("value")
    ).toContain("25");
  });
});
