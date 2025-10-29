import type { FrameLocator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { switchInteractiveMode } from "../utils/auto-open-utils";
import { modifierKey } from "../utils/modifier-key";

async function createAndSwitchToButtonArena(
  page: Page,
  models: any
): Promise<FrameLocator> {
  await models.studio.createNewPageInOwnArena("Homepage");
  await models.studio.waitForFrameToLoad();

  await models.studio.leftPanel.insertNode("plasmic-react-aria-button");
  await page.waitForTimeout(1000);

  await models.studio.extractComponentNamed("Button");
  await page.waitForTimeout(1000);

  await models.studio.frame.getByText("[Open component]").click();
  await models.studio.waitForFrameToLoad();

  await models.studio.frames
    .first()
    .waitFor({ state: "visible", timeout: 60000 });

  return models.studio.componentFrame;
}

async function waitForVariantFrame(
  models: any,
  action: () => Promise<void>
): Promise<FrameLocator> {
  const existingCount = await models.studio.frames.count();
  await action();

  const newFrameContainer = models.studio.frames.nth(existingCount);
  await newFrameContainer.waitFor({ state: "visible", timeout: 60000 });

  const frameUid = await newFrameContainer.getAttribute("data-test-frame-uid");
  if (!frameUid) {
    throw new Error("Unable to determine variant frame UID");
  }

  const newFrame = models.studio.frame.frameLocator(
    `.canvas-editor__frames .canvas-editor__viewport[data-test-frame-uid="${frameUid}"]`
  );
  await newFrame.locator("body").waitFor({ state: "attached", timeout: 60000 });

  return newFrame;
}

async function addRegisteredVariantFromVariantsTab(
  page: Page,
  models: any,
  variantName: string,
  { expectNewFrame = true }: { expectNewFrame?: boolean } = {}
): Promise<FrameLocator | null> {
  const action = async () => {
    const registeredVariantsSection = models.studio.frame
      .locator('[data-test-class="variants-section"]')
      .filter({ hasText: "Registered Variants" });
    await registeredVariantsSection
      .locator('[data-test-class="add-variant-button"]')
      .click();
    await page.waitForTimeout(500);
    await page.keyboard.type(variantName);
    await page.keyboard.press("Enter");
  };

  let frame: FrameLocator | null = null;
  if (expectNewFrame) {
    frame = await waitForVariantFrame(models, action);
  } else {
    await action();
  }

  const variantSelectorButton = models.studio.frame.locator(
    '[data-test-id="variant-selector-button"]'
  );
  await variantSelectorButton.waitFor({ state: "visible", timeout: 5000 });
  await variantSelectorButton.click();
  await page.waitForTimeout(500);

  await expectVariantPresent(models, variantName);

  return frame;
}

async function editRegisteredVariantFromCanvas(
  page: Page,
  models: any,
  newVariantName: string
) {
  const variantsList = models.studio.frame
    .locator('[class*="variantsList"]')
    .first();
  await variantsList.click({ button: "right" });
  await models.studio.frame.getByText("Change variant selectors").click();
  await page.waitForTimeout(200);
  await page.keyboard.press(`${modifierKey}+A`);
  await page.keyboard.type(newVariantName);
  await page.keyboard.press("Enter");
  await models.studio.frame
    .locator('[data-test-id="variant-selector-button"]')
    .click();
}

async function editRegisteredVariantFromVariantsTab(
  page: Page,
  models: any,
  existingVariantName: string,
  newVariantName: string
) {
  await models.studio.rightPanel.switchToComponentDataTab();
  const variantRow = models.studio.frame
    .locator('[data-test-class="variant-row"]')
    .filter({ hasText: existingVariantName })
    .first();
  await variantRow.waitFor({ state: "visible", timeout: 5000 });
  await variantRow.click({ button: "right" });
  await page.waitForTimeout(200);
  await models.studio.frame.getByText("Edit registered keys").click();
  await page.waitForTimeout(500);
  await page.keyboard.press("Delete");
  await page.keyboard.type(newVariantName);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
}

async function deleteRegisteredVariantFromVariantsTab(
  models: any,
  variantName: string
) {
  await models.studio.rightPanel.switchToComponentDataTab();
  const variantRow = models.studio.frame
    .locator('[data-test-class="variant-row"]')
    .filter({ hasText: variantName })
    .first();
  await variantRow.waitFor({ state: "visible", timeout: 5000 });
  await variantRow.click({ button: "right" });
  await models.studio.frame
    .locator(".ant-dropdown-menu-item", { hasText: "Delete" })
    .click();
}

function getVariantRows(models: any, variantName: string) {
  return models.studio.frame
    .locator('[data-test-class="variant-row"]')
    .filter({ hasText: variantName });
}

async function expectVariantPresent(models: any, variantName: string) {
  await models.studio.rightPanel.switchToComponentDataTab();
  await expect(getVariantRows(models, variantName).first()).toBeVisible({
    timeout: 15000,
  });
}

async function expectVariantAbsent(models: any, variantName: string) {
  await models.studio.rightPanel.switchToComponentDataTab();
  await expect(getVariantRows(models, variantName)).toHaveCount(0);
}

async function resetVariants(models: any) {
  await models.studio.rightPanel.switchToComponentDataTab();
  const baseVariant = models.studio.frame
    .locator('[data-test-class="variant-row"]')
    .filter({ hasText: "Base" })
    .first();
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

async function activateRegisteredVariant(models: any, variantName: string) {
  await models.studio.rightPanel.switchToComponentDataTab();
  const row = models.studio.frame
    .locator('[data-test-class="variants-section"]', {
      hasText: "Registered Variants",
    })
    .locator('[data-test-class="variant-row"]')
    .filter({ hasText: variantName })
    .first();
  await row.hover();
  await row.locator('[data-test-class="variant-record-button-start"]').click();
}

test.describe("registered variants", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "react-aria",
          npmPkg: ["@plasmicpkgs/react-aria"],
        },
      ],
    });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can CRUD registered variants from canvas", async ({ page, models }) => {
    await createAndSwitchToButtonArena(page, models);

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.fontSizeInput.nth(1).click();
    await models.studio.rightPanel.fontSizeInput.nth(1).fill("15px");
    await page.keyboard.press("Enter");

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);

    await expectVariantAbsent(models, "Hovered");

    const hoverFrame = await addRegisteredVariantFromVariantsTab(
      page,
      models,
      "Hovered"
    );

    await expectVariantPresent(models, "Hovered");

    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const editingElem = hoverFrame!.locator(".__wab_editing").first();
    await editingElem.waitFor({ state: "attached", timeout: 10000 });

    const contentEditable = editingElem
      .locator('[contenteditable="true"]')
      .first();
    await contentEditable.waitFor({ state: "attached", timeout: 5000 });
    await page.waitForTimeout(500);

    await page.keyboard.press(`${modifierKey}+a`);
    await page.keyboard.type("hovered", { delay: 100 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.fontSizeInput.nth(1).click();
    await models.studio.rightPanel.fontSizeInput.nth(1).fill("20px");
    await page.keyboard.press("Enter");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const button = liveFrame.getByText("Button").first();
      const hovered = liveFrame.getByText("hovered").first();

      await expect(button).toBeVisible();
      await expect(hovered).not.toBeVisible();

      await button.hover();
      await page.waitForTimeout(200);

      await expect(hovered).toBeVisible();
      await expect(button).not.toBeVisible();
      await expect(hovered).toHaveCSS("font-size", "20px");

      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      await expect(button).toBeVisible();
      await expect(hovered).not.toBeVisible();
    });

    await page.keyboard.press("Shift+Enter");
    await page.waitForTimeout(200);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    const confirmButton = models.studio.frame.locator(
      '[data-test-id="confirm"]'
    );
    await confirmButton.waitFor({ state: "visible", timeout: 5000 });
    await confirmButton.click();
    await page.waitForTimeout(1000);

    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await expectVariantAbsent(models, "Hovered");

    await page.waitForTimeout(500);
    await page.keyboard.press(`Control+Z`);
    await page.waitForTimeout(100);
    await page.keyboard.press(`Control+Z`);
    await page.waitForTimeout(100);
    await page.keyboard.press(`Control+Z`);
    await page.waitForTimeout(1000);

    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await expectVariantPresent(models, "Hovered");

    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await editRegisteredVariantFromCanvas(page, models, "Pressed");
    await expectVariantPresent(models, "Pressed");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const button = liveFrame.getByText("Button").first();
      const hovered = liveFrame.getByText("hovered").first();

      await button.hover();
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.waitForTimeout(200);

      await expect(hovered).toBeVisible();
      await expect(button).not.toBeVisible();
      await expect(hovered).toHaveCSS("font-size", "20px");

      await page.mouse.up();
      await page.waitForTimeout(200);

      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);

      await expect(button).toBeVisible();
      await expect(hovered).not.toBeVisible();
    });
  });

  test("can CRUD registered variants from variants tab", async ({
    page,
    models,
  }) => {
    await createAndSwitchToButtonArena(page, models);

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.fontSizeInput.nth(1).click();
    await models.studio.rightPanel.fontSizeInput.nth(1).fill("15px");
    await page.keyboard.press("Enter");

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);

    await expectVariantAbsent(models, "Hovered");

    const hoverFrame = await addRegisteredVariantFromVariantsTab(
      page,
      models,
      "Hovered"
    );

    if (!hoverFrame) {
      throw new Error("Expected a new variant frame to be created");
    }

    await expectVariantPresent(models, "Hovered");
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await page.waitForTimeout(500);

    const textElement = hoverFrame.getByText("Button").first();
    await textElement.click();
    await page.waitForTimeout(500);

    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    const editingElem = hoverFrame.locator(".__wab_editing").first();
    await editingElem.waitFor({ state: "visible", timeout: 5000 });

    const contentEditable = editingElem
      .locator('[contenteditable="true"]')
      .first();
    await contentEditable.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(500);

    await contentEditable.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
    await page.keyboard.type("hovered", { delay: 100 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await editingElem.waitFor({ state: "detached", timeout: 5000 });

    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.fontSizeInput.nth(1).click();
    await models.studio.rightPanel.fontSizeInput.nth(1).fill("20px");
    await page.keyboard.press("Enter");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const button = liveFrame.getByText("Button").first();
      const hovered = liveFrame.getByText("hovered").first();

      await expect(button).toBeVisible();
      await expect(hovered).not.toBeVisible();

      await button.hover();
      await page.waitForTimeout(200);

      await expect(hovered).toBeVisible();
      await expect(button).not.toBeVisible();
      await expect(hovered).toHaveCSS("font-size", "20px");

      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      await expect(button).toBeVisible();
      await expect(hovered).not.toBeVisible();
    });

    await deleteRegisteredVariantFromVariantsTab(models, "Hovered");
    await page.waitForTimeout(500);
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await expectVariantAbsent(models, "Hovered");

    await page.keyboard.press("Control+z");
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(1000);

    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await expectVariantPresent(models, "Hovered");

    await editRegisteredVariantFromVariantsTab(
      page,
      models,
      "Hovered",
      "Pressed"
    );
    await expectVariantPresent(models, "Pressed");
    await expectVariantAbsent(models, "Hovered");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const button = liveFrame.getByText("Button").first();
      const hovered = liveFrame.getByText("hovered").first();

      await button.hover();
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.waitForTimeout(200);

      await expect(hovered).toBeVisible();
      await expect(button).not.toBeVisible();
      await expect(hovered).toHaveCSS("font-size", "20px");

      await page.mouse.up();
      await page.waitForTimeout(200);

      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);

      await expect(button).toBeVisible();
      await expect(hovered).not.toBeVisible();
    });
  });

  test("can CRUD registered variants in focus mode", async ({
    page,
    models,
  }) => {
    await createAndSwitchToButtonArena(page, models);

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.fontSizeInput.nth(1).click();
    await models.studio.rightPanel.fontSizeInput.nth(1).fill("15px");
    await page.keyboard.press("Enter");

    await models.studio.turnOffDesignMode();

    await models.studio.rightPanel.switchToComponentDataTab();
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);

    await expectVariantAbsent(models, "Disabled");

    await addRegisteredVariantFromVariantsTab(page, models, "Disabled", {
      expectNewFrame: false,
    });
    await expectVariantPresent(models, "Disabled");

    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const focusFrame = models.studio.getComponentFrameByIndex(2);

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const editingElem = focusFrame.locator(".__wab_editing").first();
    await editingElem.waitFor({ state: "attached", timeout: 10000 });

    const contentEditable = editingElem
      .locator('[contenteditable="true"]')
      .first();
    await contentEditable.waitFor({ state: "attached", timeout: 5000 });
    await page.waitForTimeout(500);

    await page.keyboard.press(`${modifierKey}+a`);
    await page.keyboard.type("this button is disabled", { delay: 100 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.fontSizeInput.first().click();
    await models.studio.rightPanel.fontSizeInput.first().fill("20px");
    await page.keyboard.press("Enter");

    const disabledText = models.studio
      .getComponentFrameByIndex(2)
      .getByRole("button", { name: "this button is disabled" })
      .first();
    const buttonInFocus = models.studio
      .getComponentFrameByIndex(2)
      .getByText("Button", { exact: true })
      .first();
    const buttonElement = models.studio
      .getComponentFrameByIndex(2)
      .getByRole("button")
      .first();
    await expect(disabledText).toHaveCSS("font-size", "20px");
    await expect(buttonInFocus).toBeHidden();

    await resetVariants(models);
    await expect(disabledText).not.toBeVisible();
    await expect(buttonInFocus).not.toHaveCSS("font-size", "20px");

    await models.studio.selectRootNode();
    await models.studio.rightPanel.switchToSettingsTab();
    await models.studio.frame
      .locator('[data-plasmic-prop="isDisabled"]')
      .click();
    await page.waitForTimeout(500);

    await expect(disabledText).toHaveCSS("font-size", "20px");

    await switchInteractiveMode(models);
    await expect(disabledText).toHaveCSS("font-size", "20px");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(
        liveFrame.getByRole("button", { name: "this button is disabled" })
      ).toHaveCSS("font-size", "20px");
      await expect(liveFrame.getByText("Button", { exact: true })).toBeHidden();
    });

    await models.studio.selectRootNode();
    await models.studio.rightPanel.switchToSettingsTab();
    await models.studio.frame
      .locator('[data-plasmic-prop="isDisabled"]')
      .click();
    await page.waitForTimeout(500);

    await editRegisteredVariantFromVariantsTab(
      page,
      models,
      "Disabled",
      "Hovered"
    );
    await expectVariantPresent(models, "Hovered");
    await expectVariantAbsent(models, "Disabled");

    await activateRegisteredVariant(models, "Hovered");
    await models.studio.leftPanel.selectTreeNode(["Aria Button"]);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    await models.studio.leftPanel.selectTreeNode([`Slot: "children"`]);
    await page.waitForTimeout(500);

    const focusFrame2 = models.studio.getComponentFrameByIndex(2);

    await models.studio.leftPanel.selectTreeNode([`"this button is disabled"`]);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const editingElem2 = focusFrame2.locator(".__wab_editing").first();
    await editingElem2.waitFor({ state: "visible", timeout: 5000 });

    const contentEditable2 = editingElem2
      .locator('[contenteditable="true"]')
      .first();
    await contentEditable2.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(500);

    await contentEditable2.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
    await page.keyboard.type("this button is hovered", { delay: 100 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await editingElem2.waitFor({ state: "detached", timeout: 5000 });

    await models.studio.rightPanel.designTabButton.click();
    await models.studio.rightPanel.fontSizeInput.click();
    await models.studio.rightPanel.fontSizeInput.fill("20px");
    await page.keyboard.press("Enter");

    const hoveredText = models.studio
      .getComponentFrameByIndex(2)
      .getByText("this button is hovered")
      .first();
    await expect(hoveredText).toHaveCSS("font-size", "20px");

    await resetVariants(models);
    await expect(hoveredText).not.toBeVisible();

    await buttonElement.hover();
    await page.waitForTimeout(200);
    await expect(hoveredText).toHaveCSS("font-size", "20px");
    await expect(buttonInFocus).toBeHidden();

    await switchInteractiveMode(models);
    await buttonElement.hover({ force: true });
    await page.waitForTimeout(200);
    await expect(hoveredText).not.toBeVisible();

    await models.studio.withinLiveMode(async (liveFrame) => {
      const liveButton = liveFrame.getByText(/Button/).first();
      const liveButtonElement = liveFrame.getByRole("button").first();
      const liveHovered = liveFrame.getByText("this button is hovered").first();

      await expect(liveButton).not.toHaveCSS("font-size", "20px");

      await liveButtonElement.hover();
      await page.waitForTimeout(200);
      await expect(liveHovered).toHaveCSS("font-size", "20px");
      await expect(liveButton).not.toBeVisible();

      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      await expect(liveButton).not.toHaveCSS("font-size", "10px");
      await expect(liveHovered).not.toBeVisible();
    });
  });
});
