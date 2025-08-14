import { FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "../BaseModel";

export class ToggleVariantInteractionsArena extends BaseModel {
  constructor(
    page: Page,
    readonly contentFrame: FrameLocator,
    readonly toggleButton: Locator,
    readonly activateVariantButton: Locator,
    readonly deactivateVariantButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<ToggleVariantInteractionsArena> {
    const contentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const toggleButton = contentFrame.getByText("toggle");
    const activateVariantButton = contentFrame.getByText("activate variant", {
      exact: true,
    });
    const deactivateVariantButton = contentFrame.getByText(
      "deactivate variant",
      { exact: true }
    );
    const instance = new ToggleVariantInteractionsArena(
      page,
      contentFrame,
      toggleButton,
      activateVariantButton,
      deactivateVariantButton
    );
    return instance;
  }
}
