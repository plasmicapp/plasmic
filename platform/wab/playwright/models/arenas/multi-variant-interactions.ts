import { FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "../BaseModel";

export class MultiVariantInteractionsArena extends BaseModel {
  constructor(
    page: Page,
    readonly contentFrame: FrameLocator,
    readonly newValueButtons: Locator,
    readonly multiToggleButtons: Locator,
    readonly multiActivateButtons: Locator,
    readonly multiDeactivateButtons: Locator,
    readonly clearValueButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<MultiVariantInteractionsArena> {
    const contentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const newValueButtons = contentFrame.locator('[data-test-id="newValue"]');
    const multiToggleButtons = contentFrame.locator(
      '[data-test-id="multiToggle"]'
    );
    const multiActivateButtons = contentFrame.locator(
      '[data-test-id="multiActivate"]'
    );
    const multiDeactivateButtons = contentFrame.locator(
      '[data-test-id="multiDeactivate"]'
    );
    const clearValueButton = contentFrame
      .locator('[data-test-id="clearValue"]')
      .getByText("Clear variant");
    const instance = new MultiVariantInteractionsArena(
      page,
      contentFrame,
      newValueButtons,
      multiToggleButtons,
      multiActivateButtons,
      multiDeactivateButtons,
      clearValueButton
    );
    return instance;
  }
}
