import { expect } from "@playwright/test";
import { FREE_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("components", () => {
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

  test("can extract a component, add variants, instantiate and position it", async ({
    page,
    models,
    apiClient,
  }) => {
    // Create a page artboard with a free container and extract it as a component.
    await models.studio.leftPanel.addNewFrame();
    const framed = models.studio.frame.locator("iframe").first().contentFrame();

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.insertNode(FREE_CONTAINER_CAP);
    await page.keyboard.press("Enter");

    await models.studio.extractComponentNamed("Widget");

    // Open the Widget component in its own artboard and edit there.
    // Variant groups can only be added while editing the component artboard, not
    // while drilled into an instance on the page.
    await models.studio.openComponentInNewFrame("Widget");
    const framed2 = models.studio.frame.locator("iframe").nth(1).contentFrame();

    // Add a child box to the Widget and give it min dimensions. These end up in
    // the Widget component's generated CSS (asserted via codegen below).
    await models.studio.focusFrameRoot(framed2);
    await models.studio.leftPanel.insertNode(FREE_CONTAINER_CAP);

    await models.studio.rightPanel.switchToDesignTab();
    await models.studio.rightPanel.expandSizeSection();
    await models.studio.rightPanel.setDataPlasmicProp("min-width", "20px");
    await models.studio.rightPanel.setDataPlasmicProp("min-height", "20px");

    // Add a variant group + variant to the Widget component.
    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.addVariantToGroup("WidgetRole", "Blah");

    // Select the page artboard, add a second Widget instance, and position it.
    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.insertNode("Widget");

    const selectionTag = models.studio.frame.locator(".node-outline-tag");
    await expect(selectionTag).toContainText("Widget");

    await models.studio.rightPanel.switchToDesignTab();
    await models.studio.rightPanel.setPosition("top", 100);
    await models.studio.rightPanel.setPosition("left", 75);
    await models.studio.rightPanel.setDataPlasmicProp("width", "200px");
    await models.studio.rightPanel.setDataPlasmicProp("height", "300px");

    // Convert the page artboard into a component named "Funky". The positioned
    // Widget instance's styling lives on Funky, not on Widget.
    await models.studio.focusFrameRoot(framed);
    await page.keyboard.press("ControlOrMeta+Alt+k");
    await models.studio.submitPrompt("Funky");

    await models.studio.rightPanel.checkNoErrors();

    // Verify the generated code splits styling between the two components.
    await models.studio.waitForSave();

    const bundle = await apiClient.codegen(page);
    expect(bundle.components.length).toBe(2);

    const widgetComp = bundle.components.find(
      (c: any) => c.renderModuleFileName === "PlasmicWidget.tsx"
    );
    expect(widgetComp).toBeTruthy();
    expect(widgetComp.cssRules).not.toContain("top: 100px");
    expect(widgetComp.cssRules).toContain("min-width: 20px");
    expect(widgetComp.cssRules).toContain("min-height: 20px");

    const funkyComp = bundle.components.find(
      (c: any) => c.renderModuleFileName === "PlasmicFunky.tsx"
    );
    expect(funkyComp).toBeTruthy();
    expect(funkyComp.cssRules).toContain("top: 100px");
    expect(funkyComp.cssRules).toContain("left: 75px");
    expect(funkyComp.cssRules).toContain("width: 200px");
    expect(funkyComp.cssRules).toContain("height: 300px");
  });
});
