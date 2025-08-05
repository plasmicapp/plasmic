import { FrameLocator, Locator, Page } from "playwright/test";
import { BaseElement } from "../abstracts/base-element";

export class TextInteractionsArena extends BaseElement {
  constructor(
    page: Page,
    readonly contentFrame: FrameLocator,
    readonly setToButton: Locator,
    readonly clearButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<TextInteractionsArena> {
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
    const clearButton = contentFrame.locator(`text=Clear variable`);
    const instance = new TextInteractionsArena(
      page,
      contentFrame,
      setToButton,
      clearButton
    );
    return instance;
  }
}
