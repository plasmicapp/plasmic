import { expect, Locator, Page } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { goToProject } from "../utils/studio-utils";

const BUNDLE_NAME = "state-management";

const isOddChild = (index: number) => (index + 1) % 2 !== 0;

const items = new Array(10).fill(0);

const checkCssInCanvas = async (
  container: Locator,
  cssProp: string,
  cssPropValue: string,
  condition = (_index: number) => true
) => {
  for (let i = 0; i < items.length; i++) {
    const item = container.locator(`text=Item ${i}`).locator("..");
    await item.waitFor();
    if (condition(i)) {
      await expect(item).toHaveCSS(cssProp, cssPropValue);
    } else {
      await expect(item).not.toHaveCSS(cssProp, cssPropValue);
    }
  }
};

const checkCssInPreview = async (
  page: Page,
  cssProp: string,
  cssPropValue: string,
  condition = (_index: number) => true
) => {
  for (let i = 0; i < items.length; i++) {
    const item = page.locator(`text=Item ${i}`);
    await item.waitFor();
    if (condition(i)) {
      await expect(item).toHaveCSS(cssProp, cssPropValue);
    } else {
      await expect(item).not.toHaveCSS(cssProp, cssPropValue);
    }
  }
};

test.describe("artbitrary-css-selectors", () => {
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

  test("can apply arbitrary CSS selectors to nodes", async ({
    models,
    page,
  }) => {
    await models.studio.leftPanel.createNewPage("Arbitrary CSS Selectors");
    const pageFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("div")
      .locator("iframe")
      .contentFrame();
    const pageFrameBody = pageFrame.locator("body");
    await models.studio.leftPanel.insertNode("Text");
    await models.studio.rightPanel.componentNameInput.fill("my-text");
    await models.studio.rightPanel.setTextNodeTag("Paragraph");
    await models.studio.rightPanel.addRepeatElementButton.click();
    await models.studio.rightPanel.repeatCollectionButton.click();
    await models.studio.rightPanel.insertMonacoCode(`[${items}]`);
    const disablePane = models.studio.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count = await disablePane.count();
    if (count > 0) {
      await disablePane
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await models.studio.textContent.click({ button: "right", force: true });
    await models.studio.rightPanel.useDynamicValueButton.click();
    await models.studio.rightPanel.insertMonacoCode("`Item ${currentIndex}`");
    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.applyButtonMenu.click();
    await models.studio.rightPanel.elementVariantsButton.click();
    await models.studio.rightPanel.addElemetVariantsButton.click();
    await models.studio.rightPanel.variantsInput.pressSequentially(
      ":nth-child(odd)"
    );
    await models.studio.rightPanel.variantsInput.press("Enter");
    await models.studio.rightPanel.variantsInput.press("Escape");

    await checkCssInCanvas(pageFrameBody, "font-size", "30px", () => false);

    await models.studio.rightPanel.fontSizeInput.fill("30px");
    await models.studio.rightPanel.fontSizeInput.press("Enter");

    await checkCssInCanvas(pageFrameBody, "font-size", "30px");

    await models.studio.rightPanel.variantStopRecording.click();
    await checkCssInCanvas(pageFrameBody, "font-size", "30px");

    await models.studio.rightPanel.variantStopViewing.click();
    await checkCssInCanvas(pageFrameBody, "font-size", "30px", isOddChild);

    await models.studio.rightPanel.addElemetVariantsButton.click();
    await models.studio.rightPanel.variantsInput.pressSequentially(
      ":first-child"
    );
    await models.studio.rightPanel.variantsInput.press("Enter");
    await models.studio.rightPanel.variantsInput.press("Escape");

    await checkCssInCanvas(
      pageFrameBody,
      "text-decoration-line",
      "underline",
      () => false
    );

    await models.studio.rightPanel.underlineTextDecorationButton.click();

    await checkCssInCanvas(pageFrameBody, "text-decoration-line", "underline");

    await models.studio.rightPanel.variantStopRecording.click();
    await checkCssInCanvas(pageFrameBody, "text-decoration-line", "underline");

    await models.studio.rightPanel.variantStopViewing.click();
    await checkCssInCanvas(
      pageFrameBody,
      "text-decoration-line",
      "underline",
      (index) => index === 0
    );

    await models.studio.rightPanel.addElemetVariantsButton.click();
    await models.studio.rightPanel.variantsInput.pressSequentially(":hover");
    await models.studio.rightPanel.variantsInput.press("Enter");
    await models.studio.rightPanel.variantsInput.press("Escape");

    await checkCssInCanvas(
      pageFrameBody,
      "font-family",
      "Montserrat, sans-serif",
      () => false
    );

    await models.studio.rightPanel.fontFamilyInput.click();
    await page.keyboard.type("Montserrat");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");

    await checkCssInCanvas(
      pageFrameBody,
      "font-family",
      "Montserrat, sans-serif"
    );

    await models.studio.rightPanel.variantStopRecording.click();
    await checkCssInCanvas(
      pageFrameBody,
      "font-family",
      "Montserrat, sans-serif"
    );

    await models.studio.rightPanel.variantStopViewing.click();
    await checkCssInCanvas(
      pageFrameBody,
      "font-family",
      "Montserrat, sans-serif",
      () => false
    );

    await pageFrame
      .locator("body")
      .locator(`text=Item 0`)
      .locator("..")
      .hover({ force: true });

    await checkCssInCanvas(
      pageFrameBody,
      "font-family",
      "Montserrat, sans-serif",
      () => false
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await checkCssInPreview(
        liveFrame,
        "text-decoration-line",
        "underline",
        (index) => index === 0
      );

      await liveFrame.locator("text=Item 2").hover();
      await checkCssInPreview(
        liveFrame,
        "font-family",
        "Montserrat, sans-serif",
        (index) => index === 2
      );

      await checkCssInPreview(liveFrame, "font-size", "30px", isOddChild);
    });
  });
});
