import { Page, expect } from "@playwright/test";
import { StudioModel } from "../models/studio-model";

export async function importProject(
  page: Page,
  studio: StudioModel,
  projectId: string
) {
  const isImportedPanelVisible = await studio.leftPanel.frame
    .getByText("Imported projects")
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (!isImportedPanelVisible) {
    const moreTab = studio.frame.locator('[data-test-tabkey="more"]');
    await moreTab.waitFor({ state: "visible", timeout: 5000 });
    await moreTab.hover();
    await page.waitForTimeout(300);
    await studio.leftPanel.switchToImportsTab();
  }
  await page.waitForTimeout(500);

  const selector = ".SidebarSectionListItem";
  const countBefore = await studio.frame.locator(selector).count();

  const importButton = studio.frame.locator('[data-test-id="import-btn"]');
  await importButton.waitFor({ state: "visible", timeout: 5000 });
  await importButton.click();

  const promptInput = studio.frame.locator('[data-test-id="prompt"]');
  await promptInput.waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(200);

  await promptInput.fill(projectId);
  await page.waitForTimeout(300);

  await page.keyboard.press("Enter");

  await studio.frame
    .locator(selector)
    .nth(countBefore)
    .waitFor({ state: "visible", timeout: 15000 });

  await page.waitForTimeout(500);
}

export async function updateAllImports(page: Page, studio: StudioModel) {
  await studio.leftPanel.switchToImportsTab();

  const checkButton = studio.frame.locator(
    '[data-test-id="check-for-updates-btn"]'
  );
  await checkButton.waitFor({ state: "visible", timeout: 5000 });
  await checkButton.click();

  const updateButtons = studio.frame.locator(
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
    await page.waitForTimeout(200);

    await firstButton.click();

    const modalContent = studio.frame.locator(".ant-modal-content");
    await modalContent.waitFor({ state: "visible", timeout: 5000 });

    const submitButton = modalContent.locator('button[type="submit"]');
    await submitButton.waitFor({ state: "visible", timeout: 5000 });
    await submitButton.click();

    await modalContent.waitFor({ state: "hidden", timeout: 10000 });
    await page.waitForTimeout(500);

    const newCount = await updateButtons.count();
    if (newCount >= updatesRemaining) {
      break;
    }
    updatesRemaining = newCount;
  }

  await expect(updateButtons.first()).not.toBeVisible({ timeout: 5000 });
}

export async function removeAllDependencies(page: Page, studio: StudioModel) {
  await studio.leftPanel.switchToTreeTab();
  await studio.leftPanel.switchToImportsTab();

  await page.waitForTimeout(500);

  const listItems = studio.frame.locator(`.SidebarSectionListItem`);

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

    await page.waitForTimeout(200);

    await firstItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

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
        await page.waitForTimeout(500);
      }
    }

    if (!clickSucceeded) {
      throw new Error(
        "Failed to right-click on dependency item after 3 attempts"
      );
    }

    const removeMenuItem = studio.frame.getByText("Remove imported project");
    await removeMenuItem.waitFor({ state: "visible", timeout: 5000 });
    await removeMenuItem.click();

    const modalContent = studio.frame.locator(".ant-modal-content");
    await modalContent.waitFor({ state: "visible", timeout: 5000 });

    const submitButton = modalContent.locator('button[type="submit"]');
    await submitButton.waitFor({ state: "visible", timeout: 5000 });
    await submitButton.click();

    await modalContent.waitFor({ state: "hidden", timeout: 5000 });

    await page.waitForTimeout(500);

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
