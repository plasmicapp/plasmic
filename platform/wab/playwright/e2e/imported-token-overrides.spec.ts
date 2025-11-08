import { expect, FrameLocator } from "@playwright/test";
import { test } from "../fixtures/test";

const TEST_COLORS = {
  PRIMARY: "#ff0000",
  PRIMARY_DARK: "#aa0000",
  PRIMARY_OVERRIDE_BASE: "#0000ff",
  PRIMARY_OVERRIDE_VARIANT: "#0000aa",
  SECONDARY: "#00ff00",
  SECONDARY_OVERRIDE: "#00aa00",
  SECONDARY_NEW: "#00aaaa",
  ANTD: "#ff4d4f",
  ANTD_OVERRIDE: "#0000ff",
};

const TEST_FONT_SIZES = {
  B_DEFAULT: "16px",
  LARGE: "16px",
  LARGE_OVERRIDE_BASE: "24px",
  LARGE_OVERRIDE_VARIANT: "32px",
};

const TEST_TEXTS = {
  FROM_DEP_COMP: "From Dep Comp",
  FROM_DEP_COMP_PARENT: "From Dep Comp Parent",
  FROM_MAIN_PROJECT_TEXT_1: "Text 1 From Main Project",
  FROM_MAIN_PROJECT_TEXT_2: "Text 2 From Main Project",
  FROM_B_COMP: "From Comp B",
  SLOT_FROM_B_COMP: "Slot from Comp B",
  PRIMARY_TEXT: "Primary Text",
  SECONDARY_TEXT: "Secondary Text",
};

const TOKEN_NAMES = {
  PRIMARY: "primary",
  LARGE: "large",
  SECONDARY: "secondary",
  ANTD: "System: Error",
};

function hexToRgbString(hex: string) {
  hex = hex.replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const num = parseInt(hex, 16);
  const { r, g, b } = {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
  return `rgb(${r}, ${g}, ${b})`;
}

async function switchToStyleTokensTab(models: any) {
  const assetsTab = models.studio.frame.locator('[data-test-tabkey="assets"]');
  await assetsTab.waitFor({ state: "visible", timeout: 5000 });
  await assetsTab.hover();

  const tokensTab = models.studio.frame.locator(
    'button[data-test-tabkey="tokens"]'
  );
  await tokensTab.waitFor({ state: "visible", timeout: 5000 });

  await tokensTab.scrollIntoViewIfNeeded();
  await models.studio.page.waitForTimeout(200);

  const box = await tokensTab.boundingBox();
  if (!box) {
    throw new Error("Tokens tab button has no bounding box");
  }

  let clickSucceeded = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await tokensTab.click({ timeout: 3000 });
      clickSucceeded = true;
      break;
    } catch (error) {
      if (attempt === 2) {
        await tokensTab.click({ force: true });
        clickSucceeded = true;
        break;
      }
      await tokensTab.scrollIntoViewIfNeeded();
      await models.studio.page.waitForTimeout(300);
    }
  }

  if (!clickSucceeded) {
    throw new Error("Failed to click tokens tab after 3 attempts");
  }

  await models.studio.page.waitForTimeout(300);
}

async function expandAllTokensPanel(models: any) {
  const expandButton = models.studio.frame.locator(
    '[data-test-id="tokens-panel-expand-all"]'
  );
  if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expandButton.click({ force: true });
  }
}

async function getTokensPanel(models: any) {
  return models.studio.frame.locator('[data-test-id="tokens-panel-content"]');
}

async function changeTokensTarget(models: any, targetName: string) {
  const variantSelect = models.studio.frame.locator(
    '[data-test-id="global-variant-select"]'
  );
  await variantSelect.waitFor({ state: "visible", timeout: 5000 });
  await variantSelect.click();

  const overlay = models.studio.frame.locator('[data-plasmic-role="overlay"]');
  await overlay.waitFor({ state: "visible", timeout: 5000 });

  const targetOption = overlay.getByText(targetName, { exact: true });
  await targetOption.waitFor({ state: "visible", timeout: 5000 });
  await targetOption.click();

  await overlay.waitFor({ state: "hidden", timeout: 5000 });
}

async function closeSidebarModal(models: any) {
  const modal = models.studio.frame.locator("#sidebar-modal");
  if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
    await models.studio.page.keyboard.press("Escape");
  }
}

async function createToken(
  models: any,
  tokenType: "Color" | "FontSize",
  name: string,
  value: string
) {
  const isTokensPanelVisible = await models.studio.leftPanel.frame
    .locator('[data-test-id="tokens-panel-content"]')
    .isVisible();
  if (!isTokensPanelVisible) {
    await switchToStyleTokensTab(models);
  }
  const addButton = models.studio.frame.locator(
    `[data-test-id="add-token-button-${tokenType}"]`
  );
  await models.studio.frame.locator("li").filter({ has: addButton }).hover();
  await addButton.waitFor();
  await addButton.click({ force: true });

  const modal = models.studio.frame.locator("#sidebar-modal");
  await modal.waitFor({ state: "visible", timeout: 5000 });

  await models.studio.page.keyboard.type(name);

  const input = modal.locator(
    `.panel-popup-content [data-test-id="${tokenType}-input"]`
  );
  await input.click();
  await input.fill("");
  await input.type(`${value}`);
  await models.studio.page.keyboard.press("Enter");

  await closeSidebarModal(models);
}

async function updateToken(
  models: any,
  tokenType: "Color" | "FontSize",
  tokenName: string,
  value: string,
  opts: {
    globalVariant?: string;
    override?: boolean;
  } = {}
) {
  const isTokensPanelVisible = await models.studio.leftPanel.frame
    .locator('[data-test-id="tokens-panel-content"]')
    .isVisible();
  if (!isTokensPanelVisible) {
    await switchToStyleTokensTab(models);
  }
  await expandAllTokensPanel(models);

  await changeTokensTarget(models, opts.globalVariant ?? "Base");

  const variantSelect = models.studio.frame.locator(
    '[data-test-id="global-variant-select"]'
  );
  const expectedValue = opts.globalVariant ?? "Base";
  await variantSelect
    .locator(`[title="${expectedValue}"]`)
    .first()
    .waitFor({ state: "attached", timeout: 3000 })
    .catch(() => {
      // Fallback to a short wait if the title check doesn't work
      return models.studio.page.waitForTimeout(300);
    });

  // Get tokenRow after changing target to avoid stale element
  const tokensPanel = await getTokensPanel(models);
  const tokenRow = tokensPanel.getByText(tokenName).first();

  if (opts.override) {
    await tokenRow.click({ button: "right" });

    // Wait for context menu and its items to be fully rendered
    const contextMenu = models.studio.frame.locator('[role="menu"]').last();
    await contextMenu.waitFor({ state: "visible", timeout: 5000 });

    // Wait for menu items to be rendered within the context menu
    await contextMenu
      .locator('[role="menuitem"]')
      .first()
      .waitFor({ state: "visible", timeout: 3000 });

    const overrideMenuItem = contextMenu.getByRole("menuitem", {
      name: /Override.*value/i,
    });

    await overrideMenuItem.waitFor({ state: "visible", timeout: 5000 });
    await overrideMenuItem.scrollIntoViewIfNeeded();
    await overrideMenuItem.click({ timeout: 3000 });
  } else {
    await tokenRow.click();
  }

  const modal = models.studio.frame.locator("#sidebar-modal");
  await modal.waitFor({ state: "visible", timeout: 5000 });

  if (opts.override) {
    const readonlyInput = modal.locator(".panel-popup-title input[readonly]");
    await readonlyInput.waitFor({ state: "visible", timeout: 3000 });
  }

  const input = modal.locator(
    `.panel-popup-content [data-test-id="${tokenType}-input"]`
  );

  // Wait for input to be ready
  await input.waitFor({ state: "visible", timeout: 3000 });

  // Clear and fill the input in one operation
  await input.click();
  await input.fill(value);

  // Verify the value was set
  await expect(input).toHaveValue(value, { timeout: 2000 });

  await models.studio.page.keyboard.press("Enter");

  // Wait for modal to start closing
  await modal.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {
    // If modal doesn't close automatically, closeSidebarModal will handle it
  });

  await closeSidebarModal(models);
}

async function deleteToken(models: any, tokenName: string) {
  const isTokensPanelVisible = await models.studio.leftPanel.frame
    .locator('[data-test-id="tokens-panel-content"]')
    .isVisible();
  if (!isTokensPanelVisible) {
    await switchToStyleTokensTab(models);
  }
  await expandAllTokensPanel(models);

  const tokensPanel = await getTokensPanel(models);
  const tokenRow = tokensPanel.getByText(tokenName).first();
  await tokenRow.click({ button: "right" });

  const menuItem = models.studio.frame.locator('[role="menuitem"]');
  const deleteMenuItem = menuItem.getByText("Delete");
  await deleteMenuItem.waitFor({ state: "visible", timeout: 3000 });
  await deleteMenuItem.click();

  const modalContent = models.studio.frame.locator(".ant-modal-content");
  const submitButton = modalContent.locator('button[type="submit"]');
  await submitButton.click();
  await modalContent.waitFor({ state: "hidden", timeout: 3000 });
}

async function removeTokenOverride(
  models: any,
  tokenName: string,
  opts: { globalVariant?: string } = {}
) {
  const isTokensPanelVisible = await models.studio.leftPanel.frame
    .locator('[data-test-id="tokens-panel-content"]')
    .isVisible();
  if (!isTokensPanelVisible) {
    await switchToStyleTokensTab(models);
  }
  await expandAllTokensPanel(models);

  await changeTokensTarget(models, opts.globalVariant ?? "Base");

  const tokensPanel = await getTokensPanel(models);
  const tokenRow = tokensPanel.getByText(tokenName).first();
  await tokenRow.click({ button: "right" });

  // Wait for context menu and its items to be fully rendered
  const contextMenu = models.studio.frame.locator('[role="menu"]').last();
  await contextMenu.waitFor({ state: "visible", timeout: 5000 });

  // Wait for menu items to be rendered
  await contextMenu
    .locator('[role="menuitem"]')
    .first()
    .waitFor({ state: "visible", timeout: 3000 });

  // Look for the remove menu item
  const removeMenuItem = contextMenu.getByRole("menuitem", {
    name: /Remove.*override/i,
  });
  await removeMenuItem.waitFor({ state: "visible", timeout: 5000 });
  await removeMenuItem.scrollIntoViewIfNeeded();
  await removeMenuItem.click({ timeout: 3000 });
}

async function assertTokenIndicator(
  models: any,
  tokenName: string,
  indicator:
    | "local"
    | "local-varianted"
    | "override-base"
    | "override-varianted"
    | "override-both"
    | "override-none",
  baseVariantName: "Base",
  globalVariantName?: string
) {
  const isTokensPanelVisible = await models.studio.leftPanel.frame
    .locator('[data-test-id="tokens-panel-content"]')
    .isVisible();
  if (!isTokensPanelVisible) {
    await switchToStyleTokensTab(models);
  }
  await expandAllTokensPanel(models);

  const getIndicatorElement = async () => {
    const tokensPanel = await getTokensPanel(models);
    const tokenRow = tokensPanel.getByText(tokenName).first();
    return tokenRow
      .locator(".. >> .. >> ..")
      .locator('[class*="DefinedIndicator"]');
  };

  switch (indicator) {
    case "local":
      await changeTokensTarget(models, baseVariantName);
      await expect(await getIndicatorElement()).not.toBeVisible();
      if (globalVariantName) {
        await changeTokensTarget(models, globalVariantName);
        const variantIndicator = await getIndicatorElement();
        await expect(variantIndicator).toHaveClass(
          /DefinedIndicator--inherited/
        );
      }
      break;
    case "local-varianted":
      await changeTokensTarget(models, baseVariantName);
      await expect(await getIndicatorElement()).not.toBeVisible();
      if (globalVariantName) {
        await changeTokensTarget(models, globalVariantName);
        const variantIndicator = await getIndicatorElement();
        await expect(variantIndicator).toHaveClass(
          /DefinedIndicator--overriding/
        );
      }
      break;
    case "override-none":
      await changeTokensTarget(models, baseVariantName);
      {
        const baseIndicator = await getIndicatorElement();
        await expect(baseIndicator).toHaveClass(/DefinedIndicator--inherited/);
      }
      if (globalVariantName) {
        await changeTokensTarget(models, globalVariantName);
        const variantIndicator = await getIndicatorElement();
        await expect(variantIndicator).toHaveClass(
          /DefinedIndicator--inherited/
        );
      }
      break;
    case "override-base":
      await changeTokensTarget(models, baseVariantName);
      {
        const baseIndicator = await getIndicatorElement();
        await expect(baseIndicator).toHaveClass(/DefinedIndicator--set/);
      }
      if (globalVariantName) {
        await changeTokensTarget(models, globalVariantName);
        const variantIndicator = await getIndicatorElement();
        await expect(variantIndicator).toHaveClass(
          /DefinedIndicator--inherited/
        );
      }
      break;
    case "override-varianted":
      await changeTokensTarget(models, baseVariantName);
      {
        const baseIndicator = await getIndicatorElement();
        await expect(baseIndicator).toHaveClass(/DefinedIndicator--inherited/);
      }
      if (globalVariantName) {
        await changeTokensTarget(models, globalVariantName);
        const variantIndicator = await getIndicatorElement();
        await expect(variantIndicator).toHaveClass(
          /DefinedIndicator--overriding/
        );
      }
      break;
    case "override-both":
      await changeTokensTarget(models, baseVariantName);
      {
        const baseIndicator = await getIndicatorElement();
        await expect(baseIndicator).toHaveClass(/DefinedIndicator--set/);
      }
      if (globalVariantName) {
        await changeTokensTarget(models, globalVariantName);
        const variantIndicator = await getIndicatorElement();
        await expect(variantIndicator).toHaveClass(
          /DefinedIndicator--overriding/
        );
      }
      break;
  }
}

async function chooseColor(
  models: any,
  opts: { color?: string; tokenName?: string }
) {
  await models.studio.rightPanel.designTabButton.click();

  const colorSelector = models.studio.frame.locator(
    `.canvas-editor__right-pane [data-test-id='color-selector'] button`
  );
  await colorSelector.first().click({ force: true });

  if (opts?.color) {
    await models.studio.page.waitForTimeout(100);
    await models.studio.page.keyboard.type(opts.color);
    await models.studio.page.waitForTimeout(100);
    await models.studio.page.keyboard.press("Enter");
    await models.studio.page.waitForTimeout(100);
  } else if (opts?.tokenName) {
    const searchInput = models.studio.frame.locator(
      'input[placeholder="Search for token"]'
    );
    await models.studio.page.waitForTimeout(100);
    await searchInput.type(`${opts.tokenName}`);
    await models.studio.page.waitForTimeout(100);
    await models.studio.page.keyboard.press("Enter");
    await models.studio.page.waitForTimeout(100);
  }

  await closeSidebarModal(models);
}

async function createGlobalVariantGroup(
  models: any,
  groupName: string,
  variantName: string
) {
  await models.studio.rightPanel.switchToComponentDataTab();

  const addButton = models.studio.frame.locator(
    '[data-test-id="add-global-variant-group-button"]'
  );
  await addButton.click();
  await models.studio.page.waitForTimeout(200);
  await models.studio.page.keyboard.type(`${groupName}`);
  await models.studio.page.waitForTimeout(200);
  await models.studio.page.keyboard.press("Enter");
  await models.studio.page.waitForTimeout(200);
  await models.studio.page.keyboard.type(`${variantName}`);
  await models.studio.page.waitForTimeout(200);
  await models.studio.page.keyboard.press("Enter");
}

async function selectVariant(
  models: any,
  groupName: string,
  variantName: string,
  isGlobal: boolean = false
) {
  await models.studio.rightPanel.switchToComponentDataTab();
  await models.studio.page.waitForTimeout(300);

  if (isGlobal) {
    const globalVariantsExpand = models.studio.frame.locator(
      '[data-test-id="test-id_2"] [data-show-extra-content="false"]'
    );
    const isVisible = await globalVariantsExpand.isVisible();
    if (isVisible) {
      await globalVariantsExpand.click();
      await models.studio.page.waitForTimeout(300);
    }
  }

  const variantRow = models.studio.rightPanel.frame
    .locator('[data-test-class="variants-section"]')
    .filter({ hasText: groupName })
    .filter({ hasText: variantName })
    .first();

  await variantRow.hover();
  await models.studio.page.waitForTimeout(200);

  const startButton = variantRow.locator(
    '[data-test-class="variant-record-button-start"]'
  );
  await startButton.click();
  await models.studio.page.waitForTimeout(300);
}

async function resetVariants(models: any) {
  const variantsBarTrigger = models.studio.frame.locator(
    '[data-test-id="variants-bar-dropdown-trigger"]'
  );
  await variantsBarTrigger.click();
  await models.studio.page.waitForTimeout(200);
  await models.studio.page.keyboard.press("Enter");
  await models.studio.page.waitForTimeout(200);
  await models.studio.page.keyboard.press("Escape");
  await models.studio.page.waitForTimeout(200);
}

async function importProject(models: any, projectId: string) {
  const isImportedPanelVisible = await models.studio.leftPanel.frame
    .getByText("Imported projects")
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (!isImportedPanelVisible) {
    const moreTab = models.studio.frame.locator('[data-test-tabkey="more"]');
    await moreTab.waitFor({ state: "visible", timeout: 5000 });
    await moreTab.hover();
    await models.studio.page.waitForTimeout(300);
    await models.studio.leftPanel.switchToImportsTab();
  }
  await models.studio.page.waitForTimeout(500);

  const selector = ".SidebarSectionListItem";
  const countBefore = await models.studio.frame.locator(selector).count();

  const importButton = models.studio.frame.locator(
    '[data-test-id="import-btn"]'
  );
  await importButton.waitFor({ state: "visible", timeout: 5000 });
  await importButton.click();

  const promptInput = models.studio.frame.locator('[data-test-id="prompt"]');
  await promptInput.waitFor({ state: "visible", timeout: 5000 });
  await models.studio.page.waitForTimeout(200);

  await promptInput.fill(projectId);
  await models.studio.page.waitForTimeout(300);

  await models.studio.page.keyboard.press("Enter");

  await models.studio.frame
    .locator(selector)
    .nth(countBefore)
    .waitFor({ state: "visible", timeout: 15000 });

  await models.studio.page.waitForTimeout(500);
}

async function updateAllImports(models: any) {
  await models.studio.leftPanel.switchToImportsTab();
  await models.studio.page.waitForTimeout(500);

  const checkButton = models.studio.frame.locator(
    '[data-test-id="check-for-updates-btn"]'
  );
  await checkButton.waitFor({ state: "visible", timeout: 5000 });
  await checkButton.click();

  await models.studio.page.waitForTimeout(1000);

  const updateButtons = models.studio.frame.locator(
    `.SidebarSectionListItem button svg`
  );

  const hasUpdates = await updateButtons
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (!hasUpdates) {
    return;
  }

  let updatesRemaining = await updateButtons.count();

  while (updatesRemaining > 0) {
    const firstButton = updateButtons.first();
    await firstButton.waitFor({ state: "visible", timeout: 5000 });
    await firstButton.scrollIntoViewIfNeeded();
    await models.studio.page.waitForTimeout(200);

    await firstButton.click();

    const modalContent = models.studio.frame.locator(".ant-modal-content");
    await modalContent.waitFor({ state: "visible", timeout: 5000 });

    const submitButton = modalContent.locator('button[type="submit"]');
    await submitButton.waitFor({ state: "visible", timeout: 5000 });
    await submitButton.click();

    await modalContent.waitFor({ state: "hidden", timeout: 10000 });
    await models.studio.page.waitForTimeout(500);

    const newCount = await updateButtons.count();
    if (newCount >= updatesRemaining) {
      break;
    }
    updatesRemaining = newCount;
  }

  await expect(updateButtons.first()).not.toBeVisible({ timeout: 5000 });
}

async function removeAllDependencies(models: any) {
  await models.studio.leftPanel.switchToTreeTab();
  await models.studio.leftPanel.switchToImportsTab();

  await models.studio.page.waitForTimeout(500);

  const listItems = models.studio.frame.locator(`.SidebarSectionListItem`);

  const hasItems = await listItems
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (!hasItems) {
    return;
  }

  let itemsRemaining = await listItems.count();

  while (itemsRemaining > 0) {
    const firstItem = listItems.first();
    await firstItem.waitFor({ state: "visible", timeout: 5000 });

    await models.studio.page.waitForTimeout(200);

    await firstItem.scrollIntoViewIfNeeded();
    await models.studio.page.waitForTimeout(100);

    let clickSucceeded = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await firstItem.click({ button: "right", timeout: 5000 });
        clickSucceeded = true;
        break;
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
        await models.studio.page.waitForTimeout(500);
      }
    }

    if (!clickSucceeded) {
      throw new Error(
        "Failed to right-click on dependency item after 3 attempts"
      );
    }

    const removeMenuItem = models.studio.frame.getByText(
      "Remove imported project"
    );
    await removeMenuItem.waitFor({ state: "visible", timeout: 5000 });
    await removeMenuItem.click();

    const modalContent = models.studio.frame.locator(".ant-modal-content");
    await modalContent.waitFor({ state: "visible", timeout: 5000 });

    const submitButton = modalContent.locator('button[type="submit"]');
    await submitButton.waitFor({ state: "visible", timeout: 5000 });
    await submitButton.click();

    await modalContent.waitFor({ state: "hidden", timeout: 5000 });

    await models.studio.page.waitForTimeout(500);

    const newCount = await listItems.count();
    if (newCount >= itemsRemaining) {
      throw new Error(
        `Failed to remove dependency item. Count before: ${itemsRemaining}, after: ${newCount}`
      );
    }
    itemsRemaining = newCount;
  }

  await expect(listItems.first()).not.toBeVisible({ timeout: 5000 });
}

test.describe("Imported token overrides", () => {
  let origDevFlags: any;

  test.beforeEach(async ({ apiClient }) => {
    origDevFlags = await apiClient.getDevFlags();
    await apiClient.upsertDevFlags({
      ...origDevFlags,
      importedTokenOverrides: true,
    });
  });

  test.afterEach(async ({ apiClient }) => {
    if (origDevFlags) {
      await apiClient.upsertDevFlags(origDevFlags);
    }
  });

  test.describe("Should work (A <- B, A <- C)", () => {
    async function setupDependencyProjects(
      page: any,
      models: any,
      apiClient: any
    ) {
      const dep1ProjectId = await apiClient.setupNewProject({
        name: "Dep Project",
      });

      await page.waitForTimeout(500);

      await page.goto(`/projects/${dep1ProjectId}`);
      await models.studio.waitForFrameToLoad();

      await models.studio.leftPanel.addComponent("Dep Comp");
      await models.studio.waitForFrameToLoad();

      await models.studio.createComponentProp({
        propName: "Text",
        propType: "text",
        defaultValue: TEST_TEXTS.FROM_DEP_COMP,
      });

      await createGlobalVariantGroup(models, "Theme", "Dark");
      await createToken(
        models,
        "Color",
        TOKEN_NAMES.PRIMARY,
        TEST_COLORS.PRIMARY
      );
      await createToken(
        models,
        "FontSize",
        TOKEN_NAMES.LARGE,
        TEST_FONT_SIZES.LARGE
      );

      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.PRIMARY,
        TEST_COLORS.PRIMARY_DARK,
        {
          globalVariant: "Dark",
        }
      );

      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "local-varianted",
        "Base",
        "Dark"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.LARGE,
        "local",
        "Base",
        "Dark"
      );

      await models.studio.insertTextWithDynamic("$props.text");
      await chooseColor(models, { tokenName: TOKEN_NAMES.PRIMARY });
      await models.studio.rightPanel.chooseFontSize(TOKEN_NAMES.LARGE);

      await models.studio.createNewPage("Dep Page");
      await models.studio.waitForFrameToLoad();

      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.leftPanel.insertNode("Dep Comp");

      await models.studio.rightPanel.switchToSettingsTab();
      await models.studio.rightPanel.setDataPlasmicProp(
        "Text",
        TEST_TEXTS.FROM_DEP_COMP_PARENT,
        {
          reset: true,
        }
      );

      await models.studio.leftPanel.selectTreeNode(["Dep Comp"]);
      await models.studio.extractComponentNamed("Dep Comp Parent");

      await page.waitForTimeout(500);
      await models.studio.publishVersion("New tokens");

      const dep2ProjectId = await apiClient.setupNewProject({
        name: "Dep Project 2",
      });
      await page.goto(`/projects/${dep2ProjectId}`, {
        waitUntil: "domcontentloaded",
      });
      await models.studio.waitForFrameToLoad();

      await createToken(
        models,
        "Color",
        TOKEN_NAMES.SECONDARY,
        TEST_COLORS.SECONDARY
      );
      await page.waitForTimeout(1000);
      await models.studio.publishVersion("New tokens");

      return { dep1ProjectId, dep2ProjectId };
    }

    async function setupMainProject(
      page: any,
      models: any,
      apiClient: any,
      dep1ProjectId: string,
      dep2ProjectId: string
    ) {
      const mainProjectId = await apiClient.setupNewProject({
        name: "Main Project",
      });
      await page.goto(`/projects/${mainProjectId}`, {
        waitUntil: "domcontentloaded",
      });
      await models.studio.waitForFrameToLoad();

      await importProject(models, dep1ProjectId);
      await importProject(models, dep2ProjectId);

      await page.waitForTimeout(1500);

      await models.studio.leftPanel.addButton.waitFor({
        state: "visible",
        timeout: 10000,
      });

      await models.studio.createNewPage("New Page");
      await models.studio.waitForFrameToLoad();

      await createGlobalVariantGroup(models, "Platform", "Website");
      await resetVariants(models);

      await models.studio.leftPanel.insertNode("Dep Comp Parent");
      await models.studio.leftPanel.insertNode("Dep Comp");
      await models.studio.leftPanel.insertNode("Text");

      const selectedElt = await models.studio.getSelectedElt();
      await selectedElt.dblclick({ force: true });
      await page.waitForTimeout(200);
      await page.keyboard.type(TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1);
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");

      await chooseColor(models, { tokenName: TOKEN_NAMES.PRIMARY });
      await models.studio.rightPanel.chooseFontSize(TOKEN_NAMES.LARGE);

      await models.studio.leftPanel.insertNode("Text");
      const selectedElt2 = await models.studio.getSelectedElt();
      await selectedElt2.dblclick({ force: true });
      await page.waitForTimeout(200);
      await page.keyboard.type(TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_2);
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");

      await chooseColor(models, { tokenName: TOKEN_NAMES.SECONDARY });

      return mainProjectId;
    }

    test("Part 1: Basic overrides and variant testing", async ({
      page,
      models,
      apiClient,
    }) => {
      const { dep1ProjectId, dep2ProjectId } = await setupDependencyProjects(
        page,
        models,
        apiClient
      );
      const mainProjectId = await setupMainProject(
        page,
        models,
        apiClient,
        dep1ProjectId,
        dep2ProjectId
      );
      const frame = models.studio.componentFrame;

      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.PRIMARY,
        TEST_FONT_SIZES.LARGE,
        frame
      );
      await assertTextStyling(
        TEST_TEXTS.FROM_DEP_COMP,
        TEST_COLORS.PRIMARY,
        TEST_FONT_SIZES.LARGE,
        frame
      );
      await assertTextStyling(
        TEST_TEXTS.FROM_DEP_COMP_PARENT,
        TEST_COLORS.PRIMARY,
        TEST_FONT_SIZES.LARGE,
        frame
      );

      await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
        await assertTextStyling(
          TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
          TEST_COLORS.PRIMARY,
          TEST_FONT_SIZES.LARGE,
          liveFrame
        );
        await assertTextStyling(
          TEST_TEXTS.FROM_DEP_COMP,
          TEST_COLORS.PRIMARY,
          TEST_FONT_SIZES.LARGE,
          liveFrame
        );
        await assertTextStyling(
          TEST_TEXTS.FROM_DEP_COMP_PARENT,
          TEST_COLORS.PRIMARY,
          TEST_FONT_SIZES.LARGE,
          liveFrame
        );
      });

      await switchToStyleTokensTab(models);
      await expandAllTokensPanel(models);

      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "override-none",
        "Base",
        "Website"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.LARGE,
        "override-none",
        "Base",
        "Website"
      );

      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.PRIMARY,
        TEST_COLORS.PRIMARY_OVERRIDE_BASE,
        {
          override: true,
        }
      );
      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.SECONDARY,
        TEST_COLORS.SECONDARY_OVERRIDE,
        {
          override: true,
        }
      );

      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "override-base",
        "Base",
        "Website"
      );

      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.PRIMARY,
        TEST_COLORS.PRIMARY_OVERRIDE_VARIANT,
        {
          globalVariant: "Website",
          override: true,
        }
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "override-both",
        "Base",
        "Website"
      );

      await updateToken(
        models,
        "FontSize",
        TOKEN_NAMES.LARGE,
        TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
        {
          globalVariant: "Website",
          override: true,
        }
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.LARGE,
        "override-varianted",
        "Base",
        "Website"
      );

      await updateToken(
        models,
        "FontSize",
        TOKEN_NAMES.LARGE,
        TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
        {
          override: true,
        }
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.LARGE,
        "override-both",
        "Base",
        "Website"
      );

      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.PRIMARY_OVERRIDE_BASE,
        TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
        frame
      );

      await selectVariant(models, "Theme", "Dark", true);
      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.PRIMARY_DARK,
        TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
        frame
      );

      await selectVariant(models, "Platform", "Website", true);
      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.PRIMARY_OVERRIDE_VARIANT,
        TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
        frame
      );

      await page.waitForTimeout(500);
      await removeAllDependencies(models);
      await apiClient.removeProjectAfterTest(
        mainProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
      await apiClient.removeProjectAfterTest(
        dep2ProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
      await apiClient.removeProjectAfterTest(
        dep1ProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    });

    test("Part 2: Override removal and dependency updates", async ({
      page,
      models,
      apiClient,
    }) => {
      const { dep1ProjectId, dep2ProjectId } = await setupDependencyProjects(
        page,
        models,
        apiClient
      );
      const mainProjectId = await setupMainProject(
        page,
        models,
        apiClient,
        dep1ProjectId,
        dep2ProjectId
      );
      const frame = models.studio.componentFrame;

      await switchToStyleTokensTab(models);
      await expandAllTokensPanel(models);

      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.PRIMARY,
        TEST_COLORS.PRIMARY_OVERRIDE_BASE,
        {
          override: true,
        }
      );
      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.SECONDARY,
        TEST_COLORS.SECONDARY_OVERRIDE,
        {
          override: true,
        }
      );

      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.PRIMARY,
        TEST_COLORS.PRIMARY_OVERRIDE_VARIANT,
        {
          globalVariant: "Website",
          override: true,
        }
      );

      await updateToken(
        models,
        "FontSize",
        TOKEN_NAMES.LARGE,
        TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
        {
          globalVariant: "Website",
          override: true,
        }
      );

      await updateToken(
        models,
        "FontSize",
        TOKEN_NAMES.LARGE,
        TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
        {
          override: true,
        }
      );

      await resetVariants(models);

      await removeTokenOverride(models, TOKEN_NAMES.PRIMARY);
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "override-varianted",
        "Base",
        "Website"
      );

      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.PRIMARY,
        TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
        frame
      );

      await selectVariant(models, "Platform", "Website", true);
      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.PRIMARY_OVERRIDE_VARIANT,
        TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
        frame
      );

      await removeTokenOverride(models, TOKEN_NAMES.PRIMARY, {
        globalVariant: "Website",
      });

      await assertTokenIndicator(
        models,
        TOKEN_NAMES.LARGE,
        "override-both",
        "Base",
        "Website"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "override-none",
        "Base",
        "Website"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.SECONDARY,
        "override-base",
        "Base",
        "Website"
      );

      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.PRIMARY,
        TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
        frame
      );

      await page.keyboard.press("Control+z");
      await page.waitForTimeout(200);
      await page.keyboard.press("Control+y");
      await page.waitForTimeout(200);

      await assertTokenIndicator(
        models,
        TOKEN_NAMES.LARGE,
        "override-both",
        "Base",
        "Website"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "override-none",
        "Base",
        "Website"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.SECONDARY,
        "override-base",
        "Base",
        "Website"
      );

      await page.goto(`/projects/${dep1ProjectId}`, {
        waitUntil: "domcontentloaded",
      });
      await models.studio.waitForFrameToLoad();
      await page.keyboard.press("Escape");
      await deleteToken(models, TOKEN_NAMES.LARGE);

      await page.waitForTimeout(1000);

      await models.studio.publishVersion("Delete large token");

      await page.goto(`/projects/${dep2ProjectId}`, {
        waitUntil: "domcontentloaded",
      });
      await models.studio.waitForFrameToLoad();
      await page.keyboard.press("Escape");
      await updateToken(
        models,
        "Color",
        TOKEN_NAMES.SECONDARY,
        TEST_COLORS.SECONDARY_NEW
      );

      await page.waitForTimeout(1000);

      await models.studio.publishVersion("Update secondary token");

      await page.goto(`/projects/${mainProjectId}`, {
        waitUntil: "domcontentloaded",
      });
      await models.studio.waitForFrameToLoad();

      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      await models.studio.switchArena("New Page");
      await models.studio.waitForFrameToLoad();

      await updateAllImports(models);

      await page.waitForTimeout(2000);

      await switchToStyleTokensTab(models);
      await expandAllTokensPanel(models);
      await page.waitForTimeout(500);

      await assertTokenIndicator(
        models,
        TOKEN_NAMES.LARGE,
        "local-varianted",
        "Base",
        "Website"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.PRIMARY,
        "override-none",
        "Base",
        "Website"
      );
      await assertTokenIndicator(
        models,
        TOKEN_NAMES.SECONDARY,
        "override-base",
        "Base",
        "Website"
      );

      await removeAllDependencies(models);
      await apiClient.removeProjectAfterTest(
        mainProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
      await apiClient.removeProjectAfterTest(
        dep2ProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
      await apiClient.removeProjectAfterTest(
        dep1ProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    });
  });

  test("Should work when a direct dep is also an indirect dep (A <- B, A <- C, B <- C)", async ({
    page,
    models,
    apiClient,
  }) => {
    const cDepProjectId = await apiClient.setupNewProject({ name: "C Dep" });
    await page.goto(`/projects/${cDepProjectId}`);
    await models.studio.waitForFrameToLoad();

    await createToken(
      models,
      "Color",
      TOKEN_NAMES.SECONDARY,
      TEST_COLORS.SECONDARY
    );
    await models.studio.publishVersion("New tokens");

    const bDepProjectId = await apiClient.setupNewProject({ name: "B Dep" });
    await page.goto(`/projects/${bDepProjectId}`);
    await models.studio.waitForFrameToLoad();

    await importProject(models, cDepProjectId);
    await switchToStyleTokensTab(models);
    await assertTokenIndicator(
      models,
      TOKEN_NAMES.SECONDARY,
      "override-none",
      "Base"
    );

    await updateToken(
      models,
      "Color",
      TOKEN_NAMES.SECONDARY,
      TEST_COLORS.SECONDARY_OVERRIDE,
      {
        override: true,
      }
    );
    await assertTokenIndicator(
      models,
      TOKEN_NAMES.SECONDARY,
      "override-base",
      "Base"
    );

    await models.studio.leftPanel.addComponent("Comp B");
    await models.studio.waitForFrameToLoad();

    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(500);
    const selectedElt = await models.studio.getSelectedElt();
    await selectedElt.dblclick({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.type(TEST_TEXTS.FROM_B_COMP);
    await page.keyboard.press("Escape");
    await chooseColor(models, { tokenName: TOKEN_NAMES.SECONDARY });

    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(500);
    const selectedElt2 = await models.studio.getSelectedElt();
    await selectedElt2.dblclick({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.type(TEST_TEXTS.SLOT_FROM_B_COMP);
    await page.keyboard.press("Escape");
    await chooseColor(models, { tokenName: TOKEN_NAMES.SECONDARY });
    await models.studio.convertToSlot();
    await page.waitForTimeout(1000);

    await models.studio.publishVersion("New components using imported tokens");

    const aProjectId = await apiClient.setupNewProject({ name: "A Project" });
    await page.goto(`/projects/${aProjectId}`);
    await models.studio.waitForFrameToLoad();

    await importProject(models, bDepProjectId);
    await importProject(models, cDepProjectId);

    await models.studio.createNewPage("A Page");
    await models.studio.waitForFrameToLoad();
    const aFrame = models.studio.componentFrame;

    await createGlobalVariantGroup(models, "Platform", "Website");
    await models.studio.leftPanel.insertNode("Comp B");
    await page.waitForTimeout(500);

    await assertTextStyling(
      TEST_TEXTS.FROM_B_COMP,
      TEST_COLORS.SECONDARY,
      TEST_FONT_SIZES.B_DEFAULT,
      aFrame
    );
    await assertTextStyling(
      TEST_TEXTS.SLOT_FROM_B_COMP,
      TEST_COLORS.SECONDARY,
      TEST_FONT_SIZES.B_DEFAULT,
      aFrame
    );

    await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
      await assertTextStyling(
        TEST_TEXTS.FROM_B_COMP,
        TEST_COLORS.SECONDARY,
        TEST_FONT_SIZES.B_DEFAULT,
        liveFrame
      );
      await assertTextStyling(
        TEST_TEXTS.SLOT_FROM_B_COMP,
        TEST_COLORS.SECONDARY,
        TEST_FONT_SIZES.B_DEFAULT,
        liveFrame
      );
    });

    await page.waitForTimeout(1000);

    await assertTokenIndicator(
      models,
      TOKEN_NAMES.SECONDARY,
      "override-none",
      "Base",
      "Website"
    );

    await updateToken(
      models,
      "Color",
      TOKEN_NAMES.SECONDARY,
      TEST_COLORS.SECONDARY_NEW,
      {
        override: true,
      }
    );

    await assertTextStyling(
      TEST_TEXTS.FROM_B_COMP,
      TEST_COLORS.SECONDARY_NEW,
      TEST_FONT_SIZES.B_DEFAULT,
      aFrame
    );
    await assertTokenIndicator(
      models,
      TOKEN_NAMES.SECONDARY,
      "override-base",
      "Base",
      "Website"
    );

    await apiClient.removeProjectAfterTest(
      aProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
    await apiClient.removeProjectAfterTest(
      bDepProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
    await apiClient.removeProjectAfterTest(
      cDepProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("Should work (A <- B <- C) - only root project (A) overrides are used", async ({
    page,
    models,
    apiClient,
  }) => {
    const cDepProjectId = await apiClient.setupNewProject({ name: "C Dep" });
    await page.goto(`/projects/${cDepProjectId}`);
    await models.studio.waitForFrameToLoad();

    await createToken(
      models,
      "Color",
      TOKEN_NAMES.SECONDARY,
      TEST_COLORS.SECONDARY
    );
    await models.studio.publishVersion("New tokens");

    const bDepProjectId = await apiClient.setupNewProject({ name: "B Dep" });
    await page.goto(`/projects/${bDepProjectId}`);
    await models.studio.waitForFrameToLoad();

    await createToken(
      models,
      "Color",
      TOKEN_NAMES.PRIMARY,
      TEST_COLORS.PRIMARY
    );
    await importProject(models, cDepProjectId);

    await updateToken(
      models,
      "Color",
      TOKEN_NAMES.SECONDARY,
      TEST_COLORS.SECONDARY_OVERRIDE,
      {
        override: true,
      }
    );

    await models.studio.leftPanel.addComponent("Dep Comp");
    await models.studio.waitForFrameToLoad();
    const bFrame = models.studio.componentFrame;

    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(500);
    const selectedElt = await models.studio.getSelectedElt();
    await selectedElt.dblclick({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.type("Primary Text");
    await page.keyboard.press("Escape");
    await chooseColor(models, { tokenName: TOKEN_NAMES.PRIMARY });

    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(500);
    const selectedElt2 = await models.studio.getSelectedElt();
    await selectedElt2.dblclick({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.type("Secondary Text");
    await page.keyboard.press("Escape");
    await chooseColor(models, { tokenName: TOKEN_NAMES.SECONDARY });

    await assertTextStyling(
      TEST_TEXTS.PRIMARY_TEXT,
      TEST_COLORS.PRIMARY,
      undefined,
      bFrame
    );
    await assertTextStyling(
      TEST_TEXTS.SECONDARY_TEXT,
      TEST_COLORS.SECONDARY_OVERRIDE,
      undefined,
      bFrame
    );

    await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
      await assertTextStyling(
        TEST_TEXTS.PRIMARY_TEXT,
        TEST_COLORS.PRIMARY,
        undefined,
        liveFrame
      );
      await assertTextStyling(
        TEST_TEXTS.SECONDARY_TEXT,
        TEST_COLORS.SECONDARY_OVERRIDE,
        undefined,
        liveFrame
      );
    });

    await models.studio.publishVersion("New components with tokens");

    const aProjectId = await apiClient.setupNewProject({ name: "A Project" });
    await page.goto(`/projects/${aProjectId}`);
    await models.studio.waitForFrameToLoad();

    await importProject(models, bDepProjectId);

    await models.studio.createNewPage("A Page");
    await models.studio.waitForFrameToLoad();
    const aFrame = models.studio.componentFrame;

    await models.studio.leftPanel.insertNode("Dep Comp");
    await page.waitForTimeout(500);

    await assertTextStyling(
      TEST_TEXTS.PRIMARY_TEXT,
      TEST_COLORS.PRIMARY,
      undefined,
      aFrame
    );
    await assertTextStyling(
      TEST_TEXTS.SECONDARY_TEXT,
      TEST_COLORS.SECONDARY,
      undefined,
      aFrame
    );

    await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
      await assertTextStyling(
        TEST_TEXTS.PRIMARY_TEXT,
        TEST_COLORS.PRIMARY,
        undefined,
        liveFrame
      );
      await assertTextStyling(
        TEST_TEXTS.SECONDARY_TEXT,
        TEST_COLORS.SECONDARY,
        undefined,
        liveFrame
      );
    });

    await updateToken(
      models,
      "Color",
      TOKEN_NAMES.PRIMARY,
      TEST_COLORS.PRIMARY_OVERRIDE_BASE,
      {
        override: true,
      }
    );

    await assertTextStyling(
      TEST_TEXTS.PRIMARY_TEXT,
      TEST_COLORS.PRIMARY_OVERRIDE_BASE,
      undefined,
      aFrame
    );
    await assertTextStyling(
      TEST_TEXTS.SECONDARY_TEXT,
      TEST_COLORS.SECONDARY,
      undefined,
      aFrame
    );

    await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
      await assertTextStyling(
        TEST_TEXTS.PRIMARY_TEXT,
        TEST_COLORS.PRIMARY_OVERRIDE_BASE,
        undefined,
        liveFrame
      );
      await assertTextStyling(
        TEST_TEXTS.SECONDARY_TEXT,
        TEST_COLORS.SECONDARY,
        undefined,
        liveFrame
      );
    });

    await apiClient.removeProjectAfterTest(
      aProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
    await apiClient.removeProjectAfterTest(
      bDepProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
    await apiClient.removeProjectAfterTest(
      cDepProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("Should override registered imported tokens", async ({
    page,
    models,
    apiClient,
  }) => {
    const depProjectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
    });
    await page.goto(`/projects/${depProjectId}`);
    await models.studio.waitForFrameToLoad();
    await models.studio.publishVersion("New tokens");

    const mainProjectId = await apiClient.setupNewProject({
      name: "Main Project",
    });
    await page.goto(`/projects/${mainProjectId}`);
    await models.studio.waitForFrameToLoad();

    await importProject(models, depProjectId);

    await models.studio.createNewPage("Main Page");
    await models.studio.waitForFrameToLoad();
    const frame = models.studio.componentFrame;

    await models.studio.leftPanel.insertNode("Text");
    await page.waitForTimeout(500);
    const selectedElt = await models.studio.getSelectedElt();
    await selectedElt.dblclick({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.type(TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1);
    await page.keyboard.press("Escape");

    await chooseColor(models, { tokenName: TOKEN_NAMES.ANTD });

    await assertTextStyling(
      TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
      TEST_COLORS.ANTD,
      undefined,
      frame
    );

    await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.ANTD,
        undefined,
        liveFrame
      );
    });

    await updateToken(
      models,
      "Color",
      TOKEN_NAMES.ANTD,
      TEST_COLORS.ANTD_OVERRIDE,
      {
        override: true,
      }
    );

    await assertTextStyling(
      TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
      TEST_COLORS.ANTD_OVERRIDE,
      undefined,
      frame
    );

    await models.studio.withinLiveMode(async (liveFrame: FrameLocator) => {
      await assertTextStyling(
        TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
        TEST_COLORS.ANTD_OVERRIDE,
        undefined,
        liveFrame
      );
    });

    await apiClient.removeProjectAfterTest(
      mainProjectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });
});

async function assertTextStyling(
  text: string,
  color: string,
  fontSize: string | undefined,
  frame: FrameLocator | undefined
) {
  const element = frame ? frame.getByText(text).first() : undefined;

  if (element) {
    await expect(element).toHaveCSS("color", hexToRgbString(color));
    if (fontSize) {
      await expect(element).toHaveCSS("font-size", fontSize);
    }
  }
}
