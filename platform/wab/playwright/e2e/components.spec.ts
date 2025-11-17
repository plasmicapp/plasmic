import { expect } from "@playwright/test";
import {
  FREE_CONTAINER_CAP,
  FREE_CONTAINER_LOWER,
} from "../../src/wab/shared/Labels";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";
import { undoAndRedo } from "../utils/undo-and-redo";

// Test isn't passing even in cypress
// TODO: fix
test.describe.skip("components", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "components" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can extract, instantiate, drill, add variants, undo select", async ({
    page,
    models,
    apiClient,
  }) => {
    await models.studio.leftPanel.addNewFrame();

    const framed = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.insertNode(FREE_CONTAINER_CAP);
    await page.keyboard.press("Enter");

    await models.studio.extractComponentNamed("Widget");

    await models.studio.openComponentInNewFrame("Widget", {
      editInNewArtboard: true,
    });

    await page.keyboard.press("n");

    const framed2 = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .nth(1)
      .contentFrame();

    await framed.locator("body").click();
    const rootElt = framed.locator(".__wab_root > *:not(style)");
    await rootElt.locator("..").dblclick({ force: true });

    await page.keyboard.press("Shift+A");

    await page.keyboard.press("r");
    await models.studio.drawRectRelativeToElt(
      framed.locator("body"),
      1,
      1,
      10,
      10
    );

    await models.studio.rightPanel.switchToDesignTab();
    await models.studio.rightPanel.expandSizeSection();
    await models.studio.rightPanel.setDataPlasmicProp("width", "stretch");
    await models.studio.rightPanel.setDataPlasmicProp("height", "stretch");
    await models.studio.rightPanel.setDataPlasmicProp("min-width", "20px");
    await models.studio.rightPanel.setDataPlasmicProp("min-height", "20px");

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.addVariantGroup("WidgetRole");
    await models.studio.rightPanel.addVariantToGroup("WidgetRole", "Blah");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Delete");
    await models.studio.deleteInsteadButton.waitFor({ state: "visible" });

    await page.keyboard.press("Shift+Enter");

    await models.studio.leftPanel.insertNode(FREE_CONTAINER_CAP);

    await models.studio.focusFrameRoot(framed);
    await models.studio.expectDebugTplTree(`
${FREE_CONTAINER_LOWER}
  Widget`);

    await page.keyboard.press("n");
    await models.studio.expectDebugTplTreeForFrame(
      1,
      `
${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}`
    );

    await models.studio.focusFrameRoot(framed);
    const rootElt2 = framed.locator(".__wab_root > *:not(style)");
    await rootElt2.locator("..").locator("..").dblclick({ force: true });

    await models.studio.focusFrameRoot(framed2);

    await page.keyboard.press("Shift+Enter");

    await models.studio.focusFrameRoot(framed);
    await page.keyboard.press("Shift+Digit1");

    await models.studio.leftPanel.insertNode("Widget");
    await models.studio.expectDebugTplTree(`
${FREE_CONTAINER_LOWER}
  Widget
  Widget`);

    const selectionTag = models.studio.frame.locator(".node-outline-tag");
    await expect(selectionTag).toContainText("Widget");

    await models.studio.rightPanel.setPosition("top", 100);
    await models.studio.rightPanel.setPosition("left", 75);
    await models.studio.rightPanel.setDataPlasmicProp("width", "200px");
    await models.studio.rightPanel.setDataPlasmicProp("height", "300px");

    const selectedElt = await models.studio.getSelectedElt();
    await expect(selectedElt).toHaveCSS("top", "100px");
    await expect(selectedElt).toHaveCSS("left", "75px");
    await expect(selectedElt).toHaveCSS("width", "200px");
    await expect(selectedElt).toHaveCSS("height", "300px");

    await models.studio.focusFrameRoot(framed);
    await page.keyboard.press("Control+Alt+k");
    await models.studio.submitPrompt("Funky");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(
        liveFrame.locator(".plasmic_page_wrapper > div > :nth-child(2)")
      ).toHaveCSS("top", "100px");
      await expect(
        liveFrame.locator(".plasmic_page_wrapper > div > :nth-child(2)")
      ).toHaveCSS("left", "75px");
      await expect(
        liveFrame.locator(".plasmic_page_wrapper > div > :nth-child(2)")
      ).toHaveCSS("width", "200px");
      await expect(
        liveFrame.locator(".plasmic_page_wrapper > div > :nth-child(2)")
      ).toHaveCSS("height", "300px");
    });

    async function checkEndState() {
      await models.studio.waitAllEval();

      await models.studio.expectDebugTplTreeForFrame(
        0,
        `
${FREE_CONTAINER_LOWER}
  Widget
  Widget`
      );
      await models.studio.expectDebugTplTreeForFrame(
        1,
        `
${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}`
      );

      await page.keyboard.press("Shift+Enter");
      await page.keyboard.press("Shift+Enter");

      await expect(selectionTag).toContainText("Funky");

      await models.studio.rightPanel.checkNoErrors();
    }

    await checkEndState();
    await undoAndRedo(page);
    await checkEndState();

    await page.waitForTimeout(500);

    const bundle = await apiClient.codegen(page);
    console.log("codegen bundle", bundle);
    expect(bundle.components.length).toBe(2);

    const widgetComp = bundle.components.find(
      (c: any) => c.renderModuleFileName === "PlasmicWidget.tsx"
    );
    expect(widgetComp).not.toBeNull();
    expect(widgetComp.cssRules).not.toContain("top: 100px");
    expect(widgetComp.cssRules).toContain("min-width: 20px");
    expect(widgetComp.cssRules).toContain("min-height: 20px");

    const funkyComp = bundle.components.find(
      (c: any) => c.renderModuleFileName === "PlasmicFunky.tsx"
    );
    expect(funkyComp).not.toBeNull();
    expect(funkyComp.cssRules).toContain("top: 100px");
    expect(funkyComp.cssRules).toContain("left: 75px");
    expect(funkyComp.cssRules).toContain("width: 200px");
    expect(funkyComp.cssRules).toContain("height: 300px");
  });
});
