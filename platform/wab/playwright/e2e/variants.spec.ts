import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("variants", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "variants" });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can CRUD interaction variants, element variants, enable multiple variants, alter content", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addComponent("Blah");

    const frame = models.studio.componentFrame;
    await models.studio.focusFrameRoot(frame);
    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();

    await models.studio.leftPanel.frame
      .getByText(`vertical stack`)
      .first()
      .click();

    await page.keyboard.press("Shift+a");

    await models.studio.leftPanel.insertText();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.type("hello");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.rightPanel.addInteractionVariantButton.click({
      force: true,
    });
    await models.studio.rightPanel.variantSelectorInput.fill("Hover");
    await models.studio.rightPanel.variantSelectorInput.press("Enter");
    await models.studio.rightPanel.doneButton.click();

    const variantsSection = models.studio.frame.locator(
      '[data-test-class="variants-section"]'
    );
    await expect(variantsSection.getByText("Hover")).toBeVisible();

    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.type("goodbye");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");

    await expect(frame.locator("span").first()).toContainText("goodbye");

    await models.studio.rightPanel.switchToComponentDataTab();
    const interactionVariantsHeader = models.studio.frame.getByText(
      "Interaction Variants"
    );
    await interactionVariantsHeader.click();
    await models.studio.frame
      .locator('[data-test-class="variant-row"]')
      .filter({ hasText: "Base" })
      .click();

    await models.studio.rightPanel.addVariantGroup("Role");
    await models.studio.rightPanel.addVariantToGroup("Role", "Primary");
    await models.studio.rightPanel.addVariantToGroup("Role", "Secondary");
    await resetVariants(models);

    await models.studio.rightPanel.switchToComponentDataTab();

    await models.studio.frame.getByText("Role").click({ button: "right" });
    await models.studio.frame.getByText("Change type to").click();
    await expect(frame.locator("span").first()).toContainText("hello");

    await models.studio.frame
      .locator('[data-event="variantspanel-variant-row"]', {
        hasText: "Primary",
      })
      .click();

    await models.studio.rightPanel.switchToDesignTab();
    await chooseFont(models, "Courier");

    await deselectVariant(models, "Role", "Primary");

    await models.studio.frame
      .locator('[data-event="variantspanel-variant-row"]', {
        hasText: "Secondary",
      })
      .click();
    await models.studio.rightPanel.chooseFontSize("36px");
    await models.studio.rightPanel.switchToComponentDataTab();

    await models.studio.frame
      .locator('[data-test-class="variants-section"]', { hasText: "Primary" })
      .hover();
    await models.studio.frame
      .locator('[data-test-class="variants-section"]', { hasText: "Primary" })
      .locator('[data-test-class="variant-record-button-start"]')
      .click();
    await expect(frame.locator("span").first()).toHaveCSS(
      "font-family",
      '"Courier New"'
    );
    await expect(frame.locator("span").first()).toHaveCSS("font-size", "36px");

    await resetVariants(models);

    await models.studio.rightPanel.addVariantGroup("Size");
    await models.studio.rightPanel.addVariantToGroup("Size", "small");
    await models.studio.rightPanel.addVariantToGroup("Size", "large");
    await resetVariants(models);

    await models.studio.frame
      .locator('[data-test-class="variants-section"]', { hasText: "small" })
      .click();
    await models.studio.rightPanel.chooseFontSize("10px");
    await models.studio.rightPanel.switchToComponentDataTab();
    await expect(frame.locator("span").first()).toHaveCSS("font-size", "10px");
    await resetVariants(models);

    await models.studio.frame
      .locator('[data-test-class="variants-section"]', { hasText: "Primary" })
      .hover();
    await models.studio.frame
      .locator('[data-test-class="variants-section"]', { hasText: "Primary" })
      .locator('[data-test-class="variant-record-button-start"]')
      .click();
    await models.studio.rightPanel.chooseFontSize("11px");
    await page.waitForTimeout(100);
    await expect(frame.locator("span").first()).toHaveCSS("font-size", "11px");

    await resetVariants(models);

    await models.studio.frame
      .locator('[data-test-class="variant-row"]', { hasText: "Secondary" })
      .click();
    await models.studio.frame
      .locator('[data-test-class="variant-row"]', { hasText: "Primary" })
      .hover();
    await models.studio.frame
      .locator('[data-test-class="variant-row"]', { hasText: "Primary" })
      .locator('[data-test-class="variant-record-button-start"]')
      .click();

    await frame.locator("body").click({ force: true });
    await models.studio.leftPanel.insertNode("Horizontal stack");

    await frame.getByText("Horizontal stack").click({ force: true });

    await models.studio.leftPanel.insertNode("More HTML elements");

    await page.waitForTimeout(500);
    await models.studio.leftPanel.addSearchInput.fill("Unstyled text input");
    await page.waitForTimeout(500);

    const item = models.studio.leftPanel.frame
      .locator(`li[data-plasmic-add-item-name="Unstyled text input"]`)
      .first();
    await item.waitFor({ state: "visible", timeout: 10000 });

    try {
      await item.click({ timeout: 10000 });
    } catch (error) {
      await item.click({ force: true });
    }

    await page.keyboard.press("Enter");

    await models.studio.rightPanel.switchToDesignTab();
    await models.studio.rightPanel.frame
      .getByRole("button", { name: "Apply" })
      .click();
    await models.studio.rightPanel.frame
      .locator(".ant-dropdown-menu-item", { hasText: "Element variants" })
      .click();

    await models.studio.rightPanel.addElemetVariantsButton.click();
    await page.waitForTimeout(100);
    await page.keyboard.type("placeholder");

    await page.keyboard.press("Enter");
    await models.studio.rightPanel.chooseFontSize("48px");
    await stopRecordingElementVariant(models);

    await models.studio.leftPanel.switchToTreeTab();

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("input")).toHaveAttribute(
        "placeholder",
        "Some placeholder"
      );

      await expect(liveFrame.locator(".__wab_text").first()).toHaveCSS(
        "font-family",
        '"Courier New"'
      );
      await expect(liveFrame.locator(".__wab_text").first()).toHaveCSS(
        "font-size",
        "36px"
      );
    });

    await resetVariants(models);

    await models.studio.frame
      .locator('[data-test-class="variant-row"]', { hasText: "Secondary" })
      .click();

    await models.studio.rightPanel.switchToDesignTab();
    await models.studio.rightPanel.frame
      .locator('[data-event="variantspanel-variant-row"]', {
        hasText: "Placeholder",
      })
      .click({ button: "right" });
    await models.studio.rightPanel.frame
      .locator(".ant-dropdown-menu-item", { hasText: "Delete" })
      .click();

    await frame
      .locator("span")
      .filter({ hasText: "hello" })
      .first()
      .click({ force: true });
    await page.keyboard.press("Delete");

    await expect(models.studio.frame.getByText("Delete instead")).toBeVisible();
    await models.studio.frame
      .locator(".ant-notification-notice-close-x")
      .click();

    await resetVariants(models);

    await page.waitForTimeout(500);
    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.frame
      .locator('[data-test-class="variants-section"]', { hasText: "Primary" })
      .click();

    await expect(
      frame.locator("span").filter({ hasText: "hello" }).first()
    ).toBeVisible();

    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await frame
      .locator("span")
      .filter({ hasText: "hello" })
      .first()
      .click({ force: true });
    await page.keyboard.press("Delete");
    await models.studio.frame.getByText("Delete instead").first().click();

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.frame
      .locator('[data-test-class="variant-row"]', { hasText: "Primary" })
      .click();
    await expect(
      frame.locator("span").filter({ hasText: "hello" })
    ).not.toBeVisible();

    await models.studio.rightPanel.frame
      .locator('[data-test-class="variants-section"]', { hasText: "Role" })
      .getByText("Role")
      .click({ button: "right" });
    await models.studio.rightPanel.frame
      .locator(".ant-dropdown-menu-item", {
        hasText: "Delete group of variants",
      })
      .click();

    await models.studio.rightPanel.frame
      .locator('[data-event="variantspanel-variant-row"]', { hasText: "Hover" })
      .click({ button: "right" });
    await models.studio.rightPanel.frame
      .locator(".ant-dropdown-menu-item", { hasText: "Delete" })
      .click();

    function checkEndState() {
      return Promise.all([
        expect(models.studio.frame.getByText("Hover")).not.toBeVisible(),
        expect(models.studio.frame.getByText("Role")).not.toBeVisible(),
        expect(models.studio.frame.getByText("Primary")).not.toBeVisible(),
        expect(models.studio.frame.getByText("Secondary")).not.toBeVisible(),
        models.studio.rightPanel.checkNoErrors(),
      ]);
    }

    await checkEndState();

    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+y");
    await checkEndState();
  });
});

async function resetVariants(models: any) {
  await models.studio.rightPanel.switchToComponentDataTab();
  const baseVariant = models.studio.frame
    .locator('[data-test-class="variant-row"]')
    .filter({ hasText: "Base" });
  if (await baseVariant.isVisible()) {
    await baseVariant.click();
  } else {
    const activeVariants = models.studio.frame.locator(
      '[data-test-class="variant-pin-button-deactivate"]'
    );
    const count = await activeVariants.count();
    for (let i = 0; i < count; i++) {
      await activeVariants.nth(0).click();
    }
  }
}
async function deselectVariant(
  models: any,
  groupName: string,
  variantName: string
) {
  await models.studio.rightPanel.switchToComponentDataTab();
  const variantGroup = models.studio.frame
    .locator('[data-test-class="variants-section"]')
    .filter({ hasText: groupName });
  const variant = variantGroup
    .locator('[data-test-class="variant-row"]')
    .filter({ hasText: variantName })
    .locator('button[data-test-class="variant-record-button-stop"]');
  if (await variant.isVisible()) {
    await variant.click();
  }
}

async function chooseFont(models: any, fontName: string) {
  await models.studio.rightPanel.switchToDesignTab();
  await models.studio.rightPanel.fontFamilyInput.click();
  await models.studio.rightPanel.fontFamilyInput.type(fontName);
  await models.studio.rightPanel.fontFamilyInput.press("Enter");
}
async function stopRecordingElementVariant(models: any) {
  await models.studio.rightPanel.variantStopRecording.click();
}
