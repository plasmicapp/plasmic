import { FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "../BaseModel";

export class BooleanInteractionsArena extends BaseModel {
  constructor(
    page: Page,
    readonly contentFrame: FrameLocator,
    readonly setToTrueButton: Locator,
    readonly setToFalseButton: Locator,
    readonly toggleButton: Locator,
    readonly clearButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<BooleanInteractionsArena> {
    const contentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const setToTrueButton = contentFrame
      .locator("span", { hasText: "Set to true" })
      .first();
    const setToFalseButton = contentFrame
      .locator("span", { hasText: "Set to false" })
      .first();
    const toggleButton = contentFrame
      .locator("span", { hasText: "Toggle" })
      .first();
    const clearButton = contentFrame.locator(`text=Clear variable`);
    const instance = new BooleanInteractionsArena(
      page,
      contentFrame,
      setToTrueButton,
      setToFalseButton,
      toggleButton,
      clearButton
    );
    return instance;
  }
}
