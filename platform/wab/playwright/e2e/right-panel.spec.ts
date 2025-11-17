import { expect, FrameLocator, Page } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("Right panel", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "right-panel" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("successfully test all right panel configurations", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addNewFrame();
    const artboardFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const artboardBody = artboardFrame.locator("body");
    await artboardBody.click();

    await models.studio.leftPanel.insertNode("Horizontal stack");
    const stackName = "testStack";
    await models.studio.renameTreeNode(stackName);

    const textName = "testText";
    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(1000);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.type("This is a text to test");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    await models.studio.rightPanel.switchToDesignTab();
    await models.studio.rightPanel.widthInput.click();
    await models.studio.rightPanel.widthInput.fill("150px");
    await page.keyboard.press("Enter");

    await models.studio.rightPanel.heightInput.click();
    await models.studio.rightPanel.heightInput.fill("25px");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    await models.studio.renameTreeNode(textName);

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode([stackName]);

    await testSizeSection(models, page, artboardFrame);
    await testVisibilitySection(models, page, artboardFrame);

    await models.studio.rightPanel.checkNoErrors();
  });
});

async function testSizeSection(
  models: PageModels,
  page: Page,
  artboardFrame: FrameLocator
) {
  const selectedElt = artboardFrame.locator(".__wab_instance > div").first();

  await models.studio.rightPanel.switchToDesignTab();
  await models.studio.rightPanel.setDataPlasmicProp("width", "250px", {
    reset: true,
  });
  await page.waitForTimeout(1000);
  await expect(selectedElt).toHaveCSS("width", "250px");

  await models.studio.rightPanel.setDataPlasmicProp("width", "stretch", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("width", "800px");

  await models.studio.rightPanel.setDataPlasmicProp("width", "hug content", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("width", "150px");

  await models.studio.rightPanel.setDataPlasmicProp("height", "250px", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("height", "250px");

  await models.studio.rightPanel.setDataPlasmicProp("height", "stretch", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("height", "800px");

  await models.studio.rightPanel.setDataPlasmicProp("height", "hug content", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("height", "25px");

  await models.studio.rightPanel.expandSizeSection();

  await models.studio.rightPanel.setDataPlasmicProp("min-width", "200px", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("min-width", "200px");

  await models.studio.rightPanel.setDataPlasmicProp("min-height", "200px", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("min-height", "200px");

  await models.studio.rightPanel.setDataPlasmicProp("max-width", "250px", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("max-width", "250px");

  await models.studio.rightPanel.setDataPlasmicProp("max-height", "250px", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("max-height", "250px");

  await models.studio.rightPanel.clickDataPlasmicProp("flex-grow");
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("flex-grow", "1");

  await models.studio.rightPanel.clickDataPlasmicProp("flex-grow");
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("flex-grow", "0");

  await models.studio.rightPanel.clickDataPlasmicProp("flex-shrink");
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("flex-shrink", "0");

  await models.studio.rightPanel.clickDataPlasmicProp("flex-grow");
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("flex-grow", "1");

  await models.studio.rightPanel.setDataPlasmicProp("flex-basis", "100px", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("flex-basis", "100px");
}

async function testVisibilitySection(
  models: PageModels,
  page: Page,
  artboardFrame: FrameLocator
) {
  const selectedElt = artboardFrame.locator(".__wab_instance > div").first();

  await models.studio.rightPanel.setDataPlasmicProp("opacity", "50", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("opacity", "0.5");

  await models.studio.rightPanel.clickDataPlasmicProp("display-not-visible");
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("display", "none");

  const visibilityChoices = models.studio.rightPanel.frame.locator(
    '[data-test-id="visibility-choices"]'
  );
  await visibilityChoices.click({ button: "right" });
  await models.studio.rightPanel.clickDataPlasmicProp("display-not-rendered");
  await page.waitForTimeout(500);
  const textElement = artboardFrame.locator(".__wab_text");
  await expect(textElement).not.toBeVisible();

  await models.studio.rightPanel.clickDataPlasmicProp("display-visible");
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("display", "flex");

  await models.studio.rightPanel.setDataPlasmicProp("opacity", "100", {
    reset: true,
  });
  await page.waitForTimeout(500);
  await expect(selectedElt).toHaveCSS("opacity", "1");
}
