import { FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "../BaseModel";

export class NumberInteractionsArena extends BaseModel {
  constructor(
    page: Page,
    readonly contentFrame: FrameLocator,
    readonly setToButton: Locator,
    readonly incrementButton: Locator,
    readonly decrementButton: Locator,
    readonly clearButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<NumberInteractionsArena> {
    const contentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const setToButton = contentFrame
      .locator("span", { hasText: "Set to" })
      .first();
    const incrementButton = contentFrame
      .locator("span", { hasText: "Increment" })
      .first();
    const decrementButton = contentFrame
      .locator("span", { hasText: "Decrement" })
      .first();
    const clearButton = contentFrame.locator(`text=Clear variable`);
    const instance = new NumberInteractionsArena(
      page,
      contentFrame,
      setToButton,
      incrementButton,
      decrementButton,
      clearButton
    );
    return instance;
  }
}
